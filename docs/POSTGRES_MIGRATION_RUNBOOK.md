# NajmUni PostgreSQL migration runbook

This runbook records the isolated rehearsal and the production cutover completed on 2026-09-15. NajmUni production now uses Flask with Render PostgreSQL 17 through `DATABASE_URL`; React remains the frontend. `DB_PATH=/var/data/najmuni.db` is retained as a rollback setting. The original SQLite file and a separate backup remain on the Render persistent disk. Never run Alembic or the copy tool against the live SQLite file, and never publish connection URLs or production database files.

## Production cutover verification, 2026-09-15

PR #1 was merged into main as `be67e3b2e53e9e8745c8803131e42587b5202f99`, and Render reported that exact deployed commit. The foundation was deployed first with `DATABASE_URL` unset and the existing SQLite path intact. The persistent-disk write-freeze marker then made three live lead-write probes return 503 while catalog reads continued to return 200. A new SQLite online backup was taken from a read-only live connection after the freeze. Its integrity check passed and its SHA-256 equaled the ignored local snapshot already loaded into the isolated PostgreSQL database. Because the frozen backup was byte-for-byte identical to that validated source, a second PostgreSQL reset/load after the freeze was unnecessary; every PostgreSQL record was compared again to the frozen source before switching the service.

Render was then deployed with its internal PostgreSQL `DATABASE_URL`, keeping `DB_PATH` unchanged. The deployed Flask engine selected PostgreSQL, connected internally to PostgreSQL 17.11, and reported Alembic revision `0001_baseline`. Public catalog, university detail/program links, private admin queues, student CRM reads, and the React routes returned successfully. The marker stayed in place through these read checks and was removed only after record-by-record comparison, foreign-key, and sequence checks passed. A uniquely marked student was created, updated, listed, and deleted through the live API; its new write appeared in PostgreSQL while SQLite stayed unchanged. Temporary lead and reservation create/update/delete checks ran through the deployed Flask code with SMTP disabled only in that test process, and their rows were removed. All six PostgreSQL tables returned to the exact frozen record set after those checks.

| Table | Frozen SQLite | Production PostgreSQL |
| --- | ---: | ---: |
| universities | 26 | 26 |
| institutes | 7 | 7 |
| programs | 57 | 57 |
| leads | 310 | 310 |
| reservations | 27 | 27 |
| students | 0 | 0 |

Every field, primary ID, NULL, Unicode value, and timestamp matched; `programs.university_id` links were valid, the PostgreSQL FK was present, and every next ID remained above the existing maximum. The live SQLite file was still byte-identical to `/var/data/najmuni-pre-postgres-cutover-20260915.db` after PostgreSQL write tests. The backup passed a read-only restore into an in-memory nonproduction database. The marker is absent and ordinary API writes are open on PostgreSQL. The last code validation was 17 backend tests, TypeScript check, and Vite production build, all passing. No production data or credential was committed.

The GitHub Vercel deployment check failed on both the pre-migration main commit and the migration PR/main commit. The existing `najmuni.com` pages returned 200 and its live bundle targets `api.najmuni.com`; this database cutover did not repair or validate a new Vercel deployment. Monitor that separate frontend deployment issue without changing the PostgreSQL source of truth.

## Rehearsal status, 2026-09-15

The isolated Render PostgreSQL 17 database passed an Alembic baseline upgrade, a six-table copy from the ignored production SQLite snapshot, independent record-by-record comparison, foreign-key and ID-sequence checks, and a 15-endpoint Flask API smoke test. The smoke test found and fixed a psycopg SELECT-cursor regression in `server/db/engine.py`; its temporary lead, reservation, and student records were removed. The destination was then verified to contain only rehearsal data, reset, upgraded through Alembic again, and reloaded. The final copied rows matched the snapshot exactly: 26 universities, 7 institutes, 57 programs, 310 leads, 27 reservations, and 0 students. This was the pre-cutover rehearsal; the production verification above followed it.

The Flask code supports a temporary write freeze through a marker on the existing persistent disk: `/var/data/.najmuni-migration-write-freeze` when `DB_PATH=/var/data/najmuni.db`. When the marker exists, state-changing `/api/*` requests return 503 with `Retry-After`; reads remain available. This marker was used and then removed during the cutover. For any future controlled migration, verify the deployed code honors it before creating the marker. Never create or remove it by modifying `/var/data/najmuni.db`.

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

## Initial cutover checklist (historical; do not rerun on active PostgreSQL)

1. Verify the prepared Flask code is serving SQLite with `DB_PATH=/var/data/najmuni.db`. Create the write-freeze marker, verify an API write receives 503, then take a fresh consistent, restorable SQLite backup. Keep `/var/data/najmuni.db` and a separate backup intact.
2. Validate the final snapshot. Resolve any compatibility failures before touching PostgreSQL.
3. Confirm PostgreSQL is still isolated. If its six tables contain only the verified rehearsal/final-load data, reset those known tables and `alembic_version` in a controlled one-off task; refuse unknown data or objects. Apply `python -m alembic -c alembic.ini upgrade head` to the empty destination using `DATABASE_URL`, **not** from Gunicorn startup.
4. Run `python -m db.migrate_data --sqlite '<FINAL_SNAPSHOT>'` with `DATABASE_URL` set in a secure runner. Review all six `source=... destination=...` counts and `PASS`; separately check table counts, links, sequences, and selected records.
5. Set `DATABASE_URL` on the Render Flask service and deploy the prepared code. At this point PostgreSQL becomes the **single** production source of truth; stop all SQLite writers. Keep `DB_PATH` only for rollback until the cutover is accepted. No dual-write mode is designed.
6. While the marker remains, smoke test catalog and private read APIs and verify counts against the final snapshot. Remove the marker only after PostgreSQL startup and reads pass, then create controlled test lead/reservation/student records and confirm each lands only in PostgreSQL. Monitor errors, latency, counts, and backups. Reopen ordinary writes only after the checks pass.
7. Retain the SQLite original/backup for a defined recovery period. Later remove production SQLite configuration/storage only after an approved retention decision; this preparation step deletes nothing.

## Rollback

During the frozen cutover, rollback would have restored the old Flask deployment/configuration using `DB_PATH`, kept the original SQLite file, and quarantined the PostgreSQL target. Production now accepts PostgreSQL writes. A future rollback requires reconciling or exporting those new records; simply switching back to SQLite would lose them. Freeze writes immediately, inventory the PostgreSQL-only changes, and plan a reviewed data reconciliation before reopening the old service. Do not run both databases as live writers.

## Known compatibility questions

- Production SQLite may contain older/missing columns from ad hoc migrations or broken program links; the source validator must report these before PostgreSQL copying. The baseline FK on programs intentionally rejects invalid links rather than dropping data.
- The frozen baseline migration creates six tables in a new database; it does **not** repair an arbitrary pre-existing, partly migrated schema. Require an empty PostgreSQL destination and a reviewed SQLite snapshot.
- Existing catalog seed data is bundled in code; only an empty destination should be seeded for demos. Never seed the production migration target because the copier requires empty tables and because startup seeding historically overwrote institute edits.
- SQLite text timestamps become PostgreSQL timestamp columns. API rows are formatted as the existing `YYYY-MM-DD HH:MM:SS` strings. Rehearsal must check timezone expectations and historical timestamp parseability.
- The production cutover checks above passed. Continue monitoring PostgreSQL backups, application errors, and new-write behavior; any rollback after new PostgreSQL writes requires reconciliation with the preserved SQLite copy.
