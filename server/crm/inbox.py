"""Contextual Inbox operations: reminders, attribution and system events."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify
from sqlalchemy import select, update
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output
from .contacts import EDIT
from .schema_v1 import conversations, staff_users
from .schema_v3 import (
    conversation_events,
    conversation_reminders,
    conversation_sources,
)

api = Blueprint("crm_inbox_operations", __name__, url_prefix="/api/crm")


def add_event(conn, conversation_id, event_type, text, actor=None, **details):
    conn.execute(
        conversation_events.insert().values(
            conversation_id=conversation_id,
            actor_id=actor,
            event_type=event_type,
            text=text,
            details=details,
        )
    )


def get_conversation(conn, vid):
    row = conn.execute(
        select(conversations.c.id).where(conversations.c.id == vid)
    ).first()
    if not row:
        raise NotFound("Conversation not found")


@api.get("/conversations/<int:vid>/context")
@require_staff()
def context(vid):
    with engine().connect() as conn:
        get_conversation(conn, vid)
        source = conn.execute(
            select(conversation_sources).where(
                conversation_sources.c.conversation_id == vid
            )
        ).mappings().first()
        events = conn.execute(
            select(conversation_events)
            .where(conversation_events.c.conversation_id == vid)
            .order_by(conversation_events.c.created_at, conversation_events.c.id)
            .limit(200)
        ).mappings().all()
        reminders = conn.execute(
            select(conversation_reminders, staff_users.c.full_name.label("creator_name"))
            .join(staff_users, staff_users.c.id == conversation_reminders.c.created_by)
            .where(conversation_reminders.c.conversation_id == vid)
            .order_by(conversation_reminders.c.id.desc())
            .limit(20)
        ).mappings().all()
    return output({"source": source, "events": events, "reminders": reminders})


def parse_reminder(data):
    preset = data.get("preset")
    current = now()
    if preset == "later_today":
        return current.replace(hour=17, minute=0, second=0, microsecond=0) if current.hour < 17 else current + timedelta(hours=3)
    if preset == "tomorrow":
        return (current + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    if preset == "three_days":
        return (current + timedelta(days=3)).replace(hour=9, minute=0, second=0, microsecond=0)
    if preset == "next_week":
        return (current + timedelta(days=7)).replace(hour=9, minute=0, second=0, microsecond=0)
    value = data.get("remind_at")
    if not isinstance(value, str):
        raise BadRequest("Choose a reminder time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError:
        raise BadRequest("Invalid reminder time")
    if parsed <= current:
        raise BadRequest("Reminder must be in the future")
    return parsed


@api.post("/conversations/<int:vid>/reminders")
@require_staff(*EDIT)
def create_reminder(vid):
    remind_at = parse_reminder(body())
    with engine().begin() as conn:
        get_conversation(conn, vid)
        conn.execute(
            update(conversation_reminders)
            .where(
                conversation_reminders.c.conversation_id == vid,
                conversation_reminders.c.status == "OPEN",
            )
            .values(status="CANCELLED", completed_at=now())
        )
        rid = conn.execute(
            conversation_reminders.insert().values(
                conversation_id=vid,
                created_by=g.staff["id"],
                remind_at=remind_at,
            )
        ).inserted_primary_key[0]
        add_event(
            conn,
            vid,
            "reminder_set",
            f"Reminder set for {remind_at.strftime('%d %b %Y, %H:%M')}",
            g.staff["id"],
            reminder_id=rid,
        )
        audit(conn, g.staff["id"], "reminder.created", "conversation", vid, reminder_id=rid)
    return output({"id": rid, "remind_at": remind_at}, 201)


@api.patch("/conversations/<int:vid>/reminders/<int:rid>")
@require_staff(*EDIT)
def update_reminder(vid, rid):
    status = body().get("status")
    if status not in ("DONE", "CANCELLED"):
        raise BadRequest("Invalid reminder status")
    with engine().begin() as conn:
        changed = conn.execute(
            update(conversation_reminders)
            .where(
                conversation_reminders.c.id == rid,
                conversation_reminders.c.conversation_id == vid,
                conversation_reminders.c.status == "OPEN",
            )
            .values(status=status, completed_at=now())
        )
        if not changed.rowcount:
            raise NotFound("Open reminder not found")
        add_event(conn, vid, "reminder_completed", "Reminder completed", g.staff["id"])
        audit(conn, g.staff["id"], "reminder.updated", "conversation", vid, reminder_id=rid, status=status)
    return jsonify(ok=True)
