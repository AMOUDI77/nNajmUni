from sqlalchemy import select, func
import app as application
from crm.schema_v1 import (
    social_accounts,
    messages,
    contacts,
    flow_sessions,
    runs,
    memory,
    suggestions,
)
from crm.automations import normalize_keyword
from jobs.worker import run_once
from test_crm_auth import crm_client, login
from test_crm_ingest import envelope, send


def setup(client, monkeypatch):
    monkeypatch.setenv("META_APP_SECRET", "test-webhook-secret")
    monkeypatch.setenv("META_PROVIDER_MODE", "mock")
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            social_accounts.insert().values(
                provider="instagram", provider_account_id="business-1"
            )
        )
    return login(client)


def drain():
    with application.app.app_context():
        for _ in range(20):
            if not run_once(application.DATABASE_ENGINE):
                return
    raise AssertionError("Queue did not drain")


def test_question_flow_persists_and_duplicate_does_not_advance(crm_client, monkeypatch):
    headers = setup(crm_client, monkeypatch)
    definition = {
        "name": "Malaysia study",
        "trigger": {"kind": "DM", "keywords": ["ماليزيا"], "match": "contains"},
        "steps": [
            {"action": "SEND_MESSAGE", "text": "أهلاً بك"},
            {
                "action": "ASK_QUESTION",
                "text": "ما المرحلة الدراسية؟",
                "field": "degree_level",
            },
            {"action": "CREATE_LEAD"},
            {"action": "STOP"},
        ],
    }
    rule = crm_client.post("/api/crm/automations", json=definition, headers=headers)
    assert rule.status_code == 201
    crm_client.patch(
        "/api/crm/automations/" + str(rule.json["id"]),
        json={"status": "ACTIVE"},
        headers=headers,
    )
    payload = envelope()
    send(crm_client, payload)
    drain()
    with application.DATABASE_ENGINE.connect() as conn:
        assert conn.execute(select(flow_sessions.c.status)).scalar_one() == "WAITING"
        assert (
            conn.execute(select(func.count()).select_from(messages)).scalar_one() == 3
        )
    send(crm_client, payload)
    drain()
    reply = envelope("reply-2")
    reply["entry"][0]["messaging"][0]["message"]["text"] = "Bachelor"
    send(crm_client, reply)
    drain()
    with application.DATABASE_ENGINE.connect() as conn:
        contact = conn.execute(select(contacts)).mappings().one()
        assert contact["degree_level"] == "Bachelor" and contact["lead_id"]
        assert conn.execute(select(runs.c.status)).scalar_one() == "COMPLETED"
        assert conn.execute(select(func.count()).select_from(runs)).scalar_one() == 1


def test_arabic_normalization_and_comment_safety(crm_client):
    assert normalize_keyword("مَـالِيزيا") == normalize_keyword("ماليزيا")
    headers = login(crm_client)
    response = crm_client.post(
        "/api/crm/automations",
        headers=headers,
        json={
            "name": "Bad private replies",
            "trigger": {"kind": "COMMENT", "keywords": ["study"]},
            "steps": [
                {"action": "SEND_MESSAGE", "text": "One"},
                {"action": "SEND_MESSAGE", "text": "Two"},
            ],
        },
    )
    assert response.status_code == 400


def test_ai_draft_memory_is_separate_and_failure_visible(crm_client, monkeypatch):
    headers = setup(crm_client, monkeypatch)
    monkeypatch.setenv("CRM_AI_TEST_PROVIDER", "1")
    send(crm_client, envelope())
    drain()
    crm_client.patch(
        "/api/crm/contacts/1", json={"degree_level": "Verified master"}, headers=headers
    )
    monkeypatch.setattr(
        "crm.ai.call_claude",
        lambda context: (
            {
                "reply": "أهلاً، ما التخصص الذي ترغب به؟",
                "summary": "Interested in Malaysia",
                "facts": [
                    {
                        "field": "degree_level",
                        "value": "Bachelor",
                        "confidence": 0.7,
                        "source_message_id": 1,
                    }
                ],
            },
            100,
            50,
        ),
    )
    response = crm_client.post(
        "/api/crm/conversations/1/suggestions", json={}, headers=headers
    )
    assert response.status_code == 202
    drain()
    with application.DATABASE_ENGINE.connect() as conn:
        assert (
            conn.execute(select(contacts.c.degree_level)).scalar_one()
            == "Verified master"
        )
        assert conn.execute(select(memory.c.verified)).scalar_one() is False
        assert conn.execute(select(suggestions.c.status)).scalar_one() == "READY"
        assert (
            conn.execute(select(func.count()).select_from(messages)).scalar_one() == 1
        )

    summary = crm_client.post(
        "/api/crm/conversations/1/suggestions",
        json={"kind": "SUMMARIZE"},
        headers=headers,
    )
    assert summary.status_code == 202
    drain()
    generated = crm_client.get("/api/crm/conversations/1/suggestions").json[0]
    assert generated["text"] == "Interested in Malaysia"
    assert generated["evidence"]["kind"] == "SUMMARIZE"

    def fail(context):
        raise RuntimeError("sensitive provider detail")

    monkeypatch.setattr("crm.ai.call_claude", fail)
    crm_client.post("/api/crm/conversations/1/suggestions", json={}, headers=headers)
    drain()
    rows = crm_client.get("/api/crm/conversations/1/suggestions").json
    assert rows[0]["status"] == "FAILED" and "sensitive" not in rows[0]["safe_error"]
