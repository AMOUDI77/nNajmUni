from collections.abc import Mapping
from datetime import date, datetime, timezone
from decimal import Decimal

from flask import current_app, jsonify, request
from werkzeug.exceptions import BadRequest

from .schema_v1 import audit_events


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def engine():
    return current_app.extensions["crm_engine"]()


def audit(conn, actor, action, entity_type=None, entity_id=None, **details):
    conn.execute(
        audit_events.insert().values(
            actor_id=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )


def serialize(value):
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds") + "Z"
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "_mapping"):
        value = dict(value._mapping)
    if isinstance(value, Mapping):
        return {k: serialize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize(v) for v in value]
    return value


def output(value, status=200):
    return jsonify(serialize(value)), status


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest("Expected a JSON object")
    return data


def string(data, key, limit=500, required=False):
    value = data.get(key, "")
    if (
        not isinstance(value, str)
        or len(value) > limit
        or (required and not value.strip())
    ):
        raise BadRequest(f"Invalid {key}")
    return value.strip()


def page_limit():
    try:
        return min(100, max(1, int(request.args.get("limit", 40))))
    except (ValueError, TypeError):
        raise BadRequest("Invalid page size")


def query_id(name):
    try:
        value = int(request.args[name])
        if value < 1:
            raise ValueError()
        return value
    except (ValueError, TypeError, KeyError):
        raise BadRequest("Invalid " + name)
