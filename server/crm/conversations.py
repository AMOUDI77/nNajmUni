from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_, select, update
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output, page_limit, query_id, string
from .contacts import EDIT
from .messaging import policy_error, queue_message
from .schema_v1 import (
    assignments,
    contact_labels,
    contacts,
    flow_sessions,
    identities,
    labels,
    messages,
    social_accounts,
    staff_users,
)
from .schema_v1 import (
    conversations as table,
)
from .search import CONTACT_SEARCH, IDENTITY_SEARCH, MESSAGE_SEARCH, text_matches

api = Blueprint("crm_conversations", __name__, url_prefix="/api/crm")


def conversation(conn, vid, lock=False):
    query = select(table).where(table.c.id == vid)
    row = conn.execute(query.with_for_update() if lock else query).mappings().first()
    if not row:
        raise NotFound("Conversation not found")
    return row


@api.get("/conversations")
@require_staff()
def list_conversations():
    query = select(
        table,
        contacts.c.display_name,
        contacts.c.stage,
        identities.c.username,
        staff_users.c.full_name.label("assignee_name"),
    ).join(contacts, contacts.c.id == table.c.contact_id)
    query = query.join(identities, identities.c.id == table.c.identity_id).outerjoin(
        staff_users, staff_users.c.id == table.c.assigned_to
    )
    view = request.args.get("view", "all")
    if view == "unread":
        query = query.where(table.c.unread.is_(True))
    if view == "unassigned":
        query = query.where(table.c.assigned_to.is_(None))
    if view == "mine":
        query = query.where(table.c.assigned_to == g.staff["id"])
    if view == "attention":
        query = query.where(
            or_(
                table.c.control == "HUMAN",
                table.c.id.in_(
                    select(messages.c.conversation_id).where(
                        messages.c.status.in_(["FAILED", "UNCERTAIN"])
                    )
                ),
            )
        )
    if request.args.get("label"):
        query = query.where(
            table.c.contact_id.in_(
                select(contact_labels.c.contact_id).where(
                    contact_labels.c.label_id == query_id("label")
                )
            )
        )
    q = request.args.get("q", "").strip()[:200]
    if q:
        pattern = (
            "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        )
        if engine().dialect.name == "postgresql":
            search_condition = or_(
                text_matches(CONTACT_SEARCH, q),
                text_matches(IDENTITY_SEARCH, q),
                table.c.id.in_(
                    select(messages.c.conversation_id).where(
                        text_matches(MESSAGE_SEARCH, q)
                    )
                ),
            )
        else:
            search_condition = or_(
                *[
                    column.ilike(pattern, escape="\\")
                    for column in (
                        contacts.c.display_name,
                        contacts.c.phone,
                        contacts.c.email,
                        identities.c.username,
                    )
                ],
                table.c.id.in_(
                    select(messages.c.conversation_id).where(
                        messages.c.text.ilike(pattern, escape="\\")
                    )
                ),
            )
        query = query.where(search_condition)
    try:
        offset = max(0, int(request.args.get("offset", "0")))
    except ValueError:
        raise BadRequest("Invalid page")
    order = (
        table.c.last_message_at.asc()
        if request.args.get("sort") == "oldest"
        else table.c.last_message_at.desc()
    )
    limit = page_limit()
    with engine().connect() as conn:
        rows = [
            dict(r)
            for r in conn.execute(
                query.order_by(order, table.c.id.desc()).offset(offset).limit(limit + 1)
            ).mappings()
        ]
        cids = [r["contact_id"] for r in rows]
        tags = (
            conn.execute(
                select(contact_labels.c.contact_id, labels)
                .join(labels, labels.c.id == contact_labels.c.label_id)
                .where(
                    contact_labels.c.contact_id.in_(cids), labels.c.archived.is_(False)
                )
            )
            .mappings()
            .all()
            if cids
            else []
        )
        for row in rows:
            row["labels"] = [
                dict(t) for t in tags if t["contact_id"] == row["contact_id"]
            ]
    return output(
        {
            "items": rows[:limit],
            "next_offset": offset + limit if len(rows) > limit else None,
        }
    )


@api.get("/conversations/<int:vid>")
@require_staff()
def detail(vid):
    with engine().connect() as conn:
        result = dict(conversation(conn, vid))
        identity = (
            conn.execute(
                select(identities).where(identities.c.id == result["identity_id"])
            )
            .mappings()
            .one()
        )
        account = (
            conn.execute(
                select(social_accounts).where(
                    social_accounts.c.id == identity["account_id"]
                )
            )
            .mappings()
            .one()
        )
        result["send_blocked_reason"] = policy_error(result, account)
        result["username"] = identity["username"]
    return output(result)


@api.get("/conversations/<int:vid>/messages")
@require_staff()
def thread(vid):
    limit = page_limit()
    try:
        before = int(request.args.get("before", "0"))
    except ValueError:
        raise BadRequest("Invalid cursor")
    query = select(messages).where(messages.c.conversation_id == vid)
    if before:
        query = query.where(messages.c.id < before)
    with engine().connect() as conn:
        conversation(conn, vid)
        rows = (
            conn.execute(query.order_by(messages.c.id.desc()).limit(limit + 1))
            .mappings()
            .all()
        )
    return output(
        {
            "items": list(reversed(rows[:limit])),
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
        }
    )


@api.post("/conversations/<int:vid>/messages")
@require_staff(*EDIT)
def send(vid):
    data = body()
    text = string(data, "text", 1000, True)
    key = string(data, "request_id", 100, True)
    with engine().begin() as conn:
        mid = queue_message(
            conn, vid, text, f"staff:{g.staff['id']}:{key}", g.staff["id"]
        )
    return output({"id": mid, "status": "QUEUED"}, 202)


@api.patch("/conversations/<int:vid>")
@require_staff(*EDIT)
def edit(vid):
    data = body()
    values = {}
    for key, options in (
        ("status", ("OPEN", "CLOSED")),
        ("control", ("HUMAN", "SUGGEST", "OFF")),
    ):
        if key in data:
            if data[key] not in options:
                raise BadRequest("Invalid " + key)
            values[key] = data[key]
    if "unread" in data:
        if not isinstance(data["unread"], bool):
            raise BadRequest("Invalid read status")
        values["unread"] = data["unread"]
    with engine().begin() as conn:
        conv = conversation(conn, vid, True)
        if "assigned_to" in data:
            uid = data["assigned_to"]
            if uid is not None and (
                not isinstance(uid, int)
                or isinstance(uid, bool)
                or not conn.execute(
                    select(staff_users.c.id).where(
                        staff_users.c.id == uid,
                        staff_users.c.status == "ACTIVE",
                        staff_users.c.role != "VIEWER",
                    )
                ).first()
            ):
                raise BadRequest("Select an active counselor")
            values["assigned_to"] = uid
            conn.execute(
                update(contacts)
                .where(contacts.c.id == conv["contact_id"])
                .values(assigned_to=uid, updated_at=now())
            )
            conn.execute(
                assignments.insert().values(
                    conversation_id=vid, assigned_to=uid, assigned_by=g.staff["id"]
                )
            )
        if values:
            conn.execute(update(table).where(table.c.id == vid).values(**values))
        if values.get("control") == "HUMAN":
            conn.execute(
                update(flow_sessions)
                .where(flow_sessions.c.conversation_id == vid)
                .values(status="STOPPED")
            )
            conn.execute(
                update(messages)
                .where(
                    messages.c.conversation_id == vid,
                    messages.c.sender_type == "AUTOMATION",
                    messages.c.status == "QUEUED",
                )
                .values(status="CANCELLED", safe_error="Human takeover")
            )
        audit(
            conn,
            g.staff["id"],
            "conversation.updated",
            "conversation",
            vid,
            changes=values,
        )
    return jsonify(ok=True)
