"""Add pinned saved replies for the Inbox composer.

Revision ID: 0005_composer_polish
Revises: 0004_inbox_operations
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_composer_polish"
down_revision = "0004_inbox_operations"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "saved_replies",
        sa.Column(
            "pinned",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        )
    )


def downgrade():
    op.drop_column("saved_replies", "pinned")
