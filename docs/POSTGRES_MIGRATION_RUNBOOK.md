# NajmUni PostgreSQL migration runbook

This runbook describes **later** production actions. No Render database was connected, production SQLite modified, or deployment performed while preparing this code. Treat the existing SQLite service as the sole production source until a verified cutover. Do not run Alembic or the copy tool against the live Render database during code review.

## Prepared code

`DATABASE_URL` selects PostgreSQL through SQLAlchemy Core + psycopg; if absent, Flask uses the existing `DB_PATH` SQLite path. The six-table schema is versioned at `server/db/migrations/versions/0001_baseline.py`. Flask import/Gunicorn startup does not migrate or seed. `python -m db.seed --yes` is an **explicit empty-catalog** seed command, intended only for local/demo databases; do not run it on the migration destination. The copy tool uses one destination transaction, refuses nonempty tables, validates source relationships/required data, compares every copied row, and resets PostgreSQL ID sequences. It does not alter the SQLite source.

All commands below assume a Python environment installed with `pip install -r server/requirements.txt` and execution from `server/`. Keep credentials in a secure environment variable, never in committed files or a pasted terminal log. `DATABASE_URL` should use `postgresql+psycopg://...` (plain `postgresql://...` is normalized to psycopg by the application). The documented Render PostgreSQL URL must be verified privately before use. Alembic and the data-copy CLI read `DATABASE_URL` from the environment. Prefer this to typing a secret literal into shell history or passing it as a visible process argument.

## Before any production write

1. Confirm the actual Render service/build/start commands, attached persistent disk, `DB_PATH=/var/data/najmuni.db`, database size, and which service owns writes. Confirm Render PostgreSQL is new/empty and accessible only through approved credentials. Verify DNS/browser/API topology separately.
2. Put a write-freeze or maintenance window in place for lead, reservation, student, and catalog writes during final snapshot/copy. A moving SQLite source cannot produce a coherent cutover without change capture.
3. Make a consistent SQLite backup from the running source using SQLite's backup API or a database-aware snapshot, not a casual file copy during active writes. Keep the original `/var/data/najmuni.db` untouched. Record row counts and hashes/backup location privately. Test restoring that backup into a nonproduction location.
4. Run `python -m db.migrate_data --sqlite '<COPIED_SQLITE_SNAPSHOT>' --validate-only` on a copied snapshot. Check all six tables, IDs, required fields, and `programs.university_id` links. If it reports broken data, stop and review records with the owner; do not silently delete or rewrite them. Also compare the copied snapshot's schema with the baseline columns. The on-disk production schema was **not** inspected during code preparation.
5. Test the complete sequence on an isolated PostgreSQL 17 staging database first. No real PostgreSQL integration test was run on the development machine.

## Staging rehearsal commands

From `server/`, set `DATABASE_URL` to the **staging** PostgreSQL URL in the private shell/runner, and choose a copied SQLite snapshot path. Example commands use placeholders only:

```bash
pip install -r requirements.txt
export DATABASE_URL='<STAGING_POSTGRES_URL>'
python -m db.migrate_data --sqlite '<COPIED_SQLITE_SNAPSHOT>' --validate-only
python -m alembic -c alembic.ini upgrade head
python -m db.migrate_data --sqlite '<COPIED_SQLITE_SNAPSHOT>'
python -m pytest tests -q
```

On PowerShell, set `$env:DATABASE_URL` privately and run the same module command without a URL argument. Do not place a real credential in `.env.example`, a PR, issue, or transcript. `alembic upgrade head` creates the six-table baseline and records the revision. Do not seed the staging destination before copying. The copy tool prints a row count for each table and `PASS` only after all row comparisons complete and the transaction commits. A validation failure prints `FAIL`, exits nonzero, and rolls back destination writes. If the target was already populated, it refuses to merge.

After rehearsal, verify API behavior using a staging Flask service with `DATABASE_URL`: public catalog, lead/reservation submissions, admin dashboard, student CRM CRUD, ID creation above the migrated maxima, and failure/rollback paths. Check sensitive student records only in authorized private tools. Confirm the destination counts independently and compare a sample of every table. Inspect Alembic revision and database constraints/indexes. Record any schema differences and resolve them in an additional versioned migration, not manual production edits.

## Production cutover sequence (later, not executed)

1. Freeze writes to the current SQLite service and take a fresh consistent, restorable SQLite backup. Keep `/var/data/najmuni.db` and a separate backup intact.
2. Validate the final snapshot. Resolve any compatibility failures before touching PostgreSQL.
3. Confirm the approved PostgreSQL destination is empty. Apply `python -m alembic -c alembic.ini upgrade head` using the production `DATABASE_URL` in a controlled one-off task, **not** from Gunicorn startup.
4. Run `python -m db.migrate_data --sqlite '<FINAL_SNAPSHOT>'` with `DATABASE_URL` set in a secure runner. Review all six `source=... destination=...` counts and `PASS`; separately check table counts, links, sequences, and selected records.
5. Set `DATABASE_URL` on the Render Flask service and deploy the prepared code. At this point PostgreSQL becomes the **single** production source of truth; stop all SQLite writers. Keep `DB_PATH` only for rollback until the cutover is accepted. No dual-write mode is designed.
6. Smoke test catalog and private APIs, then create controlled test lead/reservation/student records and confirm each lands only in PostgreSQL. Monitor errors, latency, counts, and backups. Reopen writes only after the checks pass.
7. Retain the SQLite original/backup for a defined recovery period. Later remove production SQLite configuration/storage only after an approved retention decision; this preparation step deletes nothing.

## Rollback

Before reopening writes, rollback is straightforward: restore the old Flask deployment/configuration using `DB_PATH`, keep the original SQLite file, and leave the failed PostgreSQL target quarantined. After PostgreSQL accepts new writes, rollback requires reconciling or exporting those new records; simply switching back to SQLite would lose them. Freeze writes immediately, inventory the PostgreSQL-only changes, and plan a reviewed data reconciliation before reopening the old service. Do not run both databases as live writers.

## Known compatibility questions

- Production SQLite may contain older/missing columns from ad hoc migrations or broken program links; the source validator must report these before PostgreSQL copying. The baseline FK on programs intentionally rejects invalid links rather than dropping data.
- The frozen baseline migration creates six tables in a new database; it does **not** repair an arbitrary pre-existing, partly migrated schema. Require an empty PostgreSQL destination and a reviewed SQLite snapshot.
- Existing catalog seed data is bundled in code; only an empty destination should be seeded for demos. Never seed the production migration target because the copier requires empty tables and because startup seeding historically overwrote institute edits.
- SQLite text timestamps become PostgreSQL timestamp columns. API rows are formatted as the existing `YYYY-MM-DD HH:MM:SS` strings. Rehearsal must check timezone expectations and historical timestamp parseability.
- PostgreSQL integration, live Render settings, production data quality, and precise write-freeze mechanics remain unverified. Review them before executing this runbook.
