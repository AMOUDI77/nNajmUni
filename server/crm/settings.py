import os

from flask import Blueprint, g, jsonify
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output, string
from .schema_v1 import (
    audit_events,
    jobs,
    knowledge,
    settings,
    webhook_events,
)

api = Blueprint("crm_settings", __name__, url_prefix="/api/crm")


@api.get("/settings")
@require_staff()
def get_settings():
    with engine().connect() as conn:
        values = {
            r["key"]: r["value"] for r in conn.execute(select(settings)).mappings()
        }
    return output(
        {
            "ai_mode": values.get("ai_mode", "SUGGEST"),
            "auto_available": False,
            "ai_configured": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "workspace_name": "NajmUni",
            "provider_mode": os.environ.get("META_PROVIDER_MODE", "live"),
        }
    )


@api.patch("/settings")
@require_staff("OWNER", "ADMIN")
def update_settings():
    mode = body().get("ai_mode")
    if mode not in ("OFF", "SUGGEST"):
        raise BadRequest("Automatic AI sending is not enabled in V1")
    with engine().begin() as conn:
        insert = pg_insert if conn.dialect.name == "postgresql" else sqlite_insert
        conn.execute(
            insert(settings)
            .values(key="ai_mode", value=mode)
            .on_conflict_do_update(index_elements=["key"], set_={"value": mode})
        )
        audit(conn, g.staff["id"], "settings.ai_changed", mode=mode)
    return jsonify(ok=True)


@api.get("/knowledge")
@require_staff()
def list_knowledge():
    with engine().connect() as conn:
        return output(
            conn.execute(select(knowledge).order_by(knowledge.c.id.desc()).limit(200))
            .mappings()
            .all()
        )


def knowledge_values(data):
    status = data.get("status", "DRAFT")
    if status not in ("DRAFT", "PUBLISHED", "ARCHIVED"):
        raise BadRequest("Invalid article status")
    return {
        "title": string(data, "title", 200, True),
        "content": string(data, "content", 20000, True),
        "category": string(data, "category", 80),
        "language": string(data, "language", 20),
        "status": status,
        "updated_by": g.staff["id"],
        "updated_at": now(),
    }


@api.post("/knowledge")
@require_staff("OWNER", "ADMIN")
def create_knowledge():
    with engine().begin() as conn:
        aid = conn.execute(
            knowledge.insert().values(**knowledge_values(body()))
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "knowledge.created", "knowledge", aid)
    return output({"id": aid}, 201)


@api.patch("/knowledge/<int:aid>")
@require_staff("OWNER", "ADMIN")
def update_knowledge(aid):
    with engine().begin() as conn:
        existing = (
            conn.execute(select(knowledge).where(knowledge.c.id == aid))
            .mappings()
            .first()
        )
        if not existing:
            raise NotFound("Article not found")
        conn.execute(
            update(knowledge)
            .where(knowledge.c.id == aid)
            .values(**knowledge_values({**existing, **body()}))
        )
        audit(conn, g.staff["id"], "knowledge.updated", "knowledge", aid)
    return jsonify(ok=True)


@api.get("/operations")
@require_staff("OWNER", "ADMIN")
def operations():
    with engine().connect() as conn:
        counts = (
            conn.execute(
                select(jobs.c.status, func.count().label("count")).group_by(
                    jobs.c.status
                )
            )
            .mappings()
            .all()
        )
        failed = (
            conn.execute(
                select(
                    jobs.c.id,
                    jobs.c.kind,
                    jobs.c.status,
                    jobs.c.attempts,
                    jobs.c.safe_error,
                    jobs.c.created_at,
                )
                .where(jobs.c.status.in_(["FAILED", "RETRYING"]))
                .order_by(jobs.c.id.desc())
                .limit(50)
            )
            .mappings()
            .all()
        )
        events = (
            conn.execute(
                select(audit_events).order_by(audit_events.c.id.desc()).limit(100)
            )
            .mappings()
            .all()
        )
        last = conn.execute(select(func.max(webhook_events.c.created_at))).scalar_one()
    return output(
        {
            "database": "healthy",
            "queue": counts,
            "failed_jobs": failed,
            "audit": events,
            "last_webhook_at": last,
        }
    )


@api.post("/operations/jobs/<int:jid>/retry")
@require_staff("OWNER", "ADMIN")
def retry_job(jid):
    with engine().begin() as conn:
        row = (
            conn.execute(select(jobs).where(jobs.c.id == jid).with_for_update())
            .mappings()
            .first()
        )
        if not row or row["status"] != "FAILED":
            raise BadRequest("Only failed jobs can be retried")
        if row["kind"] == "send_message":
            raise BadRequest(
                "Reconcile delivery in the conversation before sending again"
            )
        conn.execute(
            update(jobs)
            .where(jobs.c.id == jid)
            .values(status="QUEUED", attempts=0, next_attempt_at=now(), safe_error=None)
        )
        audit(conn, g.staff["id"], "job.retried", "job", jid)
    return jsonify(ok=True)
