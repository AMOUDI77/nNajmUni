import hashlib
import hmac
import json
import os

from crm.common import engine
from crm.schema_v1 import webhook_events
from flask import Blueprint, jsonify, request
from jobs.queue import enqueue
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from werkzeug.exceptions import BadRequest, Forbidden, ServiceUnavailable

webhooks = Blueprint("instagram_webhooks", __name__)


@webhooks.get("/api/webhooks/instagram")
def verify():
    expected = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "")
    supplied = request.args.get("hub.verify_token", "")
    if (
        not expected
        or request.args.get("hub.mode") != "subscribe"
        or not hmac.compare_digest(expected, supplied)
    ):
        raise Forbidden("Verification failed")
    return request.args.get("hub.challenge", ""), 200, {"Content-Type": "text/plain"}


@webhooks.post("/api/webhooks/instagram")
def receive():
    secret = os.environ.get("META_APP_SECRET", "")
    if not secret:
        raise ServiceUnavailable("Instagram webhook is not configured")
    raw = request.get_data(cache=True)
    if len(raw) > 1024 * 1024:
        raise BadRequest("Webhook payload too large")
    expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(
        expected, request.headers.get("X-Hub-Signature-256", "")
    ):
        raise Forbidden("Invalid signature")
    try:
        payload = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise BadRequest("Invalid JSON")
    if not isinstance(payload, dict) or not isinstance(payload.get("entry", []), list):
        raise BadRequest("Invalid envelope")
    if payload.get("object") != "instagram":
        return jsonify(ok=True)
    event_key = hashlib.sha256(raw).hexdigest()
    with engine().begin() as conn:
        insert = pg_insert if conn.dialect.name == "postgresql" else sqlite_insert
        conn.execute(
            insert(webhook_events)
            .values(event_key=event_key, payload=payload)
            .on_conflict_do_nothing(index_elements=["event_key"])
        )
        eid = conn.execute(
            select(webhook_events.c.id).where(webhook_events.c.event_key == event_key)
        ).scalar_one()
        enqueue(conn, "instagram_ingest", "webhook:" + event_key, {"event_id": eid})
    return jsonify(ok=True)
