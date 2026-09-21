import os
import re

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output, string
from .schema_v1 import (
    audit_events,
    conversations,
    jobs,
    knowledge,
    settings,
    webhook_events,
)
from .schema_v3 import saved_reply_usage
from .schema_v4 import saved_replies

api = Blueprint("crm_settings", __name__, url_prefix="/api/crm")
SHORTCUT = re.compile(r"^[a-z0-9_-]{1,32}$")


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


def saved_reply_values(data):
    shortcut = string(data, "shortcut", 32, True).lower().lstrip("/")
    if not SHORTCUT.fullmatch(shortcut):
        raise BadRequest("Shortcut may contain lowercase letters, numbers, - and _")
    status = data.get("status", "ACTIVE")
    if status not in ("ACTIVE", "ARCHIVED"):
        raise BadRequest("Invalid saved reply status")
    pinned = data.get("pinned", False)
    if not isinstance(pinned, bool):
        raise BadRequest("Invalid pinned state")
    return {
        "title": string(data, "title", 100, True),
        "shortcut": shortcut,
        "content": string(data, "content", 4000, True),
        "status": status,
        "pinned": pinned,
        "updated_by": g.staff["id"],
        "updated_at": now(),
    }


@api.get("/saved-replies")
@require_staff()
def list_saved_replies():
    query = request.args.get("q", "").strip()[:100]
    include_archived = request.args.get("include_archived") == "1"
    recent = request.args.get("recent") == "1"
    if recent:
        with engine().connect() as conn:
            rows = conn.execute(
                select(saved_replies)
                .join(
                    saved_reply_usage,
                    saved_reply_usage.c.saved_reply_id == saved_replies.c.id,
                )
                .where(
                    saved_reply_usage.c.staff_id == g.staff["id"],
                    saved_replies.c.status == "ACTIVE",
                )
                .order_by(saved_reply_usage.c.created_at.desc())
                .limit(30)
            ).mappings().all()
        unique = []
        seen = set()
        for row in rows:
            if row["id"] not in seen:
                seen.add(row["id"])
                unique.append(row)
        return output(unique[:8])
    statement = select(saved_replies)
    if not include_archived:
        statement = statement.where(saved_replies.c.status == "ACTIVE")
    if query:
        pattern = f"%{query.lstrip('/')}%"
        statement = statement.where(
            or_(
                saved_replies.c.shortcut.ilike(pattern),
                saved_replies.c.title.ilike(pattern),
                saved_replies.c.content.ilike(pattern),
            )
        )
    with engine().connect() as conn:
        rows = (
            conn.execute(statement.order_by(saved_replies.c.shortcut).limit(100))
            .mappings()
            .all()
        )
    return output(rows)


@api.post("/saved-replies/<int:rid>/use")
@require_staff("OWNER", "ADMIN", "COUNSELOR")
def use_saved_reply(rid):
    data = body()
    conversation_id = data.get("conversation_id")
    if not isinstance(conversation_id, int) or isinstance(conversation_id, bool):
        raise BadRequest("Invalid conversation")
    with engine().begin() as conn:
        if not conn.execute(
            select(saved_replies.c.id).where(
                saved_replies.c.id == rid, saved_replies.c.status == "ACTIVE"
            )
        ).first():
            raise NotFound("Active saved reply not found")
        if not conn.execute(
            select(conversations.c.id).where(conversations.c.id == conversation_id)
        ).first():
            raise NotFound("Conversation not found")
        conn.execute(
            saved_reply_usage.insert().values(
                saved_reply_id=rid,
                staff_id=g.staff["id"],
                conversation_id=conversation_id,
            )
        )
    return jsonify(ok=True)


@api.post("/saved-replies")
@require_staff("OWNER", "ADMIN", "COUNSELOR")
def create_saved_reply():
    values = saved_reply_values(body())
    values["created_by"] = g.staff["id"]
    with engine().begin() as conn:
        rid = conn.execute(
            saved_replies.insert().values(**values)
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "saved_reply.created", "saved_reply", rid)
    return output({"id": rid}, 201)


@api.patch("/saved-replies/<int:rid>")
@require_staff("OWNER", "ADMIN", "COUNSELOR")
def update_saved_reply(rid):
    with engine().begin() as conn:
        existing = (
            conn.execute(select(saved_replies).where(saved_replies.c.id == rid))
            .mappings()
            .first()
        )
        if not existing:
            raise NotFound("Saved reply not found")
        values = saved_reply_values({**existing, **body()})
        conn.execute(
            update(saved_replies).where(saved_replies.c.id == rid).values(**values)
        )
        audit(conn, g.staff["id"], "saved_reply.updated", "saved_reply", rid)
    return jsonify(ok=True)


@api.post("/saved-replies/<int:rid>/duplicate")
@require_staff("OWNER", "ADMIN", "COUNSELOR")
def duplicate_saved_reply(rid):
    with engine().begin() as conn:
        existing = (
            conn.execute(select(saved_replies).where(saved_replies.c.id == rid))
            .mappings()
            .first()
        )
        if not existing:
            raise NotFound("Saved reply not found")
        base = (existing["shortcut"] + "-copy")[:27]
        shortcut = base
        suffix = 2
        while conn.execute(
            select(saved_replies.c.id).where(saved_replies.c.shortcut == shortcut)
        ).first():
            shortcut = f"{base}-{suffix}"[:32]
            suffix += 1
        new_id = conn.execute(
            saved_replies.insert().values(
                title=f"{existing['title']} copy"[:100],
                shortcut=shortcut,
                content=existing["content"],
                status="ACTIVE",
                created_by=g.staff["id"],
                updated_by=g.staff["id"],
                updated_at=now(),
            )
        ).inserted_primary_key[0]
        audit(
            conn,
            g.staff["id"],
            "saved_reply.duplicated",
            "saved_reply",
            new_id,
            source_id=rid,
        )
    return output({"id": new_id}, 201)


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
