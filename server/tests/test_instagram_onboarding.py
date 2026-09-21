from urllib.parse import parse_qs, urlparse

from cryptography.fernet import Fernet
from sqlalchemy import func, select

import app as application
from crm.schema_v1 import contacts, conversations, identities, messages, social_accounts
from integrations.instagram.client import encrypt
from jobs.worker import run_once
from test_crm_auth import crm_client, login


META_KEYS = (
    "META_APP_ID",
    "META_APP_SECRET",
    "META_API_VERSION",
    "META_INSTAGRAM_REDIRECT_URI",
    "META_WEBHOOK_VERIFY_TOKEN",
    "META_TOKEN_ENCRYPTION_KEY",
)


def configure(monkeypatch):
    values = {
        "META_APP_ID": "123456789",
        "META_APP_SECRET": "test-app-secret",
        "META_API_VERSION": "v25.0",
        "META_INSTAGRAM_REDIRECT_URI": "https://api.najmuni.com/api/crm/integrations/instagram/callback",
        "META_WEBHOOK_VERIFY_TOKEN": "test-verify-token",
        "META_TOKEN_ENCRYPTION_KEY": Fernet.generate_key().decode(),
        "CRM_ALLOWED_ORIGINS": "https://najmuni.com",
        "CRM_PUBLIC_URL": "https://najmuni.com",
    }
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    return values


def start_oauth(client, headers):
    response = client.post(
        "/api/crm/integrations/instagram/connect", json={}, headers=headers
    )
    assert response.status_code == 200
    parsed = urlparse(response.json["url"])
    assert parsed.scheme == "https"
    assert parsed.netloc == "www.instagram.com"
    return parse_qs(parsed.query)["state"][0]


def test_readiness_distinguishes_platform_setup_from_account_connection(
    crm_client, monkeypatch
):
    headers = login(crm_client)
    for key in META_KEYS:
        monkeypatch.delenv(key, raising=False)
    missing = crm_client.get("/api/crm/integrations/instagram")
    assert missing.status_code == 200
    assert missing.json["configured"] is False
    assert missing.json["connected"] is False
    assert "secret" not in str(missing.json).lower()

    configure(monkeypatch)
    ready = crm_client.get("/api/crm/integrations/instagram")
    assert ready.json["configured"] is True
    assert ready.json["connected"] is False
    assert start_oauth(crm_client, headers)


def test_oauth_cancel_redirects_safely_without_calling_meta(
    crm_client, monkeypatch
):
    configure(monkeypatch)
    headers = login(crm_client)
    state = start_oauth(crm_client, headers)

    def forbidden(*args, **kwargs):
        raise AssertionError("Meta must not be called after cancellation")

    monkeypatch.setattr("integrations.instagram.oauth.provider_request", forbidden)
    response = crm_client.get(
        "/api/crm/integrations/instagram/callback",
        query_string={"state": state, "error": "access_denied"},
    )
    assert response.status_code == 302
    assert response.location == (
        "https://najmuni.com/crm/settings/integrations?instagram=cancelled"
    )


def test_oauth_success_encrypts_token_and_reports_connected(
    crm_client, monkeypatch
):
    configure(monkeypatch)
    headers = login(crm_client)
    state = start_oauth(crm_client, headers)
    replies = iter(
        [
            {"access_token": "short-token"},
            {"access_token": "long-token", "expires_in": 3600},
            {"user_id": "1234567890", "username": "najmuni"},
            {"success": True},
        ]
    )
    monkeypatch.setattr(
        "integrations.instagram.oauth.provider_request",
        lambda *args, **kwargs: next(replies),
    )
    response = crm_client.get(
        "/api/crm/integrations/instagram/callback",
        query_string={"state": state, "code": "provider-code"},
    )
    assert response.status_code == 302
    assert response.location.endswith("?instagram=connected")
    with application.DATABASE_ENGINE.connect() as conn:
        account = conn.execute(select(social_accounts)).mappings().one()
        assert account["encrypted_token"] != "long-token"
        assert account["status"] == "CONNECTED"
    status = crm_client.get("/api/crm/integrations/instagram").json
    assert status["connected"] is True
    assert status["account_username"] == "najmuni"
    assert status["accounts"][0]["connection_health"] == "HEALTHY"
    assert status["accounts"][0]["permissions"] == {
        "comments": True,
        "messages": True,
    }


def test_conversation_sync_paginates_and_is_idempotent(crm_client, monkeypatch):
    configure(monkeypatch)
    headers = login(crm_client)
    with application.DATABASE_ENGINE.begin() as conn:
        account_id = conn.execute(
            social_accounts.insert().values(
                provider="instagram",
                provider_account_id="business-1",
                username="najmuni",
                encrypted_token=encrypt("provider-token"),
                status="CONNECTED",
            )
        ).inserted_primary_key[0]

    calls = []

    def provider(method, url, **kwargs):
        calls.append((url, dict(kwargs.get("params") or {})))
        params = kwargs.get("params") or {}
        if url.endswith("/business-1/conversations"):
            if params.get("after") == "conversation-page-2":
                return {"data": []}
            return {
                "data": [
                    {
                        "id": "thread-1",
                        "participants": {
                            "data": [
                                {"id": "business-1", "username": "najmuni"},
                                {"id": "student-1", "username": "student"},
                            ]
                        },
                    }
                ],
                "paging": {"cursors": {"after": "conversation-page-2"}},
            }
        if url.endswith("/thread-1/messages"):
            if params.get("after") == "message-page-2":
                return {
                    "data": [
                        {
                            "id": "message-2",
                            "created_time": "2026-09-20T11:00:00+0000",
                            "from": {"id": "business-1"},
                            "message": "Welcome to NajmUni",
                        }
                    ]
                }
            return {
                "data": [
                    {
                        "id": "message-1",
                        "created_time": "2026-09-20T10:00:00Z",
                        "from": {"id": "student-1"},
                        "message": "Hello",
                    }
                ],
                "paging": {"cursors": {"after": "message-page-2"}},
            }
        raise AssertionError(url)

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    first = crm_client.post(
        f"/api/crm/integrations/instagram/{account_id}/sync",
        json={},
        headers=headers,
    )
    assert first.status_code == 202
    assert run_once(application.DATABASE_ENGINE) is True
    result = crm_client.get(
        f"/api/crm/integrations/instagram/{account_id}/sync/{first.json['job_id']}"
    ).json
    assert result["status"] == "SUCCEEDED"
    assert result["result"] == {
        "imported_conversations": 1,
        "imported_messages": 2,
        "skipped_existing": 0,
        "unavailable": 0,
    }

    second = crm_client.post(
        f"/api/crm/integrations/instagram/{account_id}/sync",
        json={},
        headers=headers,
    )
    assert run_once(application.DATABASE_ENGINE) is True
    repeated = crm_client.get(
        f"/api/crm/integrations/instagram/{account_id}/sync/{second.json['job_id']}"
    ).json["result"]
    assert repeated["imported_conversations"] == 0
    assert repeated["imported_messages"] == 0
    assert repeated["skipped_existing"] == 2
    assert any(params.get("after") for _, params in calls)
    with application.DATABASE_ENGINE.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(contacts)) == 1
        assert conn.scalar(select(func.count()).select_from(identities)) == 1
        assert conn.scalar(select(func.count()).select_from(conversations)) == 1
        assert conn.scalar(select(func.count()).select_from(messages)) == 2
