import secrets
from datetime import timedelta

from crm.common import now
from crm.schema_v5 import jobs
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert


def enqueue(conn, kind, key, payload):
    insert = pg_insert if conn.dialect.name == "postgresql" else sqlite_insert
    conn.execute(
        insert(jobs)
        .values(kind=kind, dedupe_key=key, payload=payload)
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
    )


def claim(engine):
    with engine.begin() as conn:
        # Expired leases can be reclaimed. Send handlers separately fence messages
        # in SENDING state and never blindly repeat an ambiguous network send.
        conn.execute(
            update(jobs)
            .where(
                jobs.c.status == "PROCESSING",
                func.coalesce(jobs.c.heartbeat_at, jobs.c.started_at)
                < now() - timedelta(minutes=5),
            )
            .values(status="RETRYING", lease_token=None, heartbeat_at=None)
        )
        row = (
            conn.execute(
                select(jobs)
                .where(
                    jobs.c.status.in_(["QUEUED", "RETRYING"]),
                    jobs.c.next_attempt_at <= now(),
                )
                .order_by(jobs.c.id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            .mappings()
            .first()
        )
        if not row:
            return None
        token = secrets.token_hex(24)
        conn.execute(
            update(jobs)
            .where(jobs.c.id == row["id"])
            .values(
                status="PROCESSING",
                started_at=now(),
                heartbeat_at=now(),
                completed_at=None,
                attempts=row["attempts"] + 1,
                lease_token=token,
            )
        )
        return {**row, "attempts": row["attempts"] + 1, "lease_token": token}


def finish(engine, job, error=None, retryable=True):
    with engine.begin() as conn:
        values = {
            "status": "SUCCEEDED",
            "completed_at": now(),
            "safe_error": None,
            "lease_token": None,
            "heartbeat_at": None,
        }
        if error:
            final = not retryable or job["attempts"] >= 5
            values = {
                "status": "FAILED" if final else "RETRYING",
                "safe_error": error,
                "next_attempt_at": now()
                + timedelta(seconds=min(900, 2 ** job["attempts"] * 5)),
                "completed_at": now() if final else None,
                "lease_token": None,
                "heartbeat_at": None,
            }
        conn.execute(
            update(jobs)
            .where(jobs.c.id == job["id"], jobs.c.lease_token == job["lease_token"])
            .values(**values)
        )
