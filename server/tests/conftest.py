import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.pop('DATABASE_URL', None)
os.environ['ADMIN_KEY'] = 'test-admin-key'
os.environ['STUDENT_KEY'] = 'test-student-key'

import app as najm_app
from db.schema import metadata


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine('sqlite:///' + str(tmp_path / 'api.db').replace('\\', '/'))
    metadata.create_all(engine)
    monkeypatch.setattr(najm_app, 'DATABASE_ENGINE', engine)
    najm_app.app.config['TESTING'] = True
    with najm_app.app.test_client() as test_client:
        yield test_client
    engine.dispose()


@pytest.fixture
def admin_headers():
    return {'X-Admin-Key': 'test-admin-key'}


@pytest.fixture
def student_headers():
    return {'X-Admin-Key': 'test-student-key'}
