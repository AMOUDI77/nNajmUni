from crm.common import now
from crm.schema_v1 import (
    campaigns,
    contacts,
    conversations,
    identities,
    messages,
    rules,
    runs,
    social_accounts,
    touchpoints,
    webhook_events,
)
from crm.schema_v3 import conversation_sources
from sqlalchemy import select, update

from .normalizer import normalize


def process_event(engine, event_id):
    with engine.begin() as conn:
        envelope = (
            conn.execute(
                select(webhook_events)
                .where(webhook_events.c.id == event_id)
                .with_for_update()
            )
            .mappings()
            .one()
        )
        if envelope["status"] == "SUCCEEDED":
            return
        for event in normalize(envelope["payload"]):
            # Account lock serializes identity creation for concurrent first DMs.
            account = (
                conn.execute(
                    select(social_accounts)
                    .where(
                        social_accounts.c.provider == "instagram",
                        social_accounts.c.provider_account_id == event["account"],
                        social_accounts.c.status == "CONNECTED",
                    )
                    .with_for_update()
                )
                .mappings()
                .first()
            )
            if not account:
                continue
            key = f"instagram:{account['id']}:{event['kind']}:{event['id']}"
            if conn.execute(
                select(messages.c.id).where(messages.c.dedupe_key == key)
            ).first():
                continue
            identity = (
                conn.execute(
                    select(identities).where(
                        identities.c.account_id == account["id"],
                        identities.c.provider_user_id == event["sender"],
                    )
                )
                .mappings()
                .first()
            )
            if not identity:
                cid = conn.execute(
                    contacts.insert().values(
                        display_name=event.get("username") or "Instagram contact",
                        updated_at=now(),
                    )
                ).inserted_primary_key[0]
                iid = conn.execute(
                    identities.insert().values(
                        contact_id=cid,
                        account_id=account["id"],
                        provider_user_id=event["sender"],
                        username=event.get("username"),
                    )
                ).inserted_primary_key[0]
            else:
                cid, iid = identity["contact_id"], identity["id"]
            conv = (
                conn.execute(
                    select(conversations)
                    .where(conversations.c.identity_id == iid)
                    .with_for_update()
                )
                .mappings()
                .first()
            )
            vid = (
                conv["id"]
                if conv
                else conn.execute(
                    conversations.insert().values(contact_id=cid, identity_id=iid)
                ).inserted_primary_key[0]
            )
            conn.execute(
                messages.insert().values(
                    conversation_id=vid,
                    provider_message_id=event["id"],
                    dedupe_key=key,
                    direction="INBOUND",
                    sender_type="CONTACT",
                    message_type="comment" if event["kind"] == "COMMENT" else "text",
                    text=event["text"],
                    attachments=event["attachments"],
                    reference_id=event["reference"],
                    status="RECEIVED",
                    provider_timestamp=event["timestamp"],
                )
            )
            values = {"unread": True, "status": "OPEN"}
            if conv and conv["status"] == "CLOSED":
                from crm.inbox import add_event

                add_event(
                    conn,
                    vid,
                    "status_changed",
                    "New message received · Conversation moved Closed → Open",
                )
            if (
                not conv
                or not conv["last_message_at"]
                or event["timestamp"] >= conv["last_message_at"]
            ):
                values.update(
                    last_message_at=event["timestamp"], preview=event["text"][:200]
                )
            if event["kind"] != "COMMENT" and (
                not conv
                or not conv["last_inbound_at"]
                or event["timestamp"] > conv["last_inbound_at"]
            ):
                values["last_inbound_at"] = min(event["timestamp"], now())
            conn.execute(
                update(conversations).where(conversations.c.id == vid).values(**values)
            )
            existing_origin = conn.execute(
                select(conversation_sources).where(
                    conversation_sources.c.conversation_id == vid
                )
            ).mappings().first()
            origin_values = {
                "provider": "instagram",
                "source_type": (
                    "instagram_dm"
                    if event["kind"] != "COMMENT"
                    else (
                        "instagram_reel_comment"
                        if "reel" in (event.get("media_type") or "").lower()
                        else "instagram_post_comment"
                    )
                ),
                "media_id": event.get("media_id"),
                "media_type": event.get("media_type"),
                "thumbnail_url": event.get("thumbnail_url"),
                "caption": event.get("caption"),
                "original_comment": event["text"] if event["kind"] == "COMMENT" else None,
                "keyword": None,
                "occurred_at": event["timestamp"],
            }
            if not existing_origin:
                conn.execute(
                    conversation_sources.insert().values(
                        conversation_id=vid, **origin_values
                    )
                )
            elif event["kind"] == "COMMENT" and existing_origin["source_type"] == "instagram_dm":
                conn.execute(
                    update(conversation_sources)
                    .where(conversation_sources.c.id == existing_origin["id"])
                    .values(**origin_values)
                )
            source_key = f"instagram:{account['id']}:{event['media_id'] or 'dm'}"
            source = conn.execute(
                select(campaigns.c.id).where(campaigns.c.source_key == source_key)
            ).scalar_one_or_none()
            if not source:
                source = conn.execute(
                    campaigns.insert().values(
                        account_id=account["id"],
                        source_key=source_key,
                        provider="instagram",
                        media_id=event["media_id"],
                        campaign_name="Instagram "
                        + ("media" if event["media_id"] else "DM"),
                    )
                ).inserted_primary_key[0]
            conn.execute(
                touchpoints.insert().values(
                    contact_id=cid,
                    campaign_source_id=source,
                    event_type="instagram_" + event["kind"].lower(),
                    provider_event_id=key,
                    occurred_at=event["timestamp"],
                )
            )
            conn.execute(
                update(social_accounts)
                .where(social_accounts.c.id == account["id"])
                .values(last_webhook_at=now())
            )
            from crm.automations import handle_event

            handle_event(conn, vid, event, key)
            automation_run = conn.execute(
                select(runs.c.id, rules.c.name)
                .join(runs, runs.c.rule_id == rules.c.id)
                .where(runs.c.conversation_id == vid, runs.c.event_key == key)
                .order_by(runs.c.id.desc())
                .limit(1)
            ).first()
            if automation_run:
                keyword = conn.execute(
                    select(touchpoints.c.keyword)
                    .where(
                        touchpoints.c.contact_id == cid,
                        touchpoints.c.provider_event_id.like(
                            f"automation:{automation_run.id}:%"
                        ),
                    )
                    .order_by(touchpoints.c.id.desc())
                    .limit(1)
                ).scalar_one_or_none()
                conn.execute(
                    update(conversation_sources)
                    .where(conversation_sources.c.conversation_id == vid)
                    .values(automation_name=automation_run.name, keyword=keyword)
                )
        conn.execute(
            update(webhook_events)
            .where(webhook_events.c.id == event_id)
            .values(status="SUCCEEDED")
        )
