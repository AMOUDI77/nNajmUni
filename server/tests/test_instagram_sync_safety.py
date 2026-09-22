import logging
from datetime import timedelta

import pytest
from sqlalchemy import func, select, update

import app as application
from crm.common import now
from crm.schema_v1 import contacts, identities, messages, social_accounts
from crm.schema_v5 import conversations, jobs
from integrations.instagram.client import ProviderError, encrypt, provider_request
from integrations.instagram.sync import SyncSafetyError, sync_account
from jobs.queue import claim
from jobs.worker import run_once
from test_crm_auth import crm_client, login
from test_instagram_onboarding import configure


def account(monkeypatch):
    configure(monkeypatch)
    with application.DATABASE_ENGINE.begin() as conn:
        return conn.execute(
            social_accounts.insert().values(
                provider="instagram",
                provider_account_id="business-1",
                username="najmuni",
                encrypted_token=encrypt("provider-token"),
                status="CONNECTED",
            )
        ).inserted_primary_key[0]


def test_real_list_shape_fetches_details_and_preserves_provider_ids(
    crm_client, monkeypatch
):
    aid = account(monkeypatch)
    headers = login(crm_client)

    def provider(method, url, **kwargs):
        if url.endswith("/business-1/conversations"):
            return {"data": [{"id": "thread-real"}]}
        if url.endswith("/thread-real"):
            return {
                "id": "thread-real",
                "participants": {
                    "data": [{"id": "business-1"}, {"id": "student-1"}]
                },
            }
        if url.endswith("/thread-real/messages"):
            return {"data": [{"id": "message-real"}]}
        if url.endswith("/message-real"):
            return {
                "id": "message-real",
                "created_time": "2026-09-20T10:00:00Z",
                "from": {"id": "student-1", "username": "student"},
                "to": {"data": [{"id": "business-1"}]},
                "message": "private body",
            }
        raise AssertionError(url)

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    started = crm_client.post(
        f"/api/crm/integrations/instagram/{aid}/sync", json={}, headers=headers
    )
    assert run_once(application.DATABASE_ENGINE)
    status = crm_client.get(
        f"/api/crm/integrations/instagram/{aid}/sync/{started.json['job_id']}"
    ).json
    assert status["status"] == "SUCCEEDED"
    assert status["progress"]["state"] == "COMPLETED"
    with application.DATABASE_ENGINE.connect() as conn:
        conversation = conn.execute(select(conversations)).mappings().one()
        message = conn.execute(select(messages)).mappings().one()
    assert conversation["provider_conversation_id"] == "thread-real"
    assert message["provider_message_id"] == "message-real"
    assert message["direction"] == "INBOUND"


def test_failure_keeps_committed_batch_and_retry_is_idempotent(crm_client, monkeypatch):
    aid = account(monkeypatch)
    headers = login(crm_client)
    fail_second = True

    def provider(method, url, **kwargs):
        if url.endswith("/business-1/conversations"):
            return {
                "data": [
                    {
                        "id": "thread-1",
                        "participants": {"data": [{"id": "student-1"}]},
                    },
                    {
                        "id": "thread-2",
                        "participants": {"data": [{"id": "student-2"}]},
                    },
                ]
            }
        if url.endswith("/thread-1/messages"):
            return {"data": [_message("message-1", "student-1")]}
        if url.endswith("/thread-2/messages"):
            if fail_second:
                raise ProviderError("temporary", code="provider_unavailable")
            return {"data": [_message("message-2", "student-2")]}
        raise AssertionError(url)

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    started = crm_client.post(
        f"/api/crm/integrations/instagram/{aid}/sync", json={}, headers=headers
    )
    jid = started.json["job_id"]
    assert run_once(application.DATABASE_ENGINE)
    with application.DATABASE_ENGINE.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(conversations)) == 1
        assert conn.scalar(select(func.count()).select_from(messages)) == 1
        failed = conn.execute(select(jobs).where(jobs.c.id == jid)).mappings().one()
    assert failed["status"] == "RETRYING"
    assert failed["payload"]["progress"]["imported_conversations"] == 1
    assert failed["payload"]["progress"]["state"] == "RETRYING"

    fail_second = False
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            update(jobs).where(jobs.c.id == jid).values(next_attempt_at=now())
        )
    assert run_once(application.DATABASE_ENGINE)
    with application.DATABASE_ENGINE.connect() as conn:
        completed = conn.execute(select(jobs).where(jobs.c.id == jid)).mappings().one()
        assert conn.scalar(select(func.count()).select_from(contacts)) == 2
        assert conn.scalar(select(func.count()).select_from(identities)) == 2
        assert conn.scalar(select(func.count()).select_from(conversations)) == 2
        assert conn.scalar(select(func.count()).select_from(messages)) == 2
    assert completed["status"] == "SUCCEEDED"
    assert completed["payload"]["result"]["skipped_existing"] == 1


def _message(mid, sender):
    return {
        "id": mid,
        "created_time": "2026-09-20T10:00:00Z",
        "from": {"id": sender},
        "message": "private body",
    }


def test_repeated_cursor_is_stopped(crm_client, monkeypatch):
    aid = account(monkeypatch)

    def provider(method, url, **kwargs):
        if url.endswith("/business-1/conversations"):
            return {"data": [], "paging": {"cursors": {"after": "same"}}}
        raise AssertionError(url)

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    with pytest.raises(SyncSafetyError, match="repeated pagination cursor"):
        sync_account(application.DATABASE_ENGINE, aid)


def test_page_limit_stops_unbounded_history(crm_client, monkeypatch):
    aid = account(monkeypatch)
    monkeypatch.setattr("integrations.instagram.sync.MAX_CONVERSATION_PAGES", 1)

    def provider(method, url, **kwargs):
        return {"data": [], "paging": {"cursors": {"after": "more"}}}

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    with pytest.raises(SyncSafetyError, match="safety limit"):
        sync_account(application.DATABASE_ENGINE, aid)


def test_multiple_empty_pages_report_history_access(crm_client, monkeypatch):
    aid = account(monkeypatch)
    monkeypatch.setattr(
        "integrations.instagram.sync.MAX_CONSECUTIVE_EMPTY_CONVERSATION_PAGES", 3
    )
    calls = 0

    def provider(method, url, **kwargs):
        nonlocal calls
        calls += 1
        return {"data": [], "paging": {"cursors": {"after": f"page-{calls}"}}}

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    with pytest.raises(ProviderError) as caught:
        sync_account(application.DATABASE_ENGINE, aid)
    assert caught.value.code == "history_access"
    assert calls == 3


def test_non_retryable_job_failure_clears_running_state(crm_client, monkeypatch):
    aid = account(monkeypatch)
    headers = login(crm_client)
    started = crm_client.post(
        f"/api/crm/integrations/instagram/{aid}/sync", json={}, headers=headers
    )
    jid = started.json["job_id"]
    def fail(*args, **kwargs):
        raise ProviderError("secret provider detail", code="provider_permission")

    monkeypatch.setattr("integrations.instagram.sync.provider_request", fail)
    assert run_once(application.DATABASE_ENGINE)
    with application.DATABASE_ENGINE.connect() as conn:
        failed = conn.execute(select(jobs).where(jobs.c.id == jid)).mappings().one()
    assert failed["status"] == "FAILED"
    assert failed["attempts"] == 1
    assert failed["completed_at"] is not None
    assert failed["lease_token"] is None
    assert failed["safe_error"] == (
        "Instagram permission was denied; review the approved permissions"
    )
    assert "secret provider detail" not in str(failed)
    assert failed["payload"]["progress"]["state"] == "FAILED"


def test_stale_running_job_is_reclaimed_but_fresh_heartbeat_is_not(
    crm_client, monkeypatch
):
    old = now() - timedelta(minutes=10)
    with application.DATABASE_ENGINE.begin() as conn:
        stale_id = conn.execute(
            jobs.insert().values(
                kind="test",
                dedupe_key="stale",
                payload={},
                status="PROCESSING",
                attempts=1,
                started_at=old,
                heartbeat_at=old,
                lease_token="old-lease",
            )
        ).inserted_primary_key[0]
        fresh_id = conn.execute(
            jobs.insert().values(
                kind="test",
                dedupe_key="fresh",
                payload={},
                status="PROCESSING",
                attempts=1,
                started_at=old,
                heartbeat_at=now(),
                lease_token="fresh-lease",
            )
        ).inserted_primary_key[0]
    reclaimed = claim(application.DATABASE_ENGINE)
    assert reclaimed["id"] == stale_id
    with application.DATABASE_ENGINE.connect() as conn:
        assert conn.scalar(select(jobs.c.status).where(jobs.c.id == fresh_id)) == "PROCESSING"


def test_large_multi_page_sync(crm_client, monkeypatch):
    aid = account(monkeypatch)

    def provider(method, url, **kwargs):
        params = kwargs.get("params") or {}
        if url.endswith("/business-1/conversations"):
            start = 100 if params.get("after") == "page-2" else 0
            stop = 150 if start else 100
            data = [
                {
                    "id": f"thread-{index}",
                    "participants": {"data": [{"id": f"student-{index}"}]},
                }
                for index in range(start, stop)
            ]
            return (
                {"data": data}
                if start
                else {"data": data, "paging": {"cursors": {"after": "page-2"}}}
            )
        if "/thread-" in url and url.endswith("/messages"):
            index = url.rsplit("/thread-", 1)[1].split("/", 1)[0]
            return {"data": [_message(f"message-{index}", f"student-{index}")]}
        raise AssertionError(url)

    monkeypatch.setattr("integrations.instagram.sync.provider_request", provider)
    result = sync_account(application.DATABASE_ENGINE, aid)
    assert result["pages_processed"] == 152
    assert result["conversations_seen"] == 150
    assert result["imported_conversations"] == 150
    assert result["imported_messages"] == 150


def test_provider_http_info_logs_never_include_query_secrets(caplog, monkeypatch):
    secret = "do-not-log-this-token"

    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"ok": True}

    def request(method, url, **kwargs):
        logging.getLogger("httpx").info(
            "HTTP Request: %s?access_token=%s", url, secret
        )
        return Response()

    monkeypatch.setattr("httpx.request", request)
    caplog.set_level(logging.INFO)
    assert provider_request("GET", "https://graph.instagram.com/test")["ok"]
    assert secret not in caplog.text
