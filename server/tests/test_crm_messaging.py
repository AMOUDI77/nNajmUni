import app as application
from sqlalchemy import select, update
from crm.schema_v1 import social_accounts, messages, conversations
from crm.messaging import deliver
from integrations.instagram.client import ProviderError
from jobs.worker import run_once
from test_crm_auth import crm_client, login
from test_crm_ingest import send, envelope


def setup_conversation(client, monkeypatch):
    monkeypatch.setenv("META_APP_SECRET", "test-webhook-secret")
    monkeypatch.setenv("META_PROVIDER_MODE", "mock")
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            social_accounts.insert().values(
                provider="instagram", provider_account_id="business-1"
            )
        )
    assert send(client, envelope()).status_code == 200
    with application.app.app_context():
        run_once(application.DATABASE_ENGINE)
    return login(client)


def test_reply_persisted_and_request_id_deduped(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)
    data = {"text": "أهلاً بك في نجم", "request_id": "unique-client-request"}
    first = crm_client.post(
        "/api/crm/conversations/1/messages", json=data, headers=headers
    )
    second = crm_client.post(
        "/api/crm/conversations/1/messages", json=data, headers=headers
    )
    assert first.status_code == 202
    assert first.json["id"] == second.json["id"]
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    thread = crm_client.get("/api/crm/conversations/1/messages").json["items"]
    assert len(thread) == 2 and thread[-1]["status"] == "SENT"
    assert thread[-1]["provider_message_id"].startswith("mock-")


def test_send_failure_visible_and_never_fake_success(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)

    def fail(*args):
        raise ProviderError("Provider rejected request")

    monkeypatch.setattr("crm.messaging.send_message", fail)
    crm_client.post(
        "/api/crm/conversations/1/messages",
        json={"text": "Hello", "request_id": "failed"},
        headers=headers,
    )
    with application.app.app_context():
        run_once(application.DATABASE_ENGINE)
    assert (
        crm_client.get("/api/crm/conversations/1/messages").json["items"][-1]["status"]
        == "FAILED"
    )


def test_crashed_send_is_not_repeated(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)
    reply = crm_client.post(
        "/api/crm/conversations/1/messages",
        json={"text": "Hello", "request_id": "crash"},
        headers=headers,
    )
    mid = reply.json["id"]

    def crash(*args):
        raise RuntimeError("simulated process interruption")

    monkeypatch.setattr("crm.messaging.send_message", crash)
    with application.app.app_context():
        run_once(application.DATABASE_ENGINE)
        deliver(application.DATABASE_ENGINE, mid)
    with application.DATABASE_ENGINE.connect() as conn:
        assert (
            conn.execute(
                select(messages.c.status).where(messages.c.id == mid)
            ).scalar_one()
            == "UNCERTAIN"
        )


def test_takeover_and_assignment(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)
    response = crm_client.patch(
        "/api/crm/conversations/1",
        json={"control": "HUMAN", "assigned_to": 3},
        headers=headers,
    )
    assert response.status_code == 200
    detail = crm_client.get("/api/crm/conversations/1").json
    assert detail["control"] == "HUMAN" and detail["assigned_to"] == 3
    assert (
        crm_client.patch(
            "/api/crm/conversations/1", json={"assigned_to": 4}, headers=headers
        ).status_code
        == 400
    )
