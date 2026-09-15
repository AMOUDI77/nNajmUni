# NajmUni CRM implementation

CRM extends the existing Flask application and SQLAlchemy engine. `crm.register_crm` registers isolated blueprints; it performs no database writes or migrations. The original six NajmUni tables and API routes remain in place. Production remains PostgreSQL.

The additive Alembic revision `0002_crm_v1` creates staff, contact identity, conversation, message, attribution, automation, AI, knowledge and durable job tables. The revision uses the frozen `crm/schema_v1.py` contract. Future schema changes must use a new revision rather than modify this contract. Its downgrade removes CRM tables only; it is destructive to CRM data and is not a routine production rollback.

Contacts represent people; Instagram identities are unique within their connected account. Contact links to existing leads/students are explicit, unique and audited. They do not merge names or overwrite existing linked records. Creating a lead from a contact copies the selected contact profile once. Touchpoints preserve source history separately from legacy `lead.source`.

Signed webhook envelopes are persisted with a durable ingest job in one transaction. The worker normalizes provider events and serializes identity creation per connected Instagram account. Message identity is deduplicated independently of envelope identity, covering repackaged retries. Unsupported events do not become student messages. Public comments do not open the DM messaging window.

`python -m jobs.worker` polls the database queue. PostgreSQL workers claim jobs using `FOR UPDATE SKIP LOCKED`; failures retry five times with backoff. A five-minute lease allows recovery after a worker crash. Logs contain job IDs/kinds rather than exception text or payloads.

Outbound messages pass through one policy/queue path. A durable SENDING fence is committed before the provider call. Ambiguous delivery becomes UNCERTAIN and never automatically resends. The provider call holds a bounded conversation lock so a completed human takeover suppresses later automation sends. Staff must reconcile uncertain delivery with Instagram before creating a new send. Provider rejection is a visible FAILED message.

The React CRM shell lives under `client/src/crm` and uses `/crm/*` routes in the existing application. Its typed API client centralizes cookie authentication, CSRF and errors. The inbox has server-paginated conversations/messages, per-conversation session drafts, contact context, labels, private notes, assignment and takeover. Mobile collapses to list/thread navigation and a contact drawer. Text uses React escaping and `dir="auto"` for mixed Arabic/English content.

The automation builder, contacts, knowledge, analytics and settings screens use their corresponding Flask blueprints. Anthropic suggestions run as durable jobs and remain drafts. PostgreSQL GIN full-text indexes cover contact/identity/message search with a simple multilingual dictionary. SQLite search is retained only for small local tests.

CRM staff share one NajmUni workspace; this is not a multi-tenant service. Counsellor assignment is workflow ownership, not a security boundary restricting other authorized staff from reading the conversation. Live Meta setup, production rollout and a worker service require the reviewed steps in `CRM_PRODUCTION_RUNBOOK.md`.
