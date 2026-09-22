"""Add durable Instagram conversation identity and worker heartbeat.

Revision ID: 0006_instagram_sync_safety
Revises: 0005_composer_polish
"""

import sqlalchemy as sa
from alembic import op


revision = "0006_instagram_sync_safety"
down_revision = "0005_composer_polish"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "conversations",
        sa.Column("provider_conversation_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "uq_crm_conversations_provider_conversation_id",
        "conversations",
        ["provider_conversation_id"],
        unique=True,
    )
    op.add_column(
        "background_jobs", sa.Column("heartbeat_at", sa.DateTime(), nullable=True)
    )


def downgrade():
    op.drop_column("background_jobs", "heartbeat_at")
    op.drop_index(
        "uq_crm_conversations_provider_conversation_id",
        table_name="conversations",
    )
    op.drop_column("conversations", "provider_conversation_id")
