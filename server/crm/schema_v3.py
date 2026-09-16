"""Inbox operations added after the saved-replies foundation."""

import sqlalchemy as sa

from .schema_v1 import col, ref, table
from .schema_v2 import metadata


conversation_events = table(
    "conversation_events",
    ref("conversation_id", "conversations.id", False),
    ref("actor_id", "staff_users.id"),
    col("event_type", sa.String(40), nullable=False),
    col("text", nullable=False),
    col("details", sa.JSON, nullable=False, default=dict),
)

conversation_reminders = table(
    "conversation_reminders",
    ref("conversation_id", "conversations.id", False),
    ref("created_by", "staff_users.id", False),
    col("remind_at", sa.DateTime, nullable=False),
    col("status", sa.String(20), nullable=False, server_default="OPEN"),
    col("completed_at", sa.DateTime),
    sa.CheckConstraint("status IN ('OPEN','DONE','CANCELLED')"),
)

conversation_sources = table(
    "conversation_sources",
    ref("conversation_id", "conversations.id", False, unique=True),
    col("provider", sa.String(30), nullable=False),
    col("source_type", sa.String(40), nullable=False),
    col("media_id", sa.String(255)),
    col("media_type", sa.String(40)),
    col("thumbnail_url"),
    col("caption"),
    col("original_comment"),
    col("keyword"),
    col("automation_name"),
    col("occurred_at", sa.DateTime, nullable=False),
)

saved_reply_usage = table(
    "saved_reply_usage",
    ref("saved_reply_id", "saved_replies.id", False),
    ref("staff_id", "staff_users.id", False),
    ref("conversation_id", "conversations.id", False),
)

sa.Index(
    "ix_crm_conversation_events_conversation_created",
    conversation_events.c.conversation_id,
    conversation_events.c.created_at,
)
sa.Index(
    "ix_crm_reminders_status_time",
    conversation_reminders.c.status,
    conversation_reminders.c.remind_at,
)
sa.Index(
    "ix_crm_saved_reply_usage_staff_created",
    saved_reply_usage.c.staff_id,
    saved_reply_usage.c.created_at,
)
