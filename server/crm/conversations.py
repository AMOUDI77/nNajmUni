import os
import re
from flask import Blueprint, g, jsonify, request, send_file
from sqlalchemy import or_, select, update
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .auth import development
from .common import audit, body, engine, now, output, page_limit, query_id, string
from .contacts import EDIT
from .inbox import add_event
from .messaging import policy_error, queue_message
from .media_storage import media_store
from .schema_v1 import (
    assignments,
    contact_labels,
    contacts,
    flow_sessions,
    identities,
    jobs,
    labels,
    messages,
    social_accounts,
    staff_users,
)
from .schema_v1 import conversations as table
from .schema_v3 import conversation_reminders, conversation_sources
from .search import CONTACT_SEARCH, IDENTITY_SEARCH, MESSAGE_SEARCH, text_matches

api = Blueprint("crm_conversations", __name__, url_prefix="/api/crm")
VOICE_TYPES = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
}
VOICE_NAME = re.compile(r"^[0-9a-f]{32}\.(webm|ogg|m4a|mp3|wav)$")
MAX_VOICE_BYTES = 25 * 1024 * 1024
MEDIA_NAME = re.compile(r"^[0-9a-f]{32}\.(jpg|png|gif|webp|pdf|webm|ogg|m4a|mp3|wav)$")
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_FILE_BYTES = 10 * 1024 * 1024


def voice_delivery_supported():
    return os.environ.get("META_PROVIDER_MODE") == "mock" and development()


def channel_capabilities():
    mock = os.environ.get("META_PROVIDER_MODE") == "mock" and development()
    return {
        "canSendText": True,
        "canSendImage": mock,
        "canSendAttachment": mock,
        "canSendAudio": mock,
        "canSendVoiceRecording": mock,
        "canSendTemplate": False,
        "canSendQuickReplies": False,
    }


def detect_media(content):
    if content.startswith(b"\xff\xd8\xff"):
        return "image", "image/jpeg", "jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "image/png", "png"
    if content[:6] in (b"GIF87a", b"GIF89a"):
        return "image", "image/gif", "gif"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image", "image/webp", "webp"
    if content.startswith(b"%PDF-"):
        return "file", "application/pdf", "pdf"
    return None


def conversation(conn, vid, lock=False):
    query = select(table).where(table.c.id == vid)
    row = conn.execute(query.with_for_update() if lock else query).mappings().first()
    if not row:
        raise NotFound("Conversation not found")
    return row


@api.get("/conversations")
@require_staff()
def list_conversations():
    reminder_at = (
        select(conversation_reminders.c.remind_at)
        .where(
            conversation_reminders.c.conversation_id == table.c.id,
            conversation_reminders.c.status == "OPEN",
        )
        .order_by(conversation_reminders.c.remind_at)
        .limit(1)
        .correlate(table)
        .scalar_subquery()
        .label("reminder_at")
    )
    source_type = (
        select(conversation_sources.c.source_type)
        .where(conversation_sources.c.conversation_id == table.c.id)
        .correlate(table)
        .scalar_subquery()
        .label("source_type")
    )
    query = select(
        table,
        contacts.c.display_name,
        contacts.c.stage,
        identities.c.username,
        staff_users.c.full_name.label("assignee_name"),
        reminder_at,
        source_type,
    ).join(contacts, contacts.c.id == table.c.contact_id)
    query = query.join(identities, identities.c.id == table.c.identity_id).outerjoin(
        staff_users, staff_users.c.id == table.c.assigned_to
    )
    view = request.args.get("view", "all")
    if view == "open":
        query = query.where(table.c.status == "OPEN")
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
    if view in ("reminders", "due"):
        reminder_query = select(conversation_reminders.c.conversation_id).where(
            conversation_reminders.c.status == "OPEN"
        )
        if view == "due":
            reminder_query = reminder_query.where(
                conversation_reminders.c.remind_at <= now()
            )
        query = query.where(table.c.id.in_(reminder_query))
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
            row["source_type"] = row["source_type"] or "instagram_dm"
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
        result["capabilities"] = channel_capabilities()
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
    close_after_send = data.get("close_after_send", False)
    if not isinstance(close_after_send, bool):
        raise BadRequest("Invalid send action")
    with engine().begin() as conn:
        mid = queue_message(
            conn,
            vid,
            text,
            f"staff:{g.staff['id']}:{key}",
            g.staff["id"],
            close_after_send=close_after_send,
        )
    return output({"id": mid, "status": "QUEUED"}, 202)


@api.post("/conversations/<int:vid>/audio")
@require_staff(*EDIT)
def send_voice(vid):
    if not voice_delivery_supported():
        raise BadRequest(
            "Recorded voice delivery is not enabled for this Instagram connection"
        )
    # Keep the application's 1 MB default for every other endpoint while
    # permitting a bounded multipart recording on this authenticated route.
    request.max_content_length = MAX_VOICE_BYTES + 1024 * 1024
    request_id = (request.form.get("request_id") or "").strip()
    if not request_id or len(request_id) > 100:
        raise BadRequest("Invalid send identifier")
    close_value = request.form.get("close_after_send", "false")
    if close_value not in ("true", "false"):
        raise BadRequest("Invalid send action")
    try:
        duration_ms = int(request.form.get("duration_ms", "0"))
    except ValueError:
        raise BadRequest("Invalid recording duration") from None
    if not 0 < duration_ms <= 10 * 60 * 1000:
        raise BadRequest("Invalid recording duration")
    upload = request.files.get("audio")
    mime = (upload.mimetype if upload else "").split(";", 1)[0].lower()
    if not upload or mime not in VOICE_TYPES:
        raise BadRequest("This audio recording format is not supported")
    key = f"staff:{g.staff['id']}:{request_id}"
    with engine().connect() as conn:
        previous = (
            conn.execute(select(messages).where(messages.c.dedupe_key == key))
            .mappings()
            .first()
        )
    if previous:
        if previous["conversation_id"] != vid or previous["message_type"] != "audio":
            raise BadRequest(
                "This send identifier was already used for a different message"
            )
        return output({"id": previous["id"], "status": previous["status"]}, 202)
    content = upload.read(MAX_VOICE_BYTES + 1)
    if not content or len(content) > MAX_VOICE_BYTES:
        raise BadRequest("Voice recordings must be smaller than 25 MB")
    store = media_store()
    stored = store.save(content, VOICE_TYPES[mime])
    try:
        with engine().begin() as conn:
            mid = queue_message(
                conn,
                vid,
                "Voice message",
                key,
                g.staff["id"],
                close_after_send=close_value == "true",
                message_type="audio",
                attachments=[
                    {
                        "type": "audio",
                        "url": stored.staff_url,
                        "duration_ms": duration_ms,
                        "mime_type": mime,
                    }
                ],
            )
    except Exception:
        store.remove(stored.key)
        raise
    return output({"id": mid, "status": "QUEUED"}, 202)


@api.post("/conversations/<int:vid>/media")
@require_staff(*EDIT)
def send_media(vid):
    capabilities = channel_capabilities()
    if not (capabilities["canSendImage"] or capabilities["canSendAttachment"]):
        raise BadRequest("Media delivery is not enabled for this Instagram connection")
    request.max_content_length = MAX_FILE_BYTES + 1024 * 1024
    request_id = (request.form.get("request_id") or "").strip()
    if not request_id or len(request_id) > 100:
        raise BadRequest("Invalid send identifier")
    close_value = request.form.get("close_after_send", "false")
    if close_value not in ("true", "false"):
        raise BadRequest("Invalid send action")
    text = (request.form.get("text") or "").strip()
    if len(text) > 1000:
        raise BadRequest("Message is too long")
    upload = request.files.get("file")
    if not upload:
        raise BadRequest("Choose a file to send")
    content = upload.read(MAX_FILE_BYTES + 1)
    if not content or len(content) > MAX_FILE_BYTES:
        raise BadRequest("Files must be smaller than 10 MB")
    detected = detect_media(content)
    if not detected:
        raise BadRequest("This file type cannot be sent through Instagram")
    media_type, mime, extension = detected
    if media_type == "image" and len(content) > MAX_IMAGE_BYTES:
        raise BadRequest("Images must be smaller than 8 MB")
    key = f"staff:{g.staff['id']}:{request_id}"
    with engine().connect() as conn:
        previous = conn.execute(select(messages).where(messages.c.dedupe_key == key)).mappings().first()
    if previous:
        if previous["conversation_id"] != vid or previous["message_type"] != media_type:
            raise BadRequest("This send identifier was already used for a different message")
        return output({"id": previous["id"], "status": previous["status"]}, 202)
    store = media_store()
    stored = store.save(content, extension)
    safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", upload.filename or f"upload.{extension}")[:120]
    try:
        with engine().begin() as conn:
            mid = queue_message(
                conn, vid, text or ("Image" if media_type == "image" else safe_name), key,
                g.staff["id"], close_after_send=close_value == "true",
                message_type=media_type,
                attachments=[{"type": media_type, "url": stored.staff_url,
                              "provider_url": stored.provider_url, "mime_type": mime,
                              "filename": safe_name, "size": len(content)}],
            )
    except Exception:
        store.remove(stored.key)
        raise
    return output({"id": mid, "status": "QUEUED"}, 202)


@api.get("/media/<filename>")
@require_staff()
def voice_media(filename):
    if not MEDIA_NAME.fullmatch(filename):
        raise NotFound("Media not found")
    path = media_store().path(filename)
    if not path.is_file():
        raise NotFound("Media not found")
    response = send_file(path, conditional=True, as_attachment=path.suffix == ".pdf")
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


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
        old_status = conv["status"]
        old_assignee = conv["assigned_to"]
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
        if values.get("status") and values["status"] != old_status:
            add_event(
                conn,
                vid,
                "status_changed",
                f"Conversation moved {old_status.title()} → {values['status'].title()}",
                g.staff["id"],
            )
        if "assigned_to" in values and values["assigned_to"] != old_assignee:
            def staff_name(uid):
                if uid is None:
                    return "Unassigned"
                return conn.execute(
                    select(staff_users.c.full_name).where(staff_users.c.id == uid)
                ).scalar_one()

            add_event(
                conn,
                vid,
                "assignment_changed",
                f"Conversation moved {staff_name(old_assignee)} → {staff_name(values['assigned_to'])}",
                g.staff["id"],
            )
        if values.get("control") == "HUMAN" and conv["control"] != "HUMAN":
            add_event(
                conn,
                vid,
                "human_takeover",
                "Human takeover enabled",
                g.staff["id"],
            )
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


@api.post("/conversations/<int:vid>/messages/<int:mid>/retry")
@require_staff(*EDIT)
def retry_message(vid, mid):
    with engine().begin() as conn:
        conversation(conn, vid, True)
        message = conn.execute(
            select(messages)
            .where(messages.c.id == mid, messages.c.conversation_id == vid)
            .with_for_update()
        ).mappings().first()
        if not message or message["status"] != "FAILED":
            raise BadRequest("Only failed messages can be retried")
        conn.execute(
            update(messages)
            .where(messages.c.id == mid)
            .values(status="QUEUED", safe_error=None)
        )
        conn.execute(
            update(jobs)
            .where(jobs.c.dedupe_key == f"send:{mid}")
            .values(
                status="QUEUED",
                attempts=0,
                next_attempt_at=now(),
                lease_token=None,
                started_at=None,
                completed_at=None,
                safe_error=None,
            )
        )
        add_event(conn, vid, "message_retried", "Failed message queued for retry", g.staff["id"])
        audit(conn, g.staff["id"], "message.retried", "conversation", vid, message_id=mid)
    return jsonify(ok=True)
