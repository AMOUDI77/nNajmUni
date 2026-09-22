"""Instagram synchronization safety additions."""

import sqlalchemy as sa

from .schema_v4 import metadata as previous_metadata


metadata = sa.MetaData()
for previous_table in previous_metadata.sorted_tables:
    previous_table.to_metadata(metadata)

conversations = metadata.tables["conversations"]
conversations.append_column(
    sa.Column("provider_conversation_id", sa.String(255), nullable=True)
)
sa.Index(
    "uq_crm_conversations_provider_conversation_id",
    conversations.c.provider_conversation_id,
    unique=True,
)
jobs = metadata.tables["background_jobs"]
jobs.append_column(sa.Column("heartbeat_at", sa.DateTime, nullable=True))
