"""Composer additions after the frozen inbox-operations schema."""

import sqlalchemy as sa

from .schema_v3 import metadata

saved_replies = metadata.tables["saved_replies"]
if "pinned" not in saved_replies.c:
    saved_replies.append_column(
        sa.Column(
            "pinned",
            sa.Boolean,
            nullable=False,
            server_default=sa.false(),
        )
    )
