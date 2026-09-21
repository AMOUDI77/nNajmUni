"""Add simple staff-managed saved replies."""

import sqlalchemy as sa
from alembic import op

# Frozen snapshot: later runtime columns must not alter fresh 0003 upgrades.
metadata = sa.MetaData()
sa.Table("staff_users", metadata, sa.Column("id", sa.Integer, primary_key=True))
saved_replies = sa.Table(
    "saved_replies",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("title", sa.String(100), nullable=False),
    sa.Column("shortcut", sa.String(32), nullable=False, unique=True),
    sa.Column("content", sa.Text, nullable=False),
    sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
    sa.Column(
        "created_by",
        sa.Integer,
        sa.ForeignKey("staff_users.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    sa.Column(
        "updated_by",
        sa.Integer,
        sa.ForeignKey("staff_users.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    sa.Column("updated_at", sa.DateTime),
    sa.Column(
        "created_at",
        sa.DateTime,
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    ),
    sa.CheckConstraint("status IN ('ACTIVE','ARCHIVED')"),
)

revision = "0003_saved_replies"
down_revision = "0002_crm_v1"
branch_labels = None
depends_on = None


def upgrade():
    saved_replies.create(op.get_bind(), checkfirst=False)


def downgrade():
    saved_replies.drop(op.get_bind(), checkfirst=False)
