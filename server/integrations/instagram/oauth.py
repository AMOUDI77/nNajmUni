"""Server-side Instagram Login authorization and encrypted connection storage."""

import os
import re
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlparse

from crm.auth import digest, require_staff
from crm.common import audit, engine, now, output
from crm.schema_v1 import jobs, oauth_states, social_accounts
from flask import Blueprint, g, jsonify, redirect, request
from sqlalchemy import select, update
from werkzeug.exceptions import BadRequest, Forbidden, ServiceUnavailable

from .client import ProviderError, encrypt, graph_url, provider_request

api = Blueprint(
    "instagram_oauth", __name__, url_prefix="/api/crm/integrations/instagram"
)
SCOPES = (
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
)
REQUIRED_CONFIGURATION = (
    "META_APP_ID",
    "META_APP_SECRET",
    "META_API_VERSION",
    "META_INSTAGRAM_REDIRECT_URI",
    "META_WEBHOOK_VERIFY_TOKEN",
    "META_TOKEN_ENCRYPTION_KEY",
)


def configured():
    if not all(os.environ.get(key, "").strip() for key in REQUIRED_CONFIGURATION):
        return False
    if not re.fullmatch(r"v\d+\.\d+", os.environ["META_API_VERSION"]):
        return False
    callback = urlparse(os.environ["META_INSTAGRAM_REDIRECT_URI"])
    if callback.scheme != "https" or callback.path != "/api/crm/integrations/instagram/callback":
        return False
    try:
        encrypt("configuration-check")
    except ProviderError:
        return False
    return True


def settings_redirect(result):
    allowed = {
        value.strip().rstrip("/")
        for value in (
            os.environ.get("CRM_ALLOWED_ORIGINS", "").strip()
            or os.environ.get("ALLOWED_ORIGINS", "")
        ).split(",")
        if value.strip().startswith("https://")
    }
    base = os.environ.get("CRM_PUBLIC_URL", "").strip().rstrip("/")
    parsed = urlparse(base)
    if not base or parsed.scheme + "://" + parsed.netloc not in allowed:
        base = sorted(allowed)[0] if allowed else ""
    path = "/crm/settings/integrations?instagram=" + result
    return redirect(base + path if base else path)


@api.get("")
@require_staff()
def status():
    with engine().connect() as conn:
        rows = (
            conn.execute(
                select(
                    social_accounts.c.id,
                    social_accounts.c.username,
                    social_accounts.c.status,
                    social_accounts.c.token_expires_at,
                    social_accounts.c.last_webhook_at,
                ).where(social_accounts.c.provider == "instagram")
            )
            .mappings()
            .all()
        )
        sync_rows = (
            conn.execute(
                select(
                    jobs.c.id,
                    jobs.c.status,
                    jobs.c.payload,
                    jobs.c.completed_at,
                    jobs.c.safe_error,
                )
                .where(jobs.c.kind == "instagram_sync")
                .order_by(jobs.c.id.desc())
            )
            .mappings()
            .all()
        )
    sync_by_account = {}
    successful_sync_by_account = {}
    for row in sync_rows:
        account_id = (row["payload"] or {}).get("account_id")
        if account_id not in sync_by_account:
            sync_by_account[account_id] = row
        if row["status"] == "SUCCEEDED" and account_id not in successful_sync_by_account:
            successful_sync_by_account[account_id] = row
    accounts = []
    for row in rows:
        account = dict(row)
        sync = sync_by_account.get(row["id"])
        expired = bool(row["token_expires_at"] and row["token_expires_at"] <= now())
        account.update(
            connection_health=(
                "HEALTHY"
                if row["status"] == "CONNECTED" and not expired
                else "RECONNECT_REQUIRED"
            ),
            permissions={
                "messages": row["status"] == "CONNECTED" and not expired,
                "comments": row["status"] == "CONNECTED" and not expired,
            },
            last_sync_at=(
                successful_sync_by_account[row["id"]]["completed_at"]
                if row["id"] in successful_sync_by_account
                else None
            ),
            sync=(
                {
                    "id": sync["id"],
                    "status": sync["status"],
                    "result": (sync["payload"] or {}).get("result"),
                    "progress": (sync["payload"] or {}).get("progress"),
                    "safe_error": sync["safe_error"],
                }
                if sync
                else None
            ),
        )
        accounts.append(account)
    return output(
        {
            "accounts": accounts,
            "configured": configured(),
            "connected": any(a["status"] == "CONNECTED" for a in accounts),
            "account_username": next(
                (a["username"] for a in accounts if a["status"] == "CONNECTED"),
                None,
            ),
            "mode": os.environ.get("META_PROVIDER_MODE", "live"),
        }
    )


@api.post("/connect")
@require_staff("OWNER", "ADMIN")
def connect():
    if not configured():
        raise ServiceUnavailable("Instagram platform setup is not complete")
    app_id = os.environ.get("META_APP_ID", "")
    callback = os.environ.get("META_INSTAGRAM_REDIRECT_URI", "")
    if not app_id or not callback.startswith("https://"):
        raise ServiceUnavailable(
            "Configure Instagram app credentials and an HTTPS callback first"
        )
    state = secrets.token_urlsafe(48)
    with engine().begin() as conn:
        conn.execute(
            oauth_states.insert().values(
                state_hash=digest(state),
                user_id=g.staff["id"],
                session_id=g.crm_session["id"],
                expires_at=now() + timedelta(minutes=10),
            )
        )
    return jsonify(
        url="https://www.instagram.com/oauth/authorize?"
        + urlencode(
            {
                "client_id": app_id,
                "redirect_uri": callback,
                "response_type": "code",
                "scope": ",".join(SCOPES),
                "state": state,
                "enable_fb_login": "0",
                "force_authentication": "1",
            }
        )
    )


@api.get("/callback")
@require_staff("OWNER", "ADMIN")
def callback():
    state = request.args.get("state", "")
    with engine().begin() as conn:
        row = (
            conn.execute(
                select(oauth_states)
                .where(
                    oauth_states.c.state_hash == digest(state),
                    oauth_states.c.session_id == g.crm_session["id"],
                    oauth_states.c.user_id == g.staff["id"],
                    oauth_states.c.used_at.is_(None),
                    oauth_states.c.expires_at > now(),
                )
                .with_for_update()
            )
            .mappings()
            .first()
        )
        if not row:
            raise Forbidden("Instagram connection expired. Start again from Settings")
        conn.execute(
            update(oauth_states)
            .where(oauth_states.c.id == row["id"])
            .values(used_at=now())
        )
    if request.args.get("error"):
        return settings_redirect("cancelled")
    code = request.args.get("code", "")
    if not code or len(code) > 4000:
        raise BadRequest("Missing authorization code")
    try:
        short = provider_request(
            "POST",
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": os.environ.get("META_APP_ID"),
                "client_secret": os.environ.get("META_APP_SECRET"),
                "grant_type": "authorization_code",
                "redirect_uri": os.environ.get("META_INSTAGRAM_REDIRECT_URI"),
                "code": code,
            },
        )
        token = short.get("access_token")
        if not isinstance(token, str):
            raise ProviderError("Instagram did not provide an access token")
        long = provider_request(
            "GET",
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": os.environ.get("META_APP_SECRET"),
                "access_token": token,
            },
        )
        token = long.get("access_token")
        if not isinstance(token, str):
            raise ProviderError("Instagram token exchange failed")
        identity = provider_request(
            "GET",
            graph_url("me"),
            headers={"Authorization": "Bearer " + token},
            params={"fields": "user_id,username"},
        )
        account_id = str(identity.get("user_id") or identity.get("id") or "")
        if not account_id.isdigit() or not identity.get("username"):
            raise ProviderError("Unable to verify Instagram account identity")
        provider_request(
            "POST",
            graph_url(account_id + "/subscribed_apps"),
            headers={"Authorization": "Bearer " + token},
            data={"subscribed_fields": "messages,messaging_postbacks,comments"},
        )
        encrypted = encrypt(token)
    except ProviderError:
        return settings_redirect("error")
    with engine().begin() as conn:
        existing = conn.execute(
            select(social_accounts.c.id).where(
                social_accounts.c.provider == "instagram",
                social_accounts.c.provider_account_id == account_id,
            )
        ).scalar_one_or_none()
        values = {
            "username": identity["username"],
            "encrypted_token": encrypted,
            "status": "CONNECTED",
            "token_expires_at": now()
            + timedelta(seconds=min(int(long.get("expires_in", 3600)), 60 * 86400)),
        }
        if existing:
            conn.execute(
                update(social_accounts)
                .where(social_accounts.c.id == existing)
                .values(**values)
            )
            aid = existing
        else:
            aid = conn.execute(
                social_accounts.insert().values(
                    provider="instagram", provider_account_id=account_id, **values
                )
            ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "integration.connected", "social_account", aid)
    return settings_redirect("connected")


@api.post("/<int:aid>/sync")
@require_staff("OWNER", "ADMIN")
def start_sync(aid):
    with engine().begin() as conn:
        account = (
            conn.execute(
                select(social_accounts)
                .where(
                    social_accounts.c.id == aid,
                    social_accounts.c.provider == "instagram",
                )
                .with_for_update()
            )
            .mappings()
            .first()
        )
        if not account or account["status"] != "CONNECTED" or not account["encrypted_token"]:
            raise BadRequest("Reconnect Instagram before syncing conversations")
        active = conn.execute(
            select(jobs.c.id, jobs.c.payload).where(
                jobs.c.kind == "instagram_sync",
                jobs.c.status.in_(["QUEUED", "PROCESSING", "RETRYING"]),
            )
        ).mappings()
        for row in active:
            if (row["payload"] or {}).get("account_id") == aid:
                return output({"job_id": row["id"], "status": "IN_PROGRESS"}, 202)
        job_id = conn.execute(
            jobs.insert().values(
                kind="instagram_sync",
                dedupe_key=f"instagram-sync:{aid}:{secrets.token_hex(12)}",
                payload={"account_id": aid, "requested_by": g.staff["id"]},
            )
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "integration.sync_requested", "social_account", aid)
    return output({"job_id": job_id, "status": "QUEUED"}, 202)


@api.get("/<int:aid>/sync/<int:job_id>")
@require_staff()
def sync_status(aid, job_id):
    with engine().connect() as conn:
        row = (
            conn.execute(
                select(jobs.c.status, jobs.c.payload, jobs.c.safe_error).where(
                    jobs.c.id == job_id, jobs.c.kind == "instagram_sync"
                )
            )
            .mappings()
            .first()
        )
    if not row or (row["payload"] or {}).get("account_id") != aid:
        raise BadRequest("Conversation sync not found")
    return output(
        {
            "status": row["status"],
            "result": (row["payload"] or {}).get("result"),
            "progress": (row["payload"] or {}).get("progress"),
            "safe_error": row["safe_error"],
        }
    )


@api.post("/<int:aid>/disconnect")
@require_staff("OWNER", "ADMIN")
def disconnect(aid):
    with engine().begin() as conn:
        if not conn.execute(
            update(social_accounts)
            .where(
                social_accounts.c.id == aid, social_accounts.c.provider == "instagram"
            )
            .values(status="DISCONNECTED", encrypted_token=None, token_expires_at=None)
        ).rowcount:
            raise BadRequest("Instagram account not found")
        audit(conn, g.staff["id"], "integration.disconnected", "social_account", aid)
    return jsonify(ok=True)
