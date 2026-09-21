import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine

from db.schema import metadata


def test_flask_import_without_database_url_keeps_existing_sqlite_unchanged(tmp_path):
    database = tmp_path / 'existing.db'
    engine = create_engine('sqlite:///' + str(database).replace('\\', '/'))
    metadata.create_all(engine)
    engine.dispose()
    before = database.read_bytes()
    before_mtime = database.stat().st_mtime_ns
    server_dir = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env['DATABASE_URL'] = ''  # stops a local .env from overriding this test
    env['DB_PATH'] = str(database)
    result = subprocess.run(
        [sys.executable, '-c',
         "import app; assert app.DATABASE_ENGINE.dialect.name == 'sqlite'; "
         "assert app.DB_PATH == __import__('os').environ['DB_PATH']; "
         "assert len(app.app.url_map._rules) >= 30"],
        cwd=server_dir, env=env, capture_output=True, text=True, timeout=15)
    assert result.returncode == 0, result.stderr
    assert database.read_bytes() == before
    assert database.stat().st_mtime_ns == before_mtime


def test_production_disk_path_remains_a_valid_sqlite_url(monkeypatch):
    from db.engine import database_url
    monkeypatch.setenv('DATABASE_URL', '')
    monkeypatch.setenv('DB_PATH', '/var/data/najmuni.db')
    assert database_url('/var/data/najmuni.db') == 'sqlite:////var/data/najmuni.db'


def test_crm_cors_inherits_existing_production_origin(tmp_path):
    server_dir = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env['DATABASE_URL'] = ''
    env['DB_PATH'] = str(tmp_path / 'cors.db')
    env['ALLOWED_ORIGINS'] = 'https://najmuni.com,https://www.najmuni.com'
    env.pop('CRM_ALLOWED_ORIGINS', None)
    result = subprocess.run(
        [
            sys.executable,
            '-c',
            "import app; c=app.app.test_client(); "
            "r=c.get('/api/crm/auth/me', headers={'Origin':'https://najmuni.com'}); "
            "assert r.status_code == 401; "
            "assert r.headers['Access-Control-Allow-Origin'] == 'https://najmuni.com'; "
            "assert r.headers['Access-Control-Allow-Credentials'] == 'true'",
        ],
        cwd=server_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
