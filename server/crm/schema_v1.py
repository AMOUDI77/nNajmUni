"""Frozen CRM V1 schema contract for Alembic revision 0002. Do not mutate later."""

import sqlalchemy as sa
from db.schema import metadata as legacy_metadata

metadata = sa.MetaData()
for legacy in legacy_metadata.sorted_tables:
    legacy.to_metadata(metadata)
legacy_names = set(metadata.tables)


def table(name, *columns, **kw):
    return sa.Table(
        name,
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        *columns,
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        **kw,
    )


def col(name, kind=sa.Text, **kw):
    return sa.Column(name, kind, **kw)


def ref(name, target, nullable=True, **kw):
    return sa.Column(
        name,
        sa.Integer,
        sa.ForeignKey(target, ondelete="SET NULL" if nullable else "RESTRICT"),
        nullable=nullable,
        **kw,
    )


staff_users = table(
    "staff_users",
    col("full_name", nullable=False),
    col("email", sa.String(254), nullable=False, unique=True),
    col("password_hash", nullable=False),
    col("role", sa.String(20), nullable=False),
    col("status", sa.String(20), nullable=False, server_default="ACTIVE"),
    col("avatar_url"),
    col("last_login_at", sa.DateTime),
    col("updated_at", sa.DateTime),
    sa.CheckConstraint("role IN ('OWNER','ADMIN','COUNSELOR','VIEWER')"),
    sa.CheckConstraint("status IN ('ACTIVE','INACTIVE')"),
)
staff_sessions = table(
    "staff_sessions",
    ref("user_id", "staff_users.id", False),
    col("token_hash", sa.String(64), nullable=False, unique=True),
    col("csrf_hash", sa.String(64), nullable=False),
    col("expires_at", sa.DateTime, nullable=False),
    col("revoked_at", sa.DateTime),
)
auth_limits = sa.Table(
    "crm_auth_limits",
    metadata,
    col("key", sa.String(64), primary_key=True),
    col("attempts", sa.Integer, nullable=False),
    col("window_start", sa.DateTime, nullable=False),
)
audit_events = table(
    "audit_events",
    ref("actor_id", "staff_users.id"),
    col("action", sa.String(80), nullable=False),
    col("entity_type", sa.String(40)),
    col("entity_id", sa.Integer),
    col("details", sa.JSON, nullable=False, default=dict),
)
social_accounts = table(
    "social_accounts",
    col("provider", sa.String(30), nullable=False),
    col("provider_account_id", sa.String(128), nullable=False),
    col("username"),
    col("encrypted_token"),
    col("token_expires_at", sa.DateTime),
    col("status", sa.String(30), nullable=False, server_default="CONNECTED"),
    col("last_webhook_at", sa.DateTime),
    sa.UniqueConstraint("provider", "provider_account_id"),
)
oauth_states = table(
    "crm_oauth_states",
    col("state_hash", sa.String(64), unique=True, nullable=False),
    ref("user_id", "staff_users.id", False),
    ref("session_id", "staff_sessions.id", False),
    col("expires_at", sa.DateTime, nullable=False),
    col("used_at", sa.DateTime),
)
contacts = table(
    "contacts",
    col("display_name", nullable=False),
    *[
        col(n)
        for n in (
            "preferred_language",
            "nationality",
            "country",
            "email",
            "phone",
            "degree_level",
            "program_interests",
            "target_intake",
            "budget_currency",
            "english_status",
            "university_interests",
            "main_concerns",
        )
    ],
    col("budget_amount", sa.Numeric(14, 2)),
    col("stage", sa.String(24), nullable=False, server_default="NEW"),
    ref("lead_id", "leads.id", unique=True),
    ref("student_id", "students.id", unique=True),
    ref("assigned_to", "staff_users.id"),
    col("updated_at", sa.DateTime),
    sa.CheckConstraint(
        "stage IN ('NEW','CONTACTED','QUALIFIED','COUNSELING','DOCUMENTS','APPLICATION','OFFER','VISA','ENROLLED','LOST')"
    ),
)
identities = table(
    "contact_channel_identities",
    ref("contact_id", "contacts.id", False),
    ref("account_id", "social_accounts.id", False),
    col("provider_user_id", sa.String(128), nullable=False),
    col("username"),
    sa.UniqueConstraint("account_id", "provider_user_id"),
)
conversations = table(
    "conversations",
    ref("contact_id", "contacts.id", False),
    ref("identity_id", "contact_channel_identities.id", False, unique=True),
    ref("assigned_to", "staff_users.id"),
    col("status", sa.String(20), nullable=False, server_default="OPEN"),
    col("control", sa.String(20), nullable=False, server_default="SUGGEST"),
    col("unread", sa.Boolean, nullable=False, server_default=sa.false()),
    col("last_message_at", sa.DateTime),
    col("last_inbound_at", sa.DateTime),
    col("first_response_at", sa.DateTime),
    col("preview"),
    sa.CheckConstraint("control IN ('HUMAN','SUGGEST','OFF')"),
    sa.CheckConstraint("status IN ('OPEN','CLOSED')"),
)
messages = table(
    "messages",
    ref("conversation_id", "conversations.id", False),
    col("provider_message_id", sa.String(255)),
    col("dedupe_key", sa.String(255), unique=True, nullable=False),
    col("direction", sa.String(20), nullable=False),
    col("sender_type", sa.String(20), nullable=False),
    ref("staff_id", "staff_users.id"),
    col("message_type", sa.String(24), nullable=False, server_default="text"),
    col("text", nullable=False, server_default=""),
    col("attachments", sa.JSON, nullable=False, default=list),
    col("reference_id"),
    col("private_reply_comment_id", sa.String(255), unique=True),
    col("status", sa.String(20), nullable=False),
    col("safe_error"),
    col("provider_timestamp", sa.DateTime),
    sa.CheckConstraint("direction IN ('INBOUND','OUTBOUND')"),
    sa.CheckConstraint(
        "status IN ('RECEIVED','QUEUED','SENDING','SENT','FAILED','UNCERTAIN','CANCELLED')"
    ),
)
labels = table(
    "labels",
    col("name", sa.String(60), unique=True, nullable=False),
    col("color", sa.String(7), nullable=False, server_default="#4F6BFF"),
    col("archived", sa.Boolean, nullable=False, server_default=sa.false()),
)
contact_labels = sa.Table(
    "contact_labels",
    metadata,
    ref("contact_id", "contacts.id", False, primary_key=True),
    ref("label_id", "labels.id", False, primary_key=True),
)
assignments = table(
    "conversation_assignments",
    ref("conversation_id", "conversations.id", False),
    ref("assigned_to", "staff_users.id"),
    ref("assigned_by", "staff_users.id"),
)
notes = table(
    "conversation_notes",
    ref("contact_id", "contacts.id", False),
    ref("conversation_id", "conversations.id"),
    ref("author_id", "staff_users.id", False),
    col("text", nullable=False),
    col("updated_at", sa.DateTime),
    col("deleted_at", sa.DateTime),
)
webhook_events = table(
    "webhook_events",
    col("event_key", sa.String(64), nullable=False, unique=True),
    col("payload", sa.JSON, nullable=False),
    col("status", sa.String(20), nullable=False, server_default="QUEUED"),
    col("safe_error"),
)
jobs = table(
    "background_jobs",
    col("kind", sa.String(40), nullable=False),
    col("dedupe_key", sa.String(255), nullable=False, unique=True),
    col("payload", sa.JSON, nullable=False),
    col("status", sa.String(20), nullable=False, server_default="QUEUED"),
    col("attempts", sa.Integer, nullable=False, server_default="0"),
    col(
        "next_attempt_at",
        sa.DateTime,
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    ),
    col("lease_token", sa.String(64)),
    col("started_at", sa.DateTime),
    col("completed_at", sa.DateTime),
    col("safe_error"),
)
rules = table(
    "automation_rules",
    col("name", nullable=False),
    col("status", sa.String(20), nullable=False, server_default="DRAFT"),
    col("version", sa.Integer, nullable=False, server_default="1"),
    col("trigger", sa.JSON, nullable=False),
    col("steps", sa.JSON, nullable=False),
    col("priority", sa.Integer, nullable=False, server_default="0"),
    col("cooldown_seconds", sa.Integer, nullable=False, server_default="3600"),
    ref("updated_by", "staff_users.id"),
    col("updated_at", sa.DateTime),
)
runs = table(
    "automation_runs",
    ref("rule_id", "automation_rules.id", False),
    ref("conversation_id", "conversations.id", False),
    col("event_key", sa.String(255), nullable=False),
    col("version", sa.Integer, nullable=False),
    col("status", sa.String(24), nullable=False),
    col("safe_error"),
    sa.UniqueConstraint("rule_id", "event_key"),
)
flow_sessions = table(
    "automation_sessions",
    ref("conversation_id", "conversations.id", False, unique=True),
    ref("run_id", "automation_runs.id", False),
    col("steps", sa.JSON, nullable=False),
    col("position", sa.Integer, nullable=False),
    col("waiting_field"),
    col("last_event_key"),
    col("status", sa.String(24), nullable=False),
    col("expires_at", sa.DateTime, nullable=False),
)
campaigns = table(
    "campaign_sources",
    ref("account_id", "social_accounts.id"),
    col("source_key", sa.String(255), nullable=False, unique=True),
    col("provider"),
    col("media_id"),
    col("media_type"),
    col("campaign_name"),
    col("caption_snapshot"),
    col("permalink"),
)
touchpoints = table(
    "contact_touchpoints",
    ref("contact_id", "contacts.id", False),
    ref("campaign_source_id", "campaign_sources.id"),
    col("event_type", sa.String(40), nullable=False),
    col("provider_event_id", sa.String(255), nullable=False, unique=True),
    col("keyword"),
    col("occurred_at", sa.DateTime, nullable=False),
)
knowledge = table(
    "knowledge_articles",
    col("title", nullable=False),
    col("category"),
    col("language"),
    col("content", nullable=False),
    col("status", sa.String(20), nullable=False, server_default="DRAFT"),
    ref("updated_by", "staff_users.id"),
    col("updated_at", sa.DateTime),
)
summaries = table(
    "ai_conversation_summaries",
    ref("conversation_id", "conversations.id", False),
    col("summary", nullable=False),
    ref("through_message_id", "messages.id", False),
)
memory = table(
    "ai_contact_memory",
    ref("contact_id", "contacts.id", False),
    col("field", sa.String(60), nullable=False),
    col("value", nullable=False),
    ref("source_message_id", "messages.id", False),
    col("confidence", sa.Float, nullable=False),
    col("verified", sa.Boolean, nullable=False, server_default=sa.false()),
    ref("verified_by", "staff_users.id"),
    sa.UniqueConstraint("contact_id", "field", "source_message_id"),
)
suggestions = table(
    "ai_suggestions",
    ref("conversation_id", "conversations.id", False),
    ref("requested_by", "staff_users.id", False),
    col("status", sa.String(30), nullable=False),
    col("text"),
    col("safe_error"),
    col("feedback"),
    col("evidence", sa.JSON),
    col("input_tokens", sa.Integer),
    col("output_tokens", sa.Integer),
)
settings = sa.Table(
    "crm_settings",
    metadata,
    col("key", sa.String(60), primary_key=True),
    col("value", sa.JSON, nullable=False),
)

# PostgreSQL full-text indexes avoid scanning every message on inbox searches.
# The simple dictionary preserves Arabic/English lexemes without stemming.
CONTACT_SEARCH = sa.func.to_tsvector(
    sa.literal_column("'simple'"),
    sa.func.coalesce(contacts.c.display_name, "")
    + " "
    + sa.func.coalesce(contacts.c.email, "")
    + " "
    + sa.func.coalesce(contacts.c.phone, ""),
)
IDENTITY_SEARCH = sa.func.to_tsvector(
    sa.literal_column("'simple'"), sa.func.coalesce(identities.c.username, "")
)
MESSAGE_SEARCH = sa.func.to_tsvector(sa.literal_column("'simple'"), messages.c.text)
for search_name, expression in [
    ("contacts", CONTACT_SEARCH),
    ("identities", IDENTITY_SEARCH),
    ("messages", MESSAGE_SEARCH),
]:
    sa.Index(
        "ix_crm_" + search_name + "_search", expression, postgresql_using="gin"
    ).ddl_if(dialect="postgresql")

CRM_TABLES = [t for t in metadata.sorted_tables if t.name not in legacy_names]
for name, columns in {
    "staff_sessions": [("expires_at",)],
    "audit_events": [("entity_type", "entity_id", "id")],
    "contacts": [("stage", "id"), ("assigned_to", "id"), ("email",), ("phone",)],
    "conversations": [
        ("last_message_at", "id"),
        ("assigned_to", "status", "id"),
        ("unread", "id"),
    ],
    "messages": [("conversation_id", "id"), ("provider_message_id",)],
    "background_jobs": [("status", "next_attempt_at", "id")],
    "contact_touchpoints": [("contact_id", "id"), ("campaign_source_id", "id")],
    "conversation_notes": [("contact_id", "id")],
    "automation_runs": [("conversation_id", "created_at")],
    "ai_contact_memory": [("contact_id", "id")],
    "ai_suggestions": [("conversation_id", "id")],
}.items():
    for cols in columns:
        sa.Index(
            "ix_crm_" + name + "_" + "_".join(cols),
            *[metadata.tables[name].c[c] for c in cols],
        )
