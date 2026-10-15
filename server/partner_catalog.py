"""Partner scope and auditable reference metadata; no database writes on import."""
import argparse
import json
from pathlib import Path

CATALOG = json.loads(Path(__file__).with_name('partner_catalog.json').read_text(encoding='utf-8'))
UNIVERSITIES = CATALOG['universities']
PROGRAMS = CATALOG['programs']
ALLOWED = {u['abbr'].upper() for u in UNIVERSITIES} | {'IUKL'}
PROGRAM_BY_ID = {p['id']: p for p in PROGRAMS}

def public_university(row):
    return row.get('abbr', '').upper() in ALLOWED

def enrich_program(row):
    source = PROGRAM_BY_ID.get(row['id'])
    if source and all(source[k] == row[k] for k in ('name', 'tuition_per_year', 'duration_years')):
        for key in ('source_url', 'source_name', 'source_checked_at', 'verification_status'):
            row[key] = source[key]
    return row

def import_catalog(db):
    """Insert missing references, preserve counselor-edited records, retain nonpartners.

    Validate stable university IDs before writing; do not remap student references.
    Caller owns the transaction. Repeating this import is safe.
    """
    for u in UNIVERSITIES:
        row = db.execute('SELECT abbr FROM universities WHERE id=?', [u['id']]).fetchone()
        if row and row[0].upper() not in {u['abbr'].upper(), 'IUKL' if u['abbr'] == 'KLUST' else u['abbr']}:
            raise ValueError(f"University ID {u['id']} is occupied; map IDs before importing")
    ukeys = 'id abbr name type location qs_ranking color description website domain tuition_min tuition_max established students_count'.split()
    pkeys = 'id university_id name level duration_years tuition_per_year field description intake'.split()
    added = 0
    for u in UNIVERSITIES:
        if not db.execute('SELECT id FROM universities WHERE id=?', [u['id']]).fetchone():
            db.execute(f"INSERT INTO universities ({','.join(ukeys)}) VALUES ({','.join('?' for _ in ukeys)})", [u[k] for k in ukeys])
        elif u['abbr'] == 'KLUST':
            db.execute("UPDATE universities SET abbr=?,name=?,website=?,domain=? WHERE id=? AND abbr='IUKL'",
                       [u['abbr'], u['name'], u['website'], u['domain'], u['id']])
        elif u['abbr'] == 'CYBERJAYA':
            db.execute("UPDATE universities SET website=?,domain=? WHERE id=? AND domain='unicyberjaya.edu.my'",
                       [u['website'], u['domain'], u['id']])
    for p in PROGRAMS:
        existing = db.execute('SELECT university_id,name FROM programs WHERE id=?', [p['id']]).fetchone()
        if existing:
            if existing[0] != p['university_id']:
                raise ValueError(f"Program ID collision: {p['id']}")
            continue
        db.execute(f"INSERT INTO programs ({','.join(pkeys)}) VALUES ({','.join('?' for _ in pkeys)})", [p[k] for k in pkeys])
        added += 1
    # PostgreSQL sequences must follow explicit IDs so admin inserts stay collision-free.
    if db.postgres:
        for table in ('universities', 'programs'):
            db.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")
    return added

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Non-destructive partner catalog import')
    parser.add_argument('--yes', action='store_true')
    args = parser.parse_args()
    if not args.yes: parser.error('Pass --yes to import into the configured database')
    from app import DATABASE_ENGINE
    from db.engine import DatabaseConnection
    db = DatabaseConnection(DATABASE_ENGINE)
    try:
        count = import_catalog(db)
        db.commit()
        print(f'Inserted {count} missing programs. Existing records preserved.')
    finally:
        db.close()
