from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_crm_upgrade_preserves_legacy_records_and_downgrade(tmp_path, monkeypatch):
    path = tmp_path / "migration.db"
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DB_PATH", str(path))
    server = Path(__file__).resolve().parents[1]
    cfg = Config(str(server / "alembic.ini"))
    cfg.set_main_option("script_location", str(server / "db" / "migrations"))
    command.upgrade(cfg, "0001_baseline")
    engine = create_engine("sqlite:///" + path.as_posix())
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO leads (id,name,phone) VALUES (57,'Preserve me','123')")
        )
    command.upgrade(cfg, "head")
    assert "staff_users" in inspect(engine).get_table_names()
    with engine.connect() as conn:
        assert (
            conn.execute(text("SELECT name FROM leads WHERE id=57")).scalar_one()
            == "Preserve me"
        )
        assert (
            conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            == "0005_composer_polish"
        )
    assert "saved_replies" in inspect(engine).get_table_names()
    assert {
        "conversation_events",
        "conversation_reminders",
        "conversation_sources",
        "saved_reply_usage",
    }.issubset(inspect(engine).get_table_names())
    command.downgrade(cfg, "0002_crm_v1")
    assert "saved_replies" not in inspect(engine).get_table_names()
    assert "staff_users" in inspect(engine).get_table_names()
    command.downgrade(cfg, "0001_baseline")
    assert "staff_users" not in inspect(engine).get_table_names()
    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM leads")).scalar_one() == 1
    engine.dispose()


def test_worker_command_starts_without_migration(tmp_path):
    import os
    import subprocess
    import sys

    from crm.schema_v1 import metadata

    path = tmp_path / "worker.db"
    engine = create_engine("sqlite:///" + path.as_posix())
    metadata.create_all(engine)
    before = set(inspect(engine).get_table_names())
    env = {**os.environ, "DATABASE_URL": "", "DB_PATH": str(path)}
    result = subprocess.run(
        [sys.executable, "-m", "jobs.worker", "--once"],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert set(inspect(engine).get_table_names()) == before
    engine.dispose()
