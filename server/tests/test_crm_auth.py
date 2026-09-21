from datetime import timedelta
import os
import uuid

import pytest
from sqlalchemy import select, update, create_engine, text
from sqlalchemy.engine import make_url
import app as application
from crm.auth import hasher
from crm.common import now
from crm.schema_v1 import metadata, staff_users, staff_sessions, audit_events


@pytest.fixture
def crm_client(client, monkeypatch):
    test_url = os.environ.get("CRM_TEST_DATABASE_URL")
    pg_engine = None
    admin_engine = None
    if test_url:
        parsed = make_url(test_url)
        if (
            parsed.host not in ("localhost", "127.0.0.1", "::1")
            or parsed.database != "najmuni_crm_test"
        ):
            raise RuntimeError(
                "CRM_TEST_DATABASE_URL must point to the isolated local najmuni_crm_test database"
            )
        schema = "crm_test_" + uuid.uuid4().hex
        admin_engine = create_engine(test_url, hide_parameters=True)
        with admin_engine.begin() as conn:
            conn.execute(text("CREATE SCHEMA " + schema))
        pg_engine = create_engine(
            parsed.update_query_dict({"options": "-csearch_path=" + schema}),
            hide_parameters=True,
        )
        monkeypatch.setattr(application, "DATABASE_ENGINE", pg_engine)
    metadata.create_all(application.DATABASE_ENGINE)
    with application.DATABASE_ENGINE.begin() as conn:
        for role in ("OWNER", "ADMIN", "COUNSELOR", "VIEWER"):
            conn.execute(
                staff_users.insert().values(
                    full_name=role,
                    email=role.lower() + "@example.test",
                    password_hash=hasher.hash("a-long-test-password"),
                    role=role,
                )
            )
    yield client
    if pg_engine:
        pg_engine.dispose()
        with admin_engine.begin() as conn:
            conn.execute(text("DROP SCHEMA " + schema + " CASCADE"))
        admin_engine.dispose()


def login(client, role="owner"):
    response = client.post(
        "/api/crm/auth/login",
        json={"email": role + "@example.test", "password": "a-long-test-password"},
    )
    assert response.status_code == 200, response.json
    return {"X-CSRF-Token": response.json["csrf_token"]}


def test_auth_csrf_logout_and_audit(crm_client):
    assert crm_client.get("/api/crm/auth/me").status_code == 401
    headers = login(crm_client)
    assert (
        "HttpOnly" in crm_client.get_cookie("najmuni_crm_dev").__repr__()
        or crm_client.get_cookie("najmuni_crm_dev").http_only
    )
    assert (
        crm_client.get("/api/crm/auth/me").json["csrf_token"] == headers["X-CSRF-Token"]
    )
    assert crm_client.post("/api/crm/auth/logout").status_code == 403
    assert crm_client.post("/api/crm/auth/logout", headers=headers).status_code == 200
    assert crm_client.get("/api/crm/auth/me").status_code == 401
    with application.DATABASE_ENGINE.connect() as conn:
        actions = conn.execute(select(audit_events.c.action)).scalars().all()
        assert actions == ["auth.login", "auth.logout"]


def test_production_session_cookie_is_secure_for_cross_subdomain_requests(
    crm_client, monkeypatch
):
    monkeypatch.setenv("CRM_ENV", "production")
    monkeypatch.setenv("RENDER", "true")
    response = crm_client.post(
        "/api/crm/auth/login",
        json={"email": "owner@example.test", "password": "a-long-test-password"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    cookie = response.headers["Set-Cookie"]
    assert cookie.startswith("__Host-najmuni_crm=")
    assert "Secure" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie
    assert "Path=/" in cookie
    assert "Domain=" not in cookie


def test_crm_cors_allows_credentialed_auth_and_preflight(crm_client):
    origin = "http://localhost:5173"
    response = crm_client.get("/api/crm/auth/me", headers={"Origin": origin})
    assert response.status_code == 401
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert response.headers["Access-Control-Allow-Credentials"] == "true"

    preflight = crm_client.options(
        "/api/crm/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["Access-Control-Allow-Origin"] == origin
    assert preflight.headers["Access-Control-Allow-Credentials"] == "true"
    assert "x-csrf-token" in preflight.headers["Access-Control-Allow-Headers"].lower()

    denied = crm_client.options(
        "/api/crm/auth/login",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "Access-Control-Allow-Origin" not in denied.headers


def test_roles_revocation_and_expiry(crm_client):
    headers = login(crm_client, "viewer")
    assert crm_client.post("/api/crm/team", json={}, headers=headers).status_code == 403
    headers = login(crm_client, "owner")
    assert (
        crm_client.post(
            "/api/crm/team",
            json={
                "full_name": "New counselor",
                "email": "new@example.test",
                "password": "a-new-long-password",
                "role": "COUNSELOR",
            },
            headers=headers,
        ).status_code
        == 201
    )
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            update(staff_sessions).values(expires_at=now() - timedelta(seconds=1))
        )
    assert crm_client.get("/api/crm/auth/me").status_code == 401


def test_login_rate_limit_and_origin(crm_client):
    assert (
        crm_client.post(
            "/api/crm/auth/login", json={}, headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    for _ in range(10):
        response = crm_client.post(
            "/api/crm/auth/login",
            json={"email": "owner@example.test", "password": "wrong"},
        )
        assert response.status_code == 401
    assert (
        crm_client.post(
            "/api/crm/auth/login",
            json={"email": "owner@example.test", "password": "wrong"},
        ).status_code
        == 429
    )


def test_admin_cannot_promote_owner(crm_client):
    headers = login(crm_client, "admin")
    assert (
        crm_client.post(
            "/api/crm/team", json={"role": "OWNER"}, headers=headers
        ).status_code
        == 403
    )
    assert (
        crm_client.patch(
            "/api/crm/team/1", json={"status": "INACTIVE"}, headers=headers
        ).status_code
        == 403
    )


def test_disabled_staff_session_revoked(crm_client):
    login(crm_client, "counselor")
    with application.DATABASE_ENGINE.begin() as conn:
        conn.execute(
            update(staff_users)
            .where(staff_users.c.role == "COUNSELOR")
            .values(status="INACTIVE")
        )
    assert crm_client.get("/api/crm/auth/me").status_code == 401
