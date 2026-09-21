"""Add reminders, source attribution, system events and saved-reply recents."""

from alembic import op

from crm.schema_v3 import (
    conversation_events,
    conversation_reminders,
    conversation_sources,
    saved_reply_usage,
)

revision = "0004_inbox_operations"
down_revision = "0003_saved_replies"
branch_labels = None
depends_on = None

TABLES = [
    conversation_events,
    conversation_reminders,
    conversation_sources,
    saved_reply_usage,
]


def upgrade():
    for table in TABLES:
        table.create(op.get_bind(), checkfirst=False)


def downgrade():
    for table in reversed(TABLES):
        table.drop(op.get_bind(), checkfirst=False)
