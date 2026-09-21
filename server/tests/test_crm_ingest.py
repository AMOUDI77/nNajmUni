import hashlib
import hmac
import json
import time
from sqlalchemy import select, func
import app as application
from crm.schema_v1 import (
    social_accounts,
    contacts,
    messages,
    touchpoints,
    webhook_events,
)
from jobs.worker import run_once
from test_crm_auth import crm_client, login


def envelope(mid="message-1"):
    return {
        "object": "instagram",
        "entry": [
            {
                "id": "business-1",
                "time": int(time.time()),
                "messaging": [
                    {
                        "sender": {"id": "prospect-1"},
                        "recipient": {"id": "business-1"},
                        "timestamp": int(time.time() * 1000),
                        "message": {
                            "mid": mid,
                            "text": "السلام عليكم أبي أدرس في ماليزيا",
                        },
                    }
                ],
            }
        ],
    }


def send(client, payload):
    raw = json.dumps(payload).encode()
    signature = (
        "sha256=" + hmac.new(b"test-webhook-secret", raw, hashlib.sha256).hexdigest()
    )
    return client.post(
        "/api/webhooks/instagram",
        data=raw,
        content_type="application/json",
        headers={"X-Hub-Signature-256": signature},
    )


def test_ingest_duplicate_envelopes_and_message_identity(crm_client, monkeypatch):
    monkeypatch.setenv("META_APP_SECRET", "test-webhook-secret")
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            social_accounts.insert().values(
                provider="instagram", provider_account_id="business-1"
            )
        )
    payload = envelope()
    assert send(crm_client, payload).status_code == 200
    assert send(crm_client, payload).status_code == 200
    # Same event repackaged in a different delivery envelope must also dedupe.
    payload["extra"] = "retry"
    assert send(crm_client, payload).status_code == 200
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
        assert run_once(application.DATABASE_ENGINE)
        assert not run_once(application.DATABASE_ENGINE)
    with application.DATABASE_ENGINE.connect() as conn:
        for table in (contacts, messages, touchpoints):
            assert (
                conn.execute(select(func.count()).select_from(table)).scalar_one() == 1
            )
        assert conn.execute(select(messages.c.text)).scalar_one().startswith("السلام")


def test_bad_signature_writes_nothing(crm_client, monkeypatch):
    monkeypatch.setenv("META_APP_SECRET", "test-webhook-secret")
    assert (
        crm_client.post("/api/webhooks/instagram", json=envelope()).status_code == 403
    )
    with application.DATABASE_ENGINE.connect() as conn:
        assert (
            conn.execute(select(func.count()).select_from(webhook_events)).scalar_one()
            == 0
        )


def test_contacts_links_notes_and_viewer_authorization(crm_client):
    headers = login(crm_client)
    cid = crm_client.post(
        "/api/crm/contacts",
        json={"display_name": "Ahmed", "degree_level": "Bachelor"},
        headers=headers,
    ).json["id"]
    lead = crm_client.post(
        f"/api/crm/contacts/{cid}/lead", json={}, headers=headers
    ).json["id"]
    assert (
        crm_client.post(f"/api/crm/contacts/{cid}/lead", json={}, headers=headers).json[
            "id"
        ]
        == lead
    )
    note = crm_client.post(
        f"/api/crm/contacts/{cid}/notes",
        json={"text": "Private counselor note"},
        headers=headers,
    )
    assert note.status_code == 201
    label = crm_client.post(
        "/api/crm/labels", json={"name": "Priority"}, headers=headers
    ).json["id"]
    assert (
        crm_client.put(
            f"/api/crm/contacts/{cid}/labels/{label}", json={}, headers=headers
        ).status_code
        == 200
    )
    detail = crm_client.get(f"/api/crm/contacts/{cid}").json
    assert detail["lead"]["id"] == lead
    assert detail["notes"][0]["text"] == "Private counselor note"
    assert detail["labels"][0]["name"] == "Priority"
    assert (
        crm_client.put(
            f"/api/crm/contacts/{cid}/links/lead", json={"id": None}, headers=headers
        ).status_code
        == 200
    )
    headers = login(crm_client, "viewer")
    assert crm_client.get(f"/api/crm/contacts/{cid}").status_code == 200
    assert (
        crm_client.patch(
            f"/api/crm/contacts/{cid}", json={"stage": "QUALIFIED"}, headers=headers
        ).status_code
        == 403
    )
