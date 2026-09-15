"""Optional real PostgreSQL locking tests, restricted to the local test database."""

from concurrent.futures import ThreadPoolExecutor
import os
import pytest
from sqlalchemy import select
import app as application
from jobs.queue import enqueue, claim
from crm.schema_v1 import jobs
from test_crm_auth import crm_client


@pytest.mark.skipif(
    not os.environ.get("CRM_TEST_DATABASE_URL"),
    reason="Requires isolated local PostgreSQL",
)
def test_two_workers_claim_distinct_durable_jobs(crm_client):
    with application.DATABASE_ENGINE.begin() as conn:
        for i in range(8):
            enqueue(conn, "test", str(i), {"index": i})
    with ThreadPoolExecutor(max_workers=4) as executor:
        claimed = list(
            executor.map(lambda _: claim(application.DATABASE_ENGINE), range(8))
        )
    assert len({j["id"] for j in claimed}) == 8
    with application.DATABASE_ENGINE.connect() as conn:
        assert set(conn.execute(select(jobs.c.status)).scalars()) == {"PROCESSING"}


@pytest.mark.skipif(
    not os.environ.get("CRM_TEST_DATABASE_URL"),
    reason="Requires isolated local PostgreSQL",
)
def test_postgres_alembic_upgrade_preserves_legacy_rows(crm_client, monkeypatch):
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import text
    from crm.schema_v1 import metadata

    test_engine = application.DATABASE_ENGINE
    # Fixture engine is restricted to its freshly created UUID test schema.
    metadata.drop_all(test_engine)
    monkeypatch.setenv(
        "DATABASE_URL", test_engine.url.render_as_string(hide_password=False)
    )
    server = Path(__file__).resolve().parents[1]
    config = Config(str(server / "alembic.ini"))
    config.set_main_option("script_location", str(server / "db" / "migrations"))
    command.upgrade(config, "0001_baseline")
    with test_engine.begin() as conn:
        conn.execute(text("INSERT INTO leads (id,name) VALUES (57,'Preserved lead')"))
    command.upgrade(config, "head")
    with test_engine.connect() as conn:
        assert (
            conn.execute(text("SELECT name FROM leads WHERE id=57")).scalar_one()
            == "Preserved lead"
        )
        assert (
            conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            == "0002_crm_v1"
        )
