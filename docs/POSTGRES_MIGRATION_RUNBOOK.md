# NajmUni PostgreSQL migration runbook

This runbook describes the isolated PostgreSQL rehearsal and the **later** production cutover. The production Flask service has not been connected to PostgreSQL, production SQLite has not been modified, and the foundation code has not been deployed. Treat the existing SQLite service as the sole production source until a verified cutover. Do not run Alembic or the copy tool against the live Render SQLite database.

## Rehearsal status, 2026-09-15

The isolated Render PostgreSQL 17 database passed an Alembic baseline upgrade, a six-table copy from the ignored production SQLite snapshot, independent record-by-record comparison, foreign-key and ID-sequence checks, and a 15-endpoint Flask API smoke test. The smoke test found and fixed a psycopg SELECT-cursor regression in `server/db/engine.py`; its temporary lead, reservation, and student records were removed. The destination was then verified to contain only rehearsal data, reset, upgraded through Alembic again, and reloaded. The final copied rows match the snapshot exactly: 26 universities, 7 institutes, 57 programs, 310 leads, 27 reservations, and 0 students. A new SQLite online backup made from the live source through a read-only connection had the same SHA-256 as the ignored local snapshot; a second read-only backup check after the PostgreSQL load still matched. This equality is a point-in-time check, **not** a write freeze. Production remains on SQLite and the cutover is pending.

The prepared Flask code supports a temporary write freeze through a marker on the existing persistent disk: `/var/data/.najmuni-migration-write-freeze` when `DB_PATH=/var/data/najmuni.db`. When the marker exists, state-changing `/api/*` requests return 503 with `Retry-After`; reads remain available. The currently deployed older Flask code does **not** honor this marker. Deploy and verify the foundation code on SQLite first, then create the marker through the approved Render service shell, verify writes return 503, and only then make the final backup and switch database settings. Remove the marker after PostgreSQL has passed production checks. Never create or remove it by modifying `/var/data/najmuni.db`.

## Prepared code

`DATABASE_URL` selects PostgreSQL through SQLAlchemy Core + psycopg; if absent, Flask uses the existing `DB_PATH` SQLite path. The six-table schema is versioned at `server/db/migrations/versions/0001_baseline.py`. Flask import/Gunicorn startup does not migrate or seed. `python -m db.seed --yes` is an **explicit empty-catalog** seed command, intended only for local/demo databases; do not run it on the migration destination. The copy tool uses one destination transaction, refuses nonempty tables, validates source relationships/required data, compares every copied row, and resets PostgreSQL ID sequences. It does not alter the SQLite source.

All commands below assume a Python environment installed with `pip install -r server/requirements.txt` and execution from `server/`. Keep credentials in a secure environment variable, never in committed files or a pasted terminal log. `DATABASE_URL` should use `postgresql+psycopg://...` (plain `postgresql://...` is normalized to psycopg by the application). The documented Render PostgreSQL URL must be verified privately before use. Alembic and the data-copy CLI read `DATABASE_URL` from the environment. Prefer this to typing a secret literal into shell history or passing it as a visible process argument.

## Before any production write

1. Confirm the actual Render service/build/start commands, attached persistent disk, `DB_PATH=/var/data/najmuni.db`, database size, and which service owns writes. Confirm Render PostgreSQL is new/empty and accessible only through approved credentials. Verify DNS/browser/API topology separately.
2. Put a write-freeze or maintenance window in place for lead, reservation, student, and catalog writes during final snapshot/copy. Once the prepared Flask code is deployed and verified on SQLite, the persistent-disk marker above can enforce this. A moving SQLite source cannot produce a coherent cutover without change capture.
3. Make a consistent SQLite backup from the running source using SQLite's backup API or a database-aware snapshot, not a casual file copy during active writes. Keep the original `/var/data/najmuni.db` untouched. Record row counts and hashes/backup location privately. Test restoring that backup into a nonproduction location.
4. Run `python -m db.migrate_data --sqlite '<COPIED_SQLITE_SNAPSHOT>' --validate-only` on a copied snapshot. Check all six tables, IDs, required fields, and `programs.university_id` links. If it reports broken data, stop and review records with the owner; do not silently delete or rewrite them. Also compare the copied snapshot's schema with the baseline columns. The rehearsal snapshot's six schemas and timestamps were checked; repeat this for any changed final snapshot.
5. Test the complete sequence on an isolated PostgreSQL 17 staging database first. The real Render PostgreSQL rehearsal above passed; repeat it if the final source changes or code changes after this audit.

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

1. Verify the prepared Flask code is serving SQLite with `DB_PATH=/var/data/najmuni.db`. Create the write-freeze marker, verify an API write receives 503, then take a fresh consistent, restorable SQLite backup. Keep `/var/data/najmuni.db` and a separate backup intact.
2. Validate the final snapshot. Resolve any compatibility failures before touching PostgreSQL.
3. Confirm PostgreSQL is still isolated. If its six tables contain only the verified rehearsal/final-load data, reset those known tables and `alembic_version` in a controlled one-off task; refuse unknown data or objects. Apply `python -m alembic -c alembic.ini upgrade head` to the empty destination using `DATABASE_URL`, **not** from Gunicorn startup.
4. Run `python -m db.migrate_data --sqlite '<FINAL_SNAPSHOT>'` with `DATABASE_URL` set in a secure runner. Review all six `source=... destination=...` counts and `PASS`; separately check table counts, links, sequences, and selected records.
5. Set `DATABASE_URL` on the Render Flask service and deploy the prepared code. At this point PostgreSQL becomes the **single** production source of truth; stop all SQLite writers. Keep `DB_PATH` only for rollback until the cutover is accepted. No dual-write mode is designed.
6. While the marker remains, smoke test catalog and private read APIs and verify counts against the final snapshot. Remove the marker only after PostgreSQL startup and reads pass, then create controlled test lead/reservation/student records and confirm each lands only in PostgreSQL. Monitor errors, latency, counts, and backups. Reopen ordinary writes only after the checks pass.
7. Retain the SQLite original/backup for a defined recovery period. Later remove production SQLite configuration/storage only after an approved retention decision; this preparation step deletes nothing.

## Rollback

Before reopening writes, rollback is straightforward: restore the old Flask deployment/configuration using `DB_PATH`, keep the original SQLite file, and leave the failed PostgreSQL target quarantined. After PostgreSQL accepts new writes, rollback requires reconciling or exporting those new records; simply switching back to SQLite would lose them. Freeze writes immediately, inventory the PostgreSQL-only changes, and plan a reviewed data reconciliation before reopening the old service. Do not run both databases as live writers.

## Known compatibility questions

- Production SQLite may contain older/missing columns from ad hoc migrations or broken program links; the source validator must report these before PostgreSQL copying. The baseline FK on programs intentionally rejects invalid links rather than dropping data.
- The frozen baseline migration creates six tables in a new database; it does **not** repair an arbitrary pre-existing, partly migrated schema. Require an empty PostgreSQL destination and a reviewed SQLite snapshot.
- Existing catalog seed data is bundled in code; only an empty destination should be seeded for demos. Never seed the production migration target because the copier requires empty tables and because startup seeding historically overwrote institute edits.
- SQLite text timestamps become PostgreSQL timestamp columns. API rows are formatted as the existing `YYYY-MM-DD HH:MM:SS` strings. Rehearsal must check timezone expectations and historical timestamp parseability.
- The isolated PostgreSQL integration and copied-snapshot data quality passed rehearsal, but live Render deployment settings and the production write-freeze/cutover remain unverified. Review them before switching the service.
