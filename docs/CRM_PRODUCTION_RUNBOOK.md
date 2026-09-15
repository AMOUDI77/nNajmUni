# CRM rollout runbook

This CRM branch has not been deployed. The existing production PostgreSQL database and preserved SQLite rollback files have not been modified. Deploy only after branch review and the complete validation matrix.

## Services

Keep the existing React/Vite frontend and Flask/Gunicorn API. Add a background worker from the same repository/commit:

- Root directory: `server`
- Build: `pip install -r requirements.txt`
- Start: `python -m jobs.worker`
- Database: the same internal production `DATABASE_URL` as the API
- Environment: the same server-side CRM/Meta/Anthropic configuration used by the API

The worker performs no schema creation or seeding. A dedicated worker is required for webhook normalization, outbound sends and AI drafts. The frontend polls the inbox every ten seconds. An initially single worker is sufficient; PostgreSQL claims permit safe additional workers.

## Configuration

Retain the existing production `DATABASE_URL`, `DB_PATH` and legacy access keys. Do not rerun the SQLite migration.

New API configuration names: `CRM_ENV=production`, `CRM_ALLOWED_ORIGINS`, `CRM_PUBLIC_URL`, `CRM_CLAUDE_MODEL`, `META_PROVIDER_MODE=live`, `META_APP_ID`, `META_APP_SECRET`, `META_API_VERSION`, `META_INSTAGRAM_REDIRECT_URI`, `META_WEBHOOK_VERIFY_TOKEN`, `META_TOKEN_ENCRYPTION_KEY`. Retain `ANTHROPIC_API_KEY` server-side. Generate the encryption key with Fernet’s key generator and store it securely; losing it requires reconnecting Instagram. Back it up separately from the database.

Allow explicit HTTPS frontend origins, normally `https://najmuni.com` and `https://www.najmuni.com`. CRM cookie requests require same-site deployment, such as `najmuni.com` → `api.najmuni.com`. Keep `VITE_API_URL` as the existing frontend API URL. No secret may use a `VITE_` prefix. A future `crm.najmuni.com` can serve the same SPA with its entry redirected to `/crm`; no new frontend repository is needed.

## Reviewed deployment sequence

1. Complete current official Meta API contract/app-eligibility verification in `INSTAGRAM_INTEGRATION.md`. Configure the callback as `https://api.najmuni.com/api/crm/integrations/instagram/callback`, and webhook as `https://api.najmuni.com/api/webhooks/instagram`. Do not share credentials in chat.
2. Confirm PostgreSQL backups and rehearse `0001_baseline → 0003_saved_replies` on a staging copy. The additive revisions create CRM tables and saved replies only. Do not use destructive downgrades as routine rollback.
3. Build/test the reviewed commit and apply `python -m alembic -c alembic.ini upgrade head` explicitly from `server/`, once, during the planned rollout. Neither Gunicorn nor the worker runs Alembic.
4. Deploy the API and matching frontend. Use the explicit `python -m crm.create_owner` command to bootstrap the first owner through hidden password prompts. Configure additional staff in Team settings.
5. Start the background worker. Verify login/session cookies, CSRF, read-only viewer behavior, operation health, queue processing and all existing public/admin/student routes.
6. Connect the approved Instagram account from CRM Settings. Verify signed webhook reception and a real inbound DM, then one counselor reply. Verify delivery on Instagram, not only HTTP success. Test a comment private reply, duplicate delivery and human takeover.
7. Publish reviewed knowledge, test AI drafts without auto-send, and activate only the reviewed automation. Monitor failed/uncertain messages, failed jobs, token expiry, costs and audit activity.

If worker/API problems occur, stop the worker and pause automations; retain PostgreSQL as the source of truth. Do not fall back to SQLite. Ambiguous messages require reconciliation before a new send. Disconnect the provider to stop new processing when necessary. A previous app version can be restored while retaining the additive CRM tables and all captured data.

## Local checks

From `server/`: `python -m pytest tests -q`. Real PostgreSQL tests additionally use `CRM_TEST_DATABASE_URL` and refuse anything except a loopback host with database name `najmuni_crm_test`; each test uses its own temporary schema. Frontend: `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e` from `client/`. The E2E script starts a disposable loopback Flask fixture, synthetic demo data and a mock worker. It cannot run on Render. Playwright Chromium must be installed locally.

Frontend build tools were updated to patched Vite 6.4.3 / Vitest 4.1.11 without changing React 18 or the application framework. Use Node 22.12+ (validation used Node 24). npm audit still reports two moderate advisories through the existing React Router 6 dependency. The CRM uses fixed internal routes and no SSR hydration; evaluate a separate tested router maintenance update rather than force-upgrading the application during deployment.

## Validation evidence (2026-09-16)

- Backend suite with isolated local PostgreSQL 17: **45 passed**. This includes the explicit additive migrations, concurrent job claims, worker CLI startup, authorization, duplicate events, takeover, DM frequency guards, saved replies, automation, and AI draft checks.
- SQLite suite: **43 passed, 2 skipped**; the skipped tests require PostgreSQL and passed in the PostgreSQL run.
- Frontend unit tests: **6 passed**. TypeScript check and Vite production build passed.
- Playwright against a disposable local Flask database and mock providers: **2 passed**. Covered Saved Replies insertion without auto-send, Arabic replies, notes, assignment, lead linking, automation creation, AI drafts and memory, and desktop/mobile/RTL layouts.
- Alembic head: `0003_saved_replies`. No production migration was executed.
- Changed-file secret scan found no real credentials; local environment files remain ignored. This is not a guarantee against every possible secret format.

Instagram and Claude responses in browser tests were synthetic provider fixtures. Real Meta account eligibility, current API contract, permissions, webhook delivery, and live sending remain external acceptance checks. No CRM production deployment or production data changes were performed.
