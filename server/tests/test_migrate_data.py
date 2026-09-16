from pathlib import Path
from sqlalchemy import create_engine, select, func, text
from alembic.config import Config
from alembic import command
import pytest

from db.schema import metadata, TABLE_BY_NAME
from db.migrate_data import migrate, MigrationValidationError


def make_source(path, broken=False):
    engine = create_engine('sqlite:///' + str(path).replace('\\', '/'))
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(TABLE_BY_NAME['universities'].insert().values(
            id=7, name='University', abbr='U', type='private', location='KL'))
        conn.execute(TABLE_BY_NAME['institutes'].insert().values(
            id=4, name='Institute', abbr='I', type='language', location='KL'))
        conn.execute(TABLE_BY_NAME['programs'].insert().values(id=11, university_id=999 if broken else 7,
                                                                 name='Program', level='bachelor',
                                                                 field='Technology', tuition_per_year=18000))
        conn.execute(TABLE_BY_NAME['leads'].insert().values(id=6, name='Lead', phone='+60123456789'))
        conn.execute(TABLE_BY_NAME['reservations'].insert().values(id=9, name='Reservation',
                                                                    email='a@example.com', phone='+60123456789'))
        conn.execute(TABLE_BY_NAME['students'].insert().values(id=13, full_name='Student'))
    engine.dispose()


def test_copy_all_six_tables_preserves_ids_and_values(tmp_path):
    source = tmp_path / 'source.db'
    destination = tmp_path / 'destination.db'
    make_source(source)
    engine = create_engine('sqlite:///' + str(destination).replace('\\', '/'))
    metadata.create_all(engine)
    counts = migrate(source, engine)
    assert counts == {name: 1 for name in TABLE_BY_NAME}
    with engine.connect() as conn:
        assert conn.execute(select(TABLE_BY_NAME['programs'].c.university_id)).scalar_one() == 7
        assert conn.execute(select(TABLE_BY_NAME['students'].c.id)).scalar_one() == 13
    engine.dispose()


def test_broken_relationship_reports_fail_without_writes(tmp_path):
    source = tmp_path / 'source.db'
    make_source(source, broken=True)
    engine = create_engine('sqlite:///' + str(tmp_path / 'dest.db').replace('\\', '/'))
    metadata.create_all(engine)
    with pytest.raises(MigrationValidationError, match='broken university link'):
        migrate(source, engine)
    with engine.connect() as conn:
        assert conn.execute(select(func.count()).select_from(TABLE_BY_NAME['universities'])).scalar_one() == 0
    engine.dispose()


def test_nonempty_destination_refuses_to_merge(tmp_path):
    source = tmp_path / 'source.db'
    make_source(source)
    engine = create_engine('sqlite:///' + str(tmp_path / 'dest.db').replace('\\', '/'))
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(TABLE_BY_NAME['students'].insert().values(full_name='Existing'))
    with pytest.raises(MigrationValidationError, match='destination is not empty'):
        migrate(source, engine)
    engine.dispose()


def test_destination_rolls_back_after_late_insert_failure(tmp_path):
    source = tmp_path / 'source.db'
    make_source(source)
    source_engine = create_engine('sqlite:///' + str(source).replace('\\', '/'))
    with source_engine.begin() as conn:
        conn.execute(TABLE_BY_NAME['students'].insert().values(id=14, full_name='Student'))
    source_engine.dispose()
    engine = create_engine('sqlite:///' + str(tmp_path / 'dest.db').replace('\\', '/'))
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text('CREATE UNIQUE INDEX test_unique_name ON students(full_name)'))
    with pytest.raises(Exception):
        migrate(source, engine)
    with engine.connect() as conn:
        for table in TABLE_BY_NAME.values():
            assert conn.execute(select(func.count()).select_from(table)).scalar_one() == 0
    engine.dispose()


def test_alembic_baseline_is_explicit_and_versioned(tmp_path, monkeypatch):
    server_dir = Path(__file__).resolve().parents[1]
    path = tmp_path / 'alembic.db'
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('DB_PATH', str(path))
    config = Config(str(server_dir / 'alembic.ini'))
    config.set_main_option('script_location', str(server_dir / 'db' / 'migrations'))
    command.upgrade(config, '0001_baseline')
    engine = create_engine('sqlite:///' + str(path).replace('\\', '/'))
    with engine.connect() as conn:
        for table in TABLE_BY_NAME.values():
            assert conn.execute(select(func.count()).select_from(table)).scalar_one() == 0
        assert conn.execute(text('SELECT version_num FROM alembic_version')).scalar_one() == '0001_baseline'
    engine.dispose()
