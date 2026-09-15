# NajmUni system audit

Audited from repository source on 2026-09-15. This is a code and configuration audit, not a live Render/Meta/account audit. No application code, dependencies, or database data were changed.

This document records the **pre-PostgreSQL-foundation** architecture. The later foundation changes and migration procedure are documented in `docs/POSTGRES_MIGRATION_RUNBOOK.md`; the SQLite startup behavior described below is historical.

## Current architecture

NajmUni is a React 18 + TypeScript + Vite single-page application backed by one Flask application (`server/app.py`) and a local SQLite file. React Router owns public and private page navigation. In development, Vite serves port 5173 and proxies `/api` to Flask on port 5000. In the documented production configuration, a Vite build produces `client/dist`, Flask serves that build with an SPA fallback, and Gunicorn runs Flask. `VITE_API_URL` can instead direct a separately hosted frontend to the documented `https://api.najmuni.com` API. The repository does not prove the current live topology or Render settings.

The active backend is a single module: startup/schema/seed logic, SQL queries, public routes, admin routes, student routes, rate limiting, mail, and Claude integration all live in `server/app.py`. There is no service layer, queue, or background worker. Flask and React are suitable foundations for the proposed extension; the main blockers are persistence, identity/access controls, and webhook/job reliability, not framework choice.

## Repository map

| Path | Role |
| --- | --- |
| `client/src/main.tsx`, `App.tsx` | React entry, providers, route definitions, lazy-loaded pages |
| `client/src/pages/` | Home, catalog, admin dashboard, standalone student CRM, and other pages |
| `client/src/features/study-plan/` | Questionnaire, local draft, matching/estimate logic, result UI |
| `client/src/api.ts`, `config.ts` | Public API wrapper and `VITE_API_URL` URL builder |
| `client/src/data.ts` | Bundled catalog fallback/static data |
| `client/src/i18n.tsx` | English/Arabic preference in local storage |
| `server/app.py` | Active Flask API, SQLite schema/queries, authentication, mail, Claude |
| `server/requirements.txt` | Flask, Flask-CORS, Anthropic SDK, Gunicorn, dotenv |
| `server/src/`, `server/package.json` | Legacy Express/TypeScript/sql.js backend |
| `data/najmuni.db` | Ignored local SQLite file; source code defines expected schema |
| `package.json`, `client/vite.config.ts` | Development/build scripts and Vite proxy |
| `Procfile`, `README.md`, `.env.example` | Documented deployment and configuration |

Frontend routes in `App.tsx`: `/`, `/universities`, `/universities/:id`, `/institutes`, `/programs`, `/study-plan/*`, `/admin`, `/students` (`/student` redirects). The admin and students pages omit the public navbar/footer. The home page is eagerly imported; other pages are lazy-loaded. `PreferencesProvider` and `BrowserRouter` wrap the app. The study-plan draft lives in browser `localStorage`; its event tracking function is a no-op. Study-plan recommendations combine API catalog data with client-side rules and a demo result template; eligibility, intake, and price information is explicitly marked for verification.

## Frontend-to-Flask communication

`client/src/config.ts` strips trailing slashes from `VITE_API_URL` and prefixes paths. Empty value means same-origin requests. Vite proxies `/api` locally. `client/src/api.ts` uses browser `fetch` for public catalog GETs and lead POSTs. On catalog errors it silently falls back to bundled `client/src/data.ts`; this can show stale data or hide an outage. In development, `api.leads.submit` reports synthetic success if its request fails. The floating consultation form also treats a network failure as success. Reservations use direct `fetch` from `BookingSection` and `ConsultationFloat`.

The private pages implement their own `fetch` wrappers and send `X-Admin-Key`. There is no centralized typed API client, request retry layer, or server push. `ALLOWED_ORIGINS` configures Flask-CORS for `/api/*`; it is separate from the URL a Vite build targets. The Flask response CSP has `connect-src 'self'`, which may block a separately hosted browser frontend calling `api.najmuni.com`; actual deployed headers/topology should be checked before extending that topology.

## Database architecture and tables

`DB_PATH` defaults to `../data/najmuni.db` relative to the server; relative configured paths are resolved from `server/`. `get_db()` opens one `sqlite3` connection per Flask request context, uses `sqlite3.Row`, and teardown closes it. Mutations execute parameterized SQL and call `commit()`. `init_db()` runs at module import on every Flask/Gunicorn startup, creates tables/indexes, applies ad hoc column migrations, seeds universities/programs only if there are no universities, and **upserts every bundled institute on every startup**. That last behavior can overwrite admin edits to seeded institute records. There is no versioned migration tool, rollback procedure, connection pool, `PRAGMA foreign_keys=ON`, declared foreign key, or unique identity constraint.

The six tables defined in `server/app.py` are:

| Table | Fields and use | Relationship/index notes |
| --- | --- | --- |
| `universities` | `id`, abbreviation, name, type, location, QS ranking, color, description, website/domain, tuition range, founding year, student count | Catalog root; index on type. Admin CRUD. |
| `programs` | `id`, `university_id`, name, level, duration, yearly tuition, field, description, intake | Logical many-to-one to university; ID is not an enforced FK. Indexes on university ID/field. Catalog list joins universities; admin deletes a university’s programs manually. |
| `institutes` | `id`, abbreviation, name, type, location, color, description, website/domain, tuition range, founding year, student count | Independent catalog; index on type. Seeded rows upserted at startup. |
| `leads` | `id`, optional email, phone/name, source, status, study profile fields, score, priority, category, timestamp | Independent intake queue; indexes on email, phone, status, created time. No unique phone constraint and no student link. |
| `reservations` | `id`, required name/email/phone, university/field text, preferred date, notes, status, timestamp | Independent intake queue; status/created indexes; no link to student or university ID. |
| `students` | `id`, required full name, email/phone, nationality, field/university text, lifecycle status, notes, created/updated timestamps | Standalone CRM records; status/created indexes; no lead, reservation, or catalog FK. |

The SQL definitions are in `init_db()` around lines 918-1070. This audit read schema source, not production database contents. The ignored local `data/najmuni.db` exists, but its data may differ from production. The schema uses SQLite text timestamps from `datetime('now')` and does not enforce most required/valid values at database level.

## Intake records and CRM

`POST /api/leads` validates and normalizes a phone number, accepts a name/source and ten optional profile fields, calculates a score/priority/category, then looks up an existing lead by phone. A repeat submission overwrites profile/source/status and resets `created_at` rather than recording a new event. This loses source/campaign history and makes concurrent phone duplicates possible. Optional SMTP mail runs after commit. `GET /api/leads/count` is public; admin list/status/delete endpoints are key-protected. Lead status is `new` or `handled` in the admin queue.

`POST /api/reservations` checks name/email/phone, saves free-text university, field, preferred date, and notes, then optionally sends SMTP mail. Admin can list, mark `new`/`handled`, and delete. It does not create a student or lead and has no deduplication or campaign attribution.

`/api/students` supports list/search/status filter, create, patch, and delete. Statuses are `new`, `counselling`, `application`, `documents`, `visa`, `admitted`, `enrolled`, `rejected`. Both the standalone `/students` page and the Students CRM tab inside `/admin` use those endpoints. They provide filtering, status counts, create/edit drawers, status actions, notes, and delete. There is no counselor assignment, conversation timeline, activity/audit trail, identity merge, or automatic promotion from lead/reservation. One student record is effectively a manually maintained profile; university and field are text.

Universities, institutes, and programs have public list/detail endpoints and admin CRUD. Program public lists join a university; university detail includes its programs. Client catalog fallback and some form options remain bundled in `client/src/data.ts`, so backend edits can diverge from displayed options when the API fails or a component uses static data directly.

## Authentication and environment

`ADMIN_KEY` and `STUDENT_KEY` are loaded from process environment or root `.env` at Flask import. `require_admin` protects `/api/admin/*` and accepts only `ADMIN_KEY`, compared with `hmac.compare_digest`. `require_student_access` protects all `/api/students` CRUD and accepts **either** key. Thus `STUDENT_KEY` grants full read/write/delete access to all student CRM records; it does not grant admin catalog, lead, or reservation access. Neither key is a user identity or role-specific session. The browser stores whichever key was entered under `sessionStorage['admin_key']` and sends it in `X-Admin-Key`; the same storage name is used by both private pages. Access-key login is a protected API request, not a separate login endpoint. No user accounts, per-counselor attribution, session expiration/revocation, MFA, or audit log are present.

`.env.example` documents `ADMIN_KEY`, `STUDENT_KEY`, `ALLOWED_ORIGINS`, `ANTHROPIC_API_KEY`, `VITE_API_URL`, SMTP settings, `DB_PATH`, and `FLASK_DEBUG`; `DATABASE_URL` is only a future placeholder and is unused. `PORT` and `MAX_CONTENT_LENGTH` are also read in code. `python-dotenv` loads root `.env` after Flask object creation; deployment environment variables take precedence by default. Vite only exposes `VITE_`-prefixed variables to browser code. Secrets should remain server-side. Production values cannot be confirmed from this repository.

## Existing Claude integration

`POST /api/chat` is a public, rate-limited Flask route. It checks `ANTHROPIC_API_KEY`, builds a system prompt from current university/program database rows, and sends the last 12 client-provided message turns to Anthropic with model `claude-haiku-4-5-20251001`, `max_tokens=350`. It returns the first text block. There is no stored chat history, student identity, counselor review, AI memory, tool use, prompt injection boundary for imported conversation text, or cost ledger. The frontend currently has no `/api/chat` call; only residual chat CSS was found. Therefore this is an available API integration, not evidence of an active chat UI.

## Deployment and legacy backend

Root `npm run dev` runs Flask and Vite concurrently; `npm run build` builds the client. The `Procfile` runs `cd server && gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`. Flask serves `client/dist` if present. README documents Render Free, `najmuni.com`, and `api.najmuni.com`, and warns that Free services sleep and their filesystem is not persistent. There is no Render blueprint, Dockerfile, CI deploy file, or captured live Render build/start settings in the repository; the frontend build must occur in the actual Render build command if Flask is serving it. A paid service plus persistent disk and `DB_PATH=/var/data/najmuni.db` is documented as a temporary SQLite option. No production PostgreSQL connection exists yet.

`server/src` and `server/package.json` are an older Express/TypeScript backend using `sql.js` and the same `data/najmuni.db` path. Its own scripts can run it on port 3001, but root scripts, Vite proxy, `Procfile`, and README all target Flask. No active client reference to the Express port was found. Keep it clearly retired; running it alongside Flask against the same DB could cause schema/data divergence. `start-backend.bat` starts Flask, though it hardcodes a developer-specific Python path.

## Tests and validation status

No first-party pytest/unittest, Jest/Vitest, or Playwright test files/scripts, CI checks, or migration tests were found. The frontend build runs TypeScript compilation plus Vite. This audit did not run the app, modify the database, exercise live endpoints, or test Render/Meta configuration. Before adding conversation workflows, targeted tests should cover schema upgrades, webhook verification/idempotency, CRM authorization, automation suppression during human takeover, and duplicate/failed outbound sends.

## Security issues, technical debt, and Instagram risks

| Finding | Effect on proposed system |
| --- | --- |
| Render Free ephemeral SQLite storage | Incoming messages, assignment state, and lead attribution could disappear on restart/redeploy. |
| Gunicorn has two workers; rate limits are an in-memory dictionary per process | Limits are inconsistent across workers and reset on restart; they are insufficient for webhooks or outbound send controls. `X-Forwarded-For` is trusted directly, so an untrusted header could bypass per-IP limits. |
| One shared admin/student secret in browser session storage | Cannot tell which counselor acted, revoke one counselor, or grant read-only/limited inbox access. An XSS on a private page could read the secret. |
| No immutable event history or idempotency key | Retries from Meta could duplicate messages, leads, automations, or replies. Existing phone-based lead upsert destroys attribution history. |
| No declared FK/unique constraints or common contact identity | Instagram sender IDs cannot safely be treated as phone numbers; linking conversations to a student needs a deliberate identity mapping and merge policy. |
| Synchronous Flask request path does SQL, SMTP, and Anthropic calls | Webhook acknowledgments would be delayed if automation, Meta sends, or AI run inline. Persist and acknowledge first, process separately. |
| `init_db()` executes on every process import; institutes are upserted each time | Multi-worker startup can race; seeded institute edits may be overwritten. New migrations need versioning and careful startup behavior. |
| Limited validation on reservations/students and broad student PATCH payload | New message-derived data needs explicit length/type/format checks and PII handling; stored notes may contain sensitive student information. |
| Public Claude endpoint trusts client message structure and exposes direct error details for SDK errors | Costs/abuse and prompt contamination become more serious if external DMs are passed to AI. Suggested replies should remain drafts until approved by a human at first. |
| Catalog fallbacks and simulated success on network failure | Staff/public UI can conceal API outages or unsaved leads/reservations; inbox must never mimic that behavior. |
| No queue, audit logs, assignment, human-takeover state, or tests | Reliable automation, counselor accountability, and recovery from retries need new boundaries and tests. |

These findings are code-level risks, not proof of a live exploit. Meta permissions, webhook subscriptions, message windows, and API limits must be verified against current official Meta requirements during implementation planning; this repository cannot establish them.

## SQLite versus PostgreSQL

SQLite is acceptable for local development and a very small single-instance prototype **if** it sits on persistent storage, has backups, and write contention is controlled. It is **not safe on the documented Render Free ephemeral filesystem** for important conversations. A production Instagram inbox needs durable records, concurrent webhook writes, idempotent jobs, attribution history, and recoverable processing. PostgreSQL should be introduced **before production ingestion and automation**, retaining SQLite only for local/testing if useful. A temporary persistent-disk SQLite stage can support a limited prototype, but it does not solve multi-instance writes or job coordination. Do not migrate blindly: first inventory and back up production data, confirm deployed topology, define the schema/identity model, and plan a tested migration.

## Recommended architecture without rewriting NajmUni

Keep React and Flask. Add an isolated Flask messaging module (routes, domain services, persistence, and tests) alongside existing catalog/CRM routes. Use Meta webhook verification and signed-payload validation; save raw event identity plus normalized conversation/message records in a durable database transaction; acknowledge promptly. Process keywords, flow steps, Meta sends, and AI suggestions through an asynchronous job mechanism with retry, idempotency, and failure visibility. Store a separate Instagram account/contact identity keyed by platform sender ID, with an explicit optional link to a NajmUni student/lead; do not infer identity from usernames or create a student for every DM. Keep campaign/source touchpoints append-only.

The React shared inbox can be a private route in the existing app, with conversation assignment, message history, reply composer, automation state, and human-takeover control. Introduce counselor accounts/roles and auditable actions before multiple staff use it; do not extend `STUDENT_KEY` to authorize inbox send/automation actions. Automation rules should be versioned and have clear priority, cooldown, opt-out, handoff, and stop conditions. Outbound replies need a single sending path and persisted send status. Claude can later generate **suggested** replies from explicitly selected conversation context and a curated student memory summary; counselor approval and PII controls should come before auto-send. Existing CRM stays intact and receives linked identities/events through small integration points.

Conceptual flow: Instagram → Meta webhook → Flask verification/ingest → durable conversations/events → background automation/send jobs → linked NajmUni CRM → AI draft → human counselor. This is an extension of the existing app, not a replacement.

## Recommended implementation order

1. **Next step:** verify the live Render deployment, persistent-storage status, actual database location/backups, current data volumes, and Meta account/app eligibility; produce a production data inventory and backup/migration plan. This is read-only planning and should precede code work.
2. Design contact identity, conversation/message/event tables, links to existing leads/students, retention, attribution, and idempotency keys; decide PostgreSQL cutover and test data migration.
3. Establish durable PostgreSQL storage and versioned migrations before production webhook ingestion; preserve existing Flask API behavior.
4. Add counselor identity/roles, private inbox authorization, action audit, and targeted tests.
5. Add Meta webhook verification and persist-only ingestion with duplicate/retry tests; use a test Meta app/account and no outbound automation initially.
6. Add shared inbox read/reply, assignment, human takeover, and reliable outbound send status.
7. Add keyword replies and flow engine with explicit suppression and failure recovery.
8. Add CRM linking plus append-only lead/campaign attribution.
9. Add Claude suggested replies and governed student memory; consider automated AI sends only after human-reviewed behavior, privacy rules, and monitoring are proven.

No step above was started by this audit.
