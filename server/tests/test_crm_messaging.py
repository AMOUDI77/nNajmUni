import io

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


def test_mock_voice_message_upload_delivery_and_idempotency(
    crm_client, monkeypatch, tmp_path
):
    headers = setup_conversation(crm_client, monkeypatch)
    media = tmp_path / "voice"
    monkeypatch.setenv("CRM_MEDIA_DIR", str(media))

    def payload():
        return {
            "audio": (io.BytesIO(b"mock-webm-audio"), "voice.webm", "audio/webm"),
            "duration_ms": "18000",
            "request_id": "voice-request-1",
            "close_after_send": "false",
        }

    first = crm_client.post(
        "/api/crm/conversations/1/audio", data=payload(), headers=headers
    )
    repeated = crm_client.post(
        "/api/crm/conversations/1/audio", data=payload(), headers=headers
    )
    assert first.status_code == 202, first.json
    assert repeated.status_code == 202
    assert first.json["id"] == repeated.json["id"]
    assert len(list(media.iterdir())) == 1
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    message = crm_client.get("/api/crm/conversations/1/messages").json["items"][-1]
    assert message["message_type"] == "audio"
    assert message["status"] == "SENT"
    assert message["provider_message_id"].startswith("mock-audio-")
    assert message["attachments"][0]["duration_ms"] == 18000
    audio = crm_client.get(message["attachments"][0]["url"])
    assert audio.status_code == 200 and audio.data == b"mock-webm-audio"


def test_live_provider_refuses_recorded_voice_without_storing_file(
    crm_client, monkeypatch, tmp_path
):
    headers = setup_conversation(crm_client, monkeypatch)
    media = tmp_path / "voice"
    monkeypatch.setenv("CRM_MEDIA_DIR", str(media))
    monkeypatch.setenv("META_PROVIDER_MODE", "live")
    response = crm_client.post(
        "/api/crm/conversations/1/audio",
        data={
            "audio": (io.BytesIO(b"audio"), "voice.webm", "audio/webm"),
            "duration_ms": "1000",
            "request_id": "live-voice",
            "close_after_send": "false",
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert "not enabled" in response.json["error"]
    assert not media.exists()


def test_mock_image_upload_validates_content_and_preserves_delivery_state(
    crm_client, monkeypatch, tmp_path
):
    headers = setup_conversation(crm_client, monkeypatch)
    media = tmp_path / "media"
    monkeypatch.setenv("CRM_MEDIA_DIR", str(media))
    detail = crm_client.get("/api/crm/conversations/1").json
    assert detail["capabilities"]["canSendImage"] is True
    response = crm_client.post(
        "/api/crm/conversations/1/media",
        data={
            "file": (io.BytesIO(b"\x89PNG\r\n\x1a\nmock-image"), "student.png", "image/png"),
            "text": "Here is the guide",
            "request_id": "image-request-1",
            "close_after_send": "false",
        },
        headers=headers,
    )
    assert response.status_code == 202, response.json
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    message = crm_client.get("/api/crm/conversations/1/messages").json["items"][-1]
    assert message["message_type"] == "image" and message["status"] == "SENT"
    assert message["attachments"][0]["filename"] == "student.png"
    downloaded = crm_client.get(message["attachments"][0]["url"])
    assert downloaded.status_code == 200
    assert downloaded.headers["X-Content-Type-Options"] == "nosniff"


def test_media_upload_rejects_spoofed_and_unsupported_files(
    crm_client, monkeypatch, tmp_path
):
    headers = setup_conversation(crm_client, monkeypatch)
    monkeypatch.setenv("CRM_MEDIA_DIR", str(tmp_path / "media"))
    response = crm_client.post(
        "/api/crm/conversations/1/media",
        data={
            "file": (io.BytesIO(b"not really an image"), "attack.png", "image/png"),
            "request_id": "bad-media",
            "close_after_send": "false",
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json["error"] == "This file type cannot be sent through Instagram"
    assert not (tmp_path / "media").exists()


def test_media_provider_failure_stays_failed_and_does_not_close(
    crm_client, monkeypatch, tmp_path
):
    headers = setup_conversation(crm_client, monkeypatch)
    monkeypatch.setenv("CRM_MEDIA_DIR", str(tmp_path / "media"))
    response = crm_client.post(
        "/api/crm/conversations/1/media",
        data={
            "file": (io.BytesIO(b"\x89PNG\r\n\x1a\nmock-image"), "student.png", "image/png"),
            "request_id": "failed-image",
            "close_after_send": "true",
        },
        headers=headers,
    )
    monkeypatch.setattr(
        "crm.messaging.send_media",
        lambda *args: (_ for _ in ()).throw(ProviderError("Media rejected")),
    )
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    thread = crm_client.get("/api/crm/conversations/1/messages").json["items"]
    assert thread[-1]["status"] == "FAILED"
    assert crm_client.get("/api/crm/conversations/1").json["status"] == "OPEN"


def test_send_and_close_waits_for_provider_acceptance(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)
    response = crm_client.post(
        "/api/crm/conversations/1/messages",
        json={"text": "Done", "request_id": "close-after", "close_after_send": True},
        headers=headers,
    )
    assert response.status_code == 202
    assert crm_client.get("/api/crm/conversations/1").json["status"] == "OPEN"
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    assert crm_client.get("/api/crm/conversations/1").json["status"] == "CLOSED"
    context = crm_client.get("/api/crm/conversations/1/context").json
    assert any("Reply sent" in event["text"] for event in context["events"])
    assert send(crm_client, envelope("message-after-close")).status_code == 200
    with application.app.app_context():
        assert run_once(application.DATABASE_ENGINE)
    assert crm_client.get("/api/crm/conversations/1").json["status"] == "OPEN"
    context = crm_client.get("/api/crm/conversations/1/context").json
    assert any("Closed → Open" in event["text"] for event in context["events"])


def test_only_failed_message_can_be_retried(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)

    def fail(*args):
        raise ProviderError("Provider rejected request")

    monkeypatch.setattr("crm.messaging.send_message", fail)
    mid = crm_client.post(
        "/api/crm/conversations/1/messages",
        json={"text": "Retry me", "request_id": "retry-failed"},
        headers=headers,
    ).json["id"]
    with application.app.app_context():
        run_once(application.DATABASE_ENGINE)
    assert crm_client.post(
        f"/api/crm/conversations/1/messages/{mid}/retry", json={}, headers=headers
    ).status_code == 200
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(update(messages).where(messages.c.id == mid).values(status="UNCERTAIN"))
    assert crm_client.post(
        f"/api/crm/conversations/1/messages/{mid}/retry", json={}, headers=headers
    ).status_code == 400


def test_reminders_context_and_inbox_filters(crm_client, monkeypatch):
    headers = setup_conversation(crm_client, monkeypatch)
    created = crm_client.post(
        "/api/crm/conversations/1/reminders",
        json={"preset": "tomorrow"},
        headers=headers,
    )
    assert created.status_code == 201, created.json
    context = crm_client.get("/api/crm/conversations/1/context").json
    assert context["source"]["source_type"] == "instagram_dm"
    assert context["reminders"][0]["status"] == "OPEN"
    assert any(event["event_type"] == "reminder_set" for event in context["events"])
    rows = crm_client.get("/api/crm/conversations?view=reminders").json["items"]
    assert len(rows) == 1 and rows[0]["reminder_at"]
    assert crm_client.patch(
        f"/api/crm/conversations/1/reminders/{created.json['id']}",
        json={"status": "DONE"},
        headers=headers,
    ).status_code == 200
    assert crm_client.get("/api/crm/conversations?view=reminders").json["items"] == []
