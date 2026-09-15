"""Versioned linear automation definitions and durable per-conversation sessions."""

import re
import unicodedata
from datetime import timedelta

from flask import Blueprint, g, jsonify
from sqlalchemy import delete, func, select, update
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output, string
from .contacts import FIELDS, create_linked_lead
from .messaging import queue_message
from .schema_v1 import (
    contact_labels,
    contacts,
    conversations,
    flow_sessions,
    labels,
    messages,
    rules,
    runs,
    staff_users,
    touchpoints,
)

api = Blueprint("crm_automations", __name__, url_prefix="/api/crm")
ACTIONS = (
    "SEND_MESSAGE",
    "ASK_QUESTION",
    "WAIT_FOR_REPLY",
    "BRANCH_ON_REPLY",
    "ADD_LABEL",
    "REMOVE_LABEL",
    "CREATE_LEAD",
    "UPDATE_CONTACT_FIELD",
    "LINK_OR_UPDATE_LEAD",
    "ASSIGN_COUNSELOR",
    "HUMAN_HANDOFF",
    "STOP",
)
AUTOMATION_FIELDS = tuple(
    k for k in FIELDS if k not in ("display_name", "email", "phone")
)


def normalize_keyword(value):
    value = unicodedata.normalize("NFKC", value).casefold().strip()
    value = re.sub("[\u064b-\u065f\u0670\u0640]", "", value)
    return re.sub("[أإآ]", "ا", value)


def validate(data):
    trigger = data.get("trigger")
    steps = data.get("steps")
    if not isinstance(trigger, dict) or trigger.get("kind") not in (
        "DM",
        "COMMENT",
        "POSTBACK",
    ):
        raise BadRequest("Select a supported trigger")
    frequency = trigger.get("frequency", "every_match")
    if frequency not in ("every_match", "first_message", "after_inactivity"):
        raise BadRequest("Select a supported DM trigger frequency")
    if trigger["kind"] != "DM" and frequency != "every_match":
        raise BadRequest("Message frequency options are available for Instagram DMs")
    keywords = trigger.get("keywords", [])
    if (
        not isinstance(keywords, list)
        or len(keywords) > 20
        or (frequency == "every_match" and not keywords)
        or any(
            not isinstance(k, str) or not 1 <= len(k.strip()) <= 80 for k in keywords
        )
    ):
        raise BadRequest("Provide up to 20 keywords, each up to 80 characters")
    if frequency == "after_inactivity":
        hours = trigger.get("inactivity_hours", 24)
        if (
            not isinstance(hours, int)
            or isinstance(hours, bool)
            or not 1 <= hours <= 720
        ):
            raise BadRequest("Inactivity must be between 1 and 720 hours")
    if trigger.get("match", "contains") not in ("contains", "equals"):
        raise BadRequest("Invalid keyword matching mode")
    if trigger.get("media_id") and (
        not isinstance(trigger["media_id"], str) or len(trigger["media_id"]) > 128
    ):
        raise BadRequest("Invalid media ID")
    if not isinstance(steps, list) or not 1 <= len(steps) <= 30:
        raise BadRequest("An automation needs 1–30 steps")
    private_sent = False
    for i, step in enumerate(steps):
        if not isinstance(step, dict) or step.get("action") not in ACTIONS:
            raise BadRequest("Unsupported automation action")
        action = step["action"]
        if action in ("SEND_MESSAGE", "ASK_QUESTION"):
            string(step, "text", 1000, True)
            if trigger["kind"] == "COMMENT" and private_sent:
                raise BadRequest(
                    "After a comment private reply, wait for a user reply before sending again"
                )
            if trigger["kind"] == "COMMENT":
                private_sent = True
        if (
            action in ("ASK_QUESTION", "WAIT_FOR_REPLY", "UPDATE_CONTACT_FIELD")
            and step.get("field") not in AUTOMATION_FIELDS
        ):
            raise BadRequest("Select a supported study field")
        if action in ("ASK_QUESTION", "WAIT_FOR_REPLY"):
            # Subsequent steps run only after a DM opens the standard window.
            private_sent = False
        if action == "UPDATE_CONTACT_FIELD":
            string(step, "value", 500, True)
        if action in ("ADD_LABEL", "REMOVE_LABEL", "ASSIGN_COUNSELOR") and (
            not isinstance(step.get("target_id"), int)
            or isinstance(step.get("target_id"), bool)
        ):
            raise BadRequest("Choose a valid action target")
        if action == "BRANCH_ON_REPLY":
            if not isinstance(step.get("options"), dict) or not step["options"]:
                raise BadRequest("A branch requires reply options")
            for keyword, target in step["options"].items():
                if (
                    not isinstance(keyword, str)
                    or not isinstance(target, int)
                    or target <= i
                    or target >= len(steps)
                ):
                    raise BadRequest("Branches must point to a later step")
    return {"name": string(data, "name", 120, True), "trigger": trigger, "steps": steps}


@api.get("/automations")
@require_staff()
def list_rules():
    with engine().connect() as conn:
        stats = (
            select(
                runs.c.rule_id,
                func.count().label("executions"),
                func.max(runs.c.created_at).label("last_run"),
            )
            .group_by(runs.c.rule_id)
            .subquery()
        )
        return output(
            conn.execute(
                select(rules, stats.c.executions, stats.c.last_run)
                .outerjoin(stats, stats.c.rule_id == rules.c.id)
                .order_by(rules.c.id.desc())
            )
            .mappings()
            .all()
        )


@api.post("/automations")
@require_staff("OWNER", "ADMIN")
def create_rule():
    values = validate(body())
    with engine().begin() as conn:
        rid = conn.execute(
            rules.insert().values(**values, updated_by=g.staff["id"], updated_at=now())
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "automation.created", "automation", rid)
    return output({"id": rid}, 201)


@api.get("/automations/<int:rid>")
@require_staff()
def detail(rid):
    with engine().connect() as conn:
        rule = conn.execute(select(rules).where(rules.c.id == rid)).mappings().first()
        if not rule:
            raise NotFound("Automation not found")
        result = dict(rule)
        result["runs"] = (
            conn.execute(
                select(runs)
                .where(runs.c.rule_id == rid)
                .order_by(runs.c.id.desc())
                .limit(100)
            )
            .mappings()
            .all()
        )
    return output(result)


@api.patch("/automations/<int:rid>")
@require_staff("OWNER", "ADMIN")
def edit_rule(rid):
    data = body()
    with engine().begin() as conn:
        row = (
            conn.execute(select(rules).where(rules.c.id == rid).with_for_update())
            .mappings()
            .first()
        )
        if not row:
            raise NotFound("Automation not found")
        values = {}
        if any(k in data for k in ("name", "trigger", "steps")):
            values = validate({**row, **data})
            values["version"] = row["version"] + 1
        if "status" in data:
            if data["status"] not in ("ACTIVE", "PAUSED", "DRAFT"):
                raise BadRequest("Invalid status")
            values["status"] = data["status"]
        conn.execute(
            update(rules)
            .where(rules.c.id == rid)
            .values(**values, updated_by=g.staff["id"], updated_at=now())
        )
        audit(
            conn,
            g.staff["id"],
            "automation.updated",
            "automation",
            rid,
            status=values.get("status"),
            version=values.get("version"),
        )
    return jsonify(ok=True)


def matches(trigger, event, inbound_count=None, previous_inbound_at=None):
    if trigger["kind"] != event["kind"] or (
        trigger.get("media_id") and trigger["media_id"] != event.get("media_id")
    ):
        return None
    frequency = trigger.get("frequency", "every_match")
    if frequency == "first_message":
        return "first_message" if inbound_count == 1 else None
    if frequency == "after_inactivity":
        hours = trigger.get("inactivity_hours", 24)
        if previous_inbound_at is None or event[
            "timestamp"
        ] - previous_inbound_at >= timedelta(hours=hours):
            return "after_inactivity"
        return None
    text = normalize_keyword(event["text"])
    return next(
        (
            k
            for k in trigger["keywords"]
            if (
                normalize_keyword(k) == text
                if trigger.get("match") == "equals"
                else normalize_keyword(k) in text
            )
        ),
        None,
    )


def handle_event(conn, vid, event, key):
    conv = (
        conn.execute(
            select(conversations).where(conversations.c.id == vid).with_for_update()
        )
        .mappings()
        .one()
    )
    if conv["control"] in ("HUMAN", "OFF"):
        return
    # Explicit opt-out is conservative and independent of configured keywords.
    if normalize_keyword(event["text"]) in ("stop", "unsubscribe", "توقف", "الغاء"):
        conn.execute(
            update(conversations)
            .where(conversations.c.id == vid)
            .values(control="HUMAN")
        )
        conn.execute(
            update(flow_sessions)
            .where(flow_sessions.c.conversation_id == vid)
            .values(status="STOPPED")
        )
        audit(conn, None, "automation.opt_out", "conversation", vid)
        return
    session = (
        conn.execute(
            select(flow_sessions)
            .where(flow_sessions.c.conversation_id == vid)
            .with_for_update()
        )
        .mappings()
        .first()
    )
    reply = event["text"]
    if session and session["status"] == "WAITING" and session["expires_at"] > now():
        run = (
            conn.execute(select(runs).where(runs.c.id == session["run_id"]))
            .mappings()
            .one()
        )
        rule = (
            conn.execute(select(rules).where(rules.c.id == run["rule_id"]))
            .mappings()
            .one()
        )
        if (
            rule["status"] != "ACTIVE"
            or event["kind"] == "COMMENT"
            or session["last_event_key"] == key
        ):
            return
        if session["waiting_field"]:
            # Collected responses fill empty fields only; counselors own verified data.
            field = session["waiting_field"]
            conn.execute(
                update(contacts)
                .where(
                    contacts.c.id == conv["contact_id"],
                    (contacts.c[field].is_(None)) | (contacts.c[field] == ""),
                )
                .values(**{field: reply[:500]}, updated_at=now())
            )
        session = dict(session)
        session["last_event_key"] = key
    else:
        if session and session["status"] == "WAITING":
            conn.execute(
                update(flow_sessions)
                .where(flow_sessions.c.id == session["id"])
                .values(status="EXPIRED")
            )
        rule = None
        keyword = None
        inbound_count = None
        previous_inbound_at = None
        if event["kind"] == "DM":
            inbound_count = conn.execute(
                select(func.count())
                .select_from(messages)
                .where(
                    messages.c.conversation_id == vid,
                    messages.c.direction == "INBOUND",
                )
            ).scalar_one()
            previous_inbound_at = conn.execute(
                select(
                    func.max(
                        func.coalesce(
                            messages.c.provider_timestamp, messages.c.created_at
                        )
                    )
                ).where(
                    messages.c.conversation_id == vid,
                    messages.c.direction == "INBOUND",
                    messages.c.provider_message_id != event["id"],
                )
            ).scalar_one()
        for candidate in conn.execute(
            select(rules)
            .where(rules.c.status == "ACTIVE")
            .order_by(rules.c.priority.desc(), rules.c.id)
        ).mappings():
            keyword = matches(
                candidate["trigger"], event, inbound_count, previous_inbound_at
            )
            if not keyword:
                continue
            recent = conn.execute(
                select(runs.c.id).where(
                    runs.c.rule_id == candidate["id"],
                    runs.c.conversation_id == vid,
                    runs.c.created_at
                    > now() - timedelta(seconds=candidate["cooldown_seconds"]),
                )
            ).first()
            if not recent:
                rule = candidate
                break
        if not rule:
            return
        runid = conn.execute(
            runs.insert().values(
                rule_id=rule["id"],
                conversation_id=vid,
                event_key=key,
                version=rule["version"],
                status="RUNNING",
            )
        ).inserted_primary_key[0]
        values = {
            "run_id": runid,
            "steps": rule["steps"],
            "position": 0,
            "waiting_field": None,
            "last_event_key": key,
            "status": "RUNNING",
            "expires_at": now() + timedelta(days=7),
        }
        if session:
            conn.execute(
                update(flow_sessions)
                .where(flow_sessions.c.id == session["id"])
                .values(**values)
            )
            sid = session["id"]
        else:
            sid = conn.execute(
                flow_sessions.insert().values(conversation_id=vid, **values)
            ).inserted_primary_key[0]
        session = {**values, "id": sid}
        conn.execute(
            touchpoints.insert().values(
                contact_id=conv["contact_id"],
                event_type="automation_trigger",
                provider_event_id=f"automation:{runid}:{key}",
                keyword=keyword,
                occurred_at=event["timestamp"],
            )
        )
    position = session["position"]
    steps = session["steps"]
    status = "COMPLETED"
    waiting = None
    comment_id = event["id"] if event["kind"] == "COMMENT" else None
    try:
        for _ in range(30):
            if position >= len(steps):
                break
            step = steps[position]
            action = step["action"]
            current = position
            position += 1
            if action in ("SEND_MESSAGE", "ASK_QUESTION"):
                queue_message(
                    conn,
                    vid,
                    step["text"],
                    f"flow:{session['run_id']}:{current}",
                    automated=True,
                    comment_id=comment_id,
                )
                comment_id = None
            if action in ("ASK_QUESTION", "WAIT_FOR_REPLY"):
                waiting = step["field"]
                status = "WAITING"
                break
            if action == "BRANCH_ON_REPLY":
                target = next(
                    (
                        v
                        for k, v in step["options"].items()
                        if normalize_keyword(k) == normalize_keyword(reply)
                    ),
                    None,
                )
                if target is not None:
                    position = target
            if action in ("ADD_LABEL", "REMOVE_LABEL"):
                lid = step["target_id"]
                where = (
                    contact_labels.c.contact_id == conv["contact_id"],
                    contact_labels.c.label_id == lid,
                )
                if action == "REMOVE_LABEL":
                    conn.execute(delete(contact_labels).where(*where))
                elif (
                    conn.execute(
                        select(labels.c.id).where(
                            labels.c.id == lid, labels.c.archived.is_(False)
                        )
                    ).first()
                    and not conn.execute(select(contact_labels).where(*where)).first()
                ):
                    conn.execute(
                        contact_labels.insert().values(
                            contact_id=conv["contact_id"], label_id=lid
                        )
                    )
            if action in ("CREATE_LEAD", "LINK_OR_UPDATE_LEAD"):
                create_linked_lead(conn, conv["contact_id"], None)
            if action == "UPDATE_CONTACT_FIELD":
                field = step["field"]
                conn.execute(
                    update(contacts)
                    .where(
                        contacts.c.id == conv["contact_id"],
                        (contacts.c[field].is_(None)) | (contacts.c[field] == ""),
                    )
                    .values(**{field: step["value"]}, updated_at=now())
                )
            if action == "ASSIGN_COUNSELOR":
                uid = step["target_id"]
                if not conn.execute(
                    select(staff_users.c.id).where(
                        staff_users.c.id == uid,
                        staff_users.c.status == "ACTIVE",
                        staff_users.c.role != "VIEWER",
                    )
                ).first():
                    raise BadRequest("Counselor is not active")
                conn.execute(
                    update(conversations)
                    .where(conversations.c.id == vid)
                    .values(assigned_to=uid)
                )
            if action == "HUMAN_HANDOFF":
                conn.execute(
                    update(conversations)
                    .where(conversations.c.id == vid)
                    .values(control="HUMAN")
                )
                status = "HANDED_OFF"
                break
            if action == "STOP":
                break
    except BadRequest as exc:
        status = "FAILED"
        conn.execute(
            update(runs)
            .where(runs.c.id == session["run_id"])
            .values(safe_error=exc.description)
        )
    conn.execute(
        update(flow_sessions)
        .where(flow_sessions.c.id == session["id"])
        .values(
            position=position, waiting_field=waiting, status=status, last_event_key=key
        )
    )
    conn.execute(
        update(runs).where(runs.c.id == session["run_id"]).values(status=status)
    )
    audit(
        conn,
        None,
        "automation.advanced",
        "conversation",
        vid,
        run_id=session["run_id"],
        position=position,
        status=status,
    )
