"""Schema additions after the frozen CRM V1 foundation."""

import sqlalchemy as sa

from .schema_v1 import col, ref, table
from .schema_v1 import metadata as metadata

saved_replies = table(
    "saved_replies",
    col("title", sa.String(100), nullable=False),
    col("shortcut", sa.String(32), nullable=False, unique=True),
    col("content", nullable=False),
    col("status", sa.String(20), nullable=False, server_default="ACTIVE"),
    ref("created_by", "staff_users.id", False),
    ref("updated_by", "staff_users.id", False),
    col("updated_at", sa.DateTime),
    sa.CheckConstraint("status IN ('ACTIVE','ARCHIVED')"),
)

sa.Index(
    "ix_crm_saved_replies_status_shortcut",
    saved_replies.c.status,
    saved_replies.c.shortcut,
)
