import hashlib
import hmac
import time
import pytest
from cryptography.fernet import Fernet
from sqlalchemy import select, update
import app as application
from crm.schema_v1 import (
    social_accounts,
    messages,
    conversations,
    contacts,
    webhook_events,
)
from crm.schema_v3 import conversation_sources
from integrations.instagram.client import encrypt, decrypt, is_mock, ProviderError
from test_crm_auth import crm_client, login
from test_crm_ingest import send
from test_crm_automations_ai import drain


def test_token_encryption_and_production_mock_guard(crm_client, monkeypatch):
    monkeypatch.setenv("META_TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    encrypted = encrypt("fixture-access-token")
    assert (
        "fixture-access-token" not in encrypted
        and decrypt(encrypted) == "fixture-access-token"
    )
    with application.app.app_context():
        monkeypatch.setenv("META_PROVIDER_MODE", "mock")
        monkeypatch.setitem(application.app.config, "TESTING", False)
        monkeypatch.setenv("CRM_ENV", "production")
        with pytest.raises(ProviderError):
            is_mock()


def test_comment_private_reply_waits_for_user_dm(crm_client, monkeypatch):
    monkeypatch.setenv("META_APP_SECRET", "test-webhook-secret")
    monkeypatch.setenv("META_PROVIDER_MODE", "mock")
    headers = login(crm_client)
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            social_accounts.insert().values(
                provider="instagram", provider_account_id="business-1"
            )
        )
    rule = crm_client.post(
        "/api/crm/automations",
        headers=headers,
        json={
            "name": "Reel inquiry",
            "trigger": {
                "kind": "COMMENT",
                "keywords": ["ماليزيا"],
                "media_id": "reel-1",
            },
            "steps": [
                {
                    "action": "ASK_QUESTION",
                    "text": "أهلاً! ما المرحلة الدراسية؟",
                    "field": "degree_level",
                },
                {"action": "SEND_MESSAGE", "text": "شكراً، سيتابع معك المستشار."},
            ],
        },
    ).json["id"]
    crm_client.patch(
        "/api/crm/automations/" + str(rule), json={"status": "ACTIVE"}, headers=headers
    )
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "business-1",
                "time": int(time.time()),
                "changes": [
                    {
                        "field": "comments",
                        "value": {
                            "id": "comment-1",
                            "from": {"id": "prospect-1", "username": "Student"},
                            "media": {
                                "id": "reel-1",
                                "media_product_type": "REELS",
                                "caption": "Study in Malaysia",
                            },
                            "text": "ماليزيا",
                        },
                    }
                ],
            }
        ],
    }
    assert send(crm_client, payload).status_code == 200
    drain()
    with application.DATABASE_ENGINE.connect() as conn:
        out = (
            conn.execute(select(messages).where(messages.c.direction == "OUTBOUND"))
            .mappings()
            .all()
        )
        assert (
            len(out) == 1
            and out[0]["status"] == "SENT"
            and out[0]["private_reply_comment_id"] == "comment-1"
        )
        assert (
            conn.execute(select(conversations.c.last_inbound_at)).scalar_one() is None
        )
        source = conn.execute(select(conversation_sources)).mappings().one()
        assert source["source_type"] == "instagram_reel_comment"
        assert source["keyword"] == "ماليزيا"
        assert source["automation_name"] == "Reel inquiry"
    assert (
        crm_client.post(
            "/api/crm/conversations/1/messages",
            json={"text": "Cannot cold DM", "request_id": "bad"},
            headers=headers,
        ).status_code
        == 400
    )
    send(crm_client, payload)
    drain()
    with application.DATABASE_ENGINE.connect() as conn:
        assert (
            len(
                conn.execute(
                    select(messages).where(messages.c.direction == "OUTBOUND")
                ).all()
            )
            == 1
        )


def test_oauth_state_invalid_no_provider_call(crm_client, monkeypatch):
    login(crm_client)

    def forbidden(*args, **kwargs):
        raise AssertionError("Provider must not be called")

    monkeypatch.setattr("integrations.instagram.oauth.provider_request", forbidden)
    assert (
        crm_client.get(
            "/api/crm/integrations/instagram/callback?state=invalid&code=invalid"
        ).status_code
        == 403
    )


def test_viewer_cannot_change_automation_knowledge_or_settings(crm_client):
    headers = login(crm_client, "viewer")
    for path in ("/automations", "/knowledge", "/integrations/instagram/connect"):
        assert (
            crm_client.post("/api/crm" + path, json={}, headers=headers).status_code
            == 403
        )
    assert (
        crm_client.patch(
            "/api/crm/settings", json={"ai_mode": "OFF"}, headers=headers
        ).status_code
        == 403
    )


def test_analytics_reports_persisted_counts(crm_client):
    headers = login(crm_client)
    crm_client.post(
        "/api/crm/contacts", json={"display_name": "Prospect"}, headers=headers
    )
    crm_client.post("/api/crm/contacts/1/lead", json={}, headers=headers)
    data = crm_client.get("/api/crm/analytics").json
    assert data["cards"]["linked_leads"] == 1
    assert data["cards"]["conversations"] == 0
    assert data["cards"]["average_first_response_seconds"] is None
