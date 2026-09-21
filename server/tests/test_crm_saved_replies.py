from datetime import timedelta

import app as application
from crm.automations import matches
from crm.common import now
from crm.schema_v1 import audit_events
from crm.schema_v2 import saved_replies
from sqlalchemy import select
from test_crm_auth import crm_client as crm_client
from test_crm_auth import login


def test_saved_reply_lifecycle_and_viewer_permissions(crm_client):
    headers = login(crm_client, "counselor")
    created = crm_client.post(
        "/api/crm/saved-replies",
        headers=headers,
        json={
            "title": "Visa process",
            "shortcut": "/VISA",
            "content": "Hi {{first_name}}, your {{program}} visa steps are ready.",
            "pinned": True,
        },
    )
    assert created.status_code == 201, created.json
    reply_id = created.json["id"]
    rows = crm_client.get("/api/crm/saved-replies?q=visa").json
    assert rows[0]["shortcut"] == "visa"
    assert rows[0]["pinned"] is True
    assert "{{first_name}}" in rows[0]["content"]

    duplicate = crm_client.post(
        f"/api/crm/saved-replies/{reply_id}/duplicate", headers=headers
    )
    assert duplicate.status_code == 201
    assert (
        crm_client.patch(
            f"/api/crm/saved-replies/{reply_id}",
            headers=headers,
            json={"status": "ARCHIVED"},
        ).status_code
        == 200
    )
    assert crm_client.get("/api/crm/saved-replies").json[0]["shortcut"] == "visa-copy"

    viewer = login(crm_client, "viewer")
    assert crm_client.get("/api/crm/saved-replies").status_code == 200
    assert (
        crm_client.post(
            "/api/crm/saved-replies",
            headers=viewer,
            json={"title": "No", "shortcut": "no", "content": "No"},
        ).status_code
        == 403
    )
    with application.DATABASE_ENGINE.connect() as conn:
        assert conn.execute(select(saved_replies.c.id)).scalars().all()
        actions = (
            conn.execute(
                select(audit_events.c.action).where(
                    audit_events.c.action.like("saved_reply.%")
                )
            )
            .scalars()
            .all()
        )
        assert actions == [
            "saved_reply.created",
            "saved_reply.duplicated",
            "saved_reply.updated",
        ]


def test_saved_reply_rejects_complex_shortcuts(crm_client):
    headers = login(crm_client)
    response = crm_client.post(
        "/api/crm/saved-replies",
        headers=headers,
        json={"title": "Unsafe", "shortcut": "visa steps", "content": "Text"},
    )
    assert response.status_code == 400


def test_simple_dm_frequency_triggers_do_not_repeat_welcome():
    event = {"kind": "DM", "text": "Hello", "timestamp": now()}
    first = {"kind": "DM", "frequency": "first_message", "keywords": []}
    assert matches(first, event, inbound_count=1) == "first_message"
    assert matches(first, event, inbound_count=2) is None

    inactive = {
        "kind": "DM",
        "frequency": "after_inactivity",
        "inactivity_hours": 24,
        "keywords": [],
    }
    assert matches(inactive, event, previous_inbound_at=now() - timedelta(hours=25))
    assert (
        matches(inactive, event, previous_inbound_at=now() - timedelta(hours=2)) is None
    )


def test_first_message_automation_needs_no_keyword(crm_client):
    headers = login(crm_client)
    response = crm_client.post(
        "/api/crm/automations",
        headers=headers,
        json={
            "name": "Welcome once",
            "trigger": {
                "kind": "DM",
                "frequency": "first_message",
                "keywords": [],
                "match": "contains",
            },
            "steps": [{"action": "SEND_MESSAGE", "text": "Welcome"}],
        },
    )
    assert response.status_code == 201, response.json
