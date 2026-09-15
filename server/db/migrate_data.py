"""Explicit, validated, all-or-nothing SQLite-to-PostgreSQL data copy."""
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, select, func, text
from db.engine import TABLES, database_url
from db.schema import TABLE_BY_NAME


class MigrationValidationError(Exception):
    pass


def source_rows(path):
    source = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)
    source.row_factory = sqlite3.Row
    try:
        result = {}
        for name in TABLES:
            source.execute(f'SELECT id FROM {name} LIMIT 1')  # fail if schema is missing
            result[name] = [dict(row) for row in source.execute(f'SELECT * FROM {name} ORDER BY id')]
        return result
    finally:
        source.close()


def validate_source(data):
    failures = []
    university_ids = {row['id'] for row in data['universities']}
    for name, records in data.items():
        ids = [row['id'] for row in records]
        if len(ids) != len(set(ids)) or any(value is None for value in ids):
            failures.append(f'{name}: duplicate or missing IDs')
    for row in data['programs']:
        if row.get('university_id') not in university_ids:
            failures.append(f"programs: broken university link at ID {row['id']}")
    required = {'universities': ('abbr', 'name', 'type', 'location'),
                'programs': ('university_id', 'name', 'level', 'field'),
                'institutes': ('abbr', 'name', 'type', 'location'),
                'reservations': ('name', 'email', 'phone'),
                'students': ('full_name',)}
    for name, fields in required.items():
        for row in data[name]:
            if any(not row.get(field) for field in fields):
                failures.append(f"{name}: missing required value at ID {row['id']}")
    if failures:
        raise MigrationValidationError('; '.join(failures))


def normalized(row):
    return {key: value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime)
            else value for key, value in row.items()}


def migrate(source_path, destination_engine):
    data = source_rows(source_path)
    validate_source(data)
    counts = {name: len(data[name]) for name in TABLES}
    with destination_engine.begin() as connection:
        # The schema must be upgraded first. Never merge into a live/partially filled DB.
        if destination_engine.dialect.name == 'postgresql':
            try:
                version = connection.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
            except Exception as exc:
                raise MigrationValidationError('destination Alembic baseline is missing') from exc
            if version != '0001_baseline':
                raise MigrationValidationError('destination Alembic revision is not the expected baseline')
        for name in TABLES:
            table = TABLE_BY_NAME[name]
            existing = connection.execute(select(func.count()).select_from(table)).scalar_one()
            if existing:
                raise MigrationValidationError(f'{name}: destination is not empty')
        for name in TABLES:
            table = TABLE_BY_NAME[name]
            columns = set(table.c.keys())
            for record in data[name]:
                if set(record) - columns:
                    raise MigrationValidationError(f'{name}: unknown source columns')
                converted = dict(record)
                for field in ('created_at', 'updated_at'):
                    if converted.get(field):
                        try:
                            converted[field] = datetime.fromisoformat(converted[field])
                        except ValueError as exc:
                            raise MigrationValidationError(f'{name}: invalid {field} at ID {record["id"]}') from exc
                connection.execute(table.insert().values(**converted))
        for name in TABLES:
            table = TABLE_BY_NAME[name]
            records = [normalized(dict(row._mapping)) for row in
                       connection.execute(select(table).order_by(table.c.id))]
            if len(records) != counts[name]:
                raise MigrationValidationError(f'{name}: row count mismatch')
            for source, destination in zip(data[name], records):
                if normalized(source) != destination:
                    raise MigrationValidationError(f'{name}: data mismatch at ID {source["id"]}')
        if destination_engine.dialect.name == 'postgresql':
            for name in TABLES:
                # Names are fixed in TABLES; no user input is interpolated here.
                connection.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{name}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {name}), 1), "
                    f"(SELECT COUNT(*) > 0 FROM {name}))"))
    return counts


def main():
    parser = argparse.ArgumentParser(description='Copy verified NajmUni SQLite data to an empty PostgreSQL schema')
    parser.add_argument('--sqlite', required=True, help='Explicit path to a SQLite source file')
    parser.add_argument('--database-url', help='PostgreSQL URL; prefer the DATABASE_URL environment variable')
    parser.add_argument('--validate-only', action='store_true', help='Read-only source validation without a destination')
    args = parser.parse_args()
    if args.validate_only:
        try:
            data = source_rows(args.sqlite)
            validate_source(data)
            for name in TABLES:
                print(f'{name}: source={len(data[name])}')
            print('PASS: source IDs, required values, and program links validated')
        except MigrationValidationError as exc:
            print(f'FAIL: {exc}')
            raise SystemExit(1) from None
        except Exception:
            print('FAIL: source could not be read or validated')
            raise SystemExit(1) from None
        return
    import os
    if args.database_url:
        os.environ['DATABASE_URL'] = args.database_url
    if not os.environ.get('DATABASE_URL', '').strip():
        parser.error('Set DATABASE_URL or pass --database-url')
    engine = None
    try:
        url = database_url(str(Path(args.sqlite).resolve()))
        engine = create_engine(url, pool_pre_ping=True, hide_parameters=True)
        counts = migrate(args.sqlite, engine)
        for name, count in counts.items():
            print(f'{name}: source={count} destination={count}')
        print('PASS: all six tables copied and validated in one transaction')
    except MigrationValidationError as exc:
        print(f'FAIL: {exc}')
        raise SystemExit(1) from None
    except Exception:
        print('FAIL: migration aborted; destination transaction rolled back. Check server logs privately.')
        raise SystemExit(1) from None
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == '__main__':
    main()
