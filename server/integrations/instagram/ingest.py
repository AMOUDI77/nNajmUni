from crm.common import now
from crm.schema_v1 import (
    campaigns,
    contacts,
    conversations,
    identities,
    messages,
    social_accounts,
    touchpoints,
    webhook_events,
)
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
        conn.execute(
            update(webhook_events)
            .where(webhook_events.c.id == event_id)
            .values(status="SUCCEEDED")
        )
