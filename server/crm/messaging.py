"""Single outbound path for staff and automation; uncertain sends never auto-retry."""

from datetime import timedelta

from integrations.instagram.client import ProviderError, send_message
from jobs.queue import enqueue
from sqlalchemy import select, update
from werkzeug.exceptions import BadRequest

from .common import audit, now
from .schema_v1 import conversations, identities, messages, social_accounts


def policy_error(conversation, account, automated=False, comment=None):
    if account["status"] != "CONNECTED":
        return "Reconnect Instagram before replying"
    if automated and conversation["control"] in ("HUMAN", "OFF"):
        return "Conversation control has paused automation"
    if comment:
        if not comment["provider_timestamp"] or comment[
            "provider_timestamp"
        ] < now() - timedelta(days=7):
            return "The private reply window has expired"
    elif not conversation["last_inbound_at"] or conversation[
        "last_inbound_at"
    ] < now() - timedelta(hours=24):
        return "The messaging window is closed. Wait for the contact to message again"
    return None


def queue_message(conn, vid, text, key, actor=None, automated=False, comment_id=None):
    conv = (
        conn.execute(
            select(conversations).where(conversations.c.id == vid).with_for_update()
        )
        .mappings()
        .first()
    )
    if not conv:
        raise BadRequest("Conversation not found")
    previous = (
        conn.execute(select(messages).where(messages.c.dedupe_key == key))
        .mappings()
        .first()
    )
    if previous:
        if previous["conversation_id"] != vid or previous["text"] != text:
            raise BadRequest(
                "This send identifier was already used for a different message"
            )
        return previous["id"]
    identity = (
        conn.execute(select(identities).where(identities.c.id == conv["identity_id"]))
        .mappings()
        .one()
    )
    account = (
        conn.execute(
            select(social_accounts).where(
                social_accounts.c.id == identity["account_id"]
            )
        )
        .mappings()
        .one()
    )
    comment = None
    if comment_id:
        comment = (
            conn.execute(
                select(messages).where(
                    messages.c.conversation_id == vid,
                    messages.c.provider_message_id == comment_id,
                    messages.c.message_type == "comment",
                )
            )
            .mappings()
            .first()
        )
        if not comment:
            raise BadRequest("Comment not found")
    error = policy_error(conv, account, automated, comment)
    if error:
        raise BadRequest(error)
    mid = conn.execute(
        messages.insert().values(
            conversation_id=vid,
            dedupe_key=key,
            direction="OUTBOUND",
            sender_type="AUTOMATION" if automated else "STAFF",
            staff_id=actor,
            text=text,
            attachments=[],
            private_reply_comment_id=comment_id,
            status="QUEUED",
        )
    ).inserted_primary_key[0]
    enqueue(conn, "send_message", f"send:{mid}", {"message_id": mid})
    audit(conn, actor, "message.queued", "conversation", vid, message_id=mid)
    return mid


def deliver(engine, mid):
    with engine.begin() as conn:
        msg = (
            conn.execute(select(messages).where(messages.c.id == mid).with_for_update())
            .mappings()
            .one()
        )
        if msg["status"] == "SENDING":
            conn.execute(
                update(messages)
                .where(messages.c.id == mid)
                .values(
                    status="UNCERTAIN",
                    safe_error="Worker interrupted during delivery. Check Instagram before sending again",
                )
            )
            return
        if msg["status"] != "QUEUED":
            return
        conn.execute(
            update(messages).where(messages.c.id == mid).values(status="SENDING")
        )
    # Hold conversation lock through the bounded provider send. A completed human
    # takeover cannot race a later automatic send. Other conversations can proceed.
    with engine.begin() as conn:
        msg = (
            conn.execute(select(messages).where(messages.c.id == mid)).mappings().one()
        )
        conv = (
            conn.execute(
                select(conversations)
                .where(conversations.c.id == msg["conversation_id"])
                .with_for_update()
            )
            .mappings()
            .one()
        )
        msg = (
            conn.execute(select(messages).where(messages.c.id == mid).with_for_update())
            .mappings()
            .one()
        )
        if msg["status"] != "SENDING":
            return
        identity = (
            conn.execute(
                select(identities).where(identities.c.id == conv["identity_id"])
            )
            .mappings()
            .one()
        )
        account = (
            conn.execute(
                select(social_accounts).where(
                    social_accounts.c.id == identity["account_id"]
                )
            )
            .mappings()
            .one()
        )
        comment = None
        if msg["private_reply_comment_id"]:
            comment = (
                conn.execute(
                    select(messages).where(
                        messages.c.conversation_id == conv["id"],
                        messages.c.provider_message_id
                        == msg["private_reply_comment_id"],
                        messages.c.message_type == "comment",
                    )
                )
                .mappings()
                .first()
            )
        error = policy_error(conv, account, msg["sender_type"] == "AUTOMATION", comment)
        if error:
            conn.execute(
                update(messages)
                .where(messages.c.id == mid)
                .values(status="CANCELLED", safe_error=error)
            )
            return
        try:
            provider_id = send_message(
                account,
                identity["provider_user_id"],
                msg["text"],
                msg["private_reply_comment_id"],
            )
        except ProviderError as exc:
            conn.execute(
                update(messages)
                .where(messages.c.id == mid)
                .values(
                    status="UNCERTAIN" if exc.uncertain else "FAILED",
                    safe_error=str(exc),
                )
            )
            return
        conn.execute(
            update(messages)
            .where(messages.c.id == mid)
            .values(
                status="SENT",
                provider_message_id=provider_id,
                provider_timestamp=now(),
                safe_error=None,
            )
        )
        values = {"last_message_at": now(), "preview": msg["text"][:200]}
        if not conv["first_response_at"]:
            values["first_response_at"] = now()
        conn.execute(
            update(conversations)
            .where(conversations.c.id == conv["id"])
            .values(**values)
        )
