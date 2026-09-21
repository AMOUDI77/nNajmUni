"""Server-side Instagram Login authorization and encrypted connection storage."""

import os
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlparse

from crm.auth import digest, require_staff
from crm.common import audit, engine, now, output
from crm.schema_v1 import oauth_states, social_accounts
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
    return output(
        {
            "accounts": rows,
            "configured": all(
                os.environ.get(k)
                for k in (
                    "META_APP_ID",
                    "META_APP_SECRET",
                    "META_API_VERSION",
                    "META_INSTAGRAM_REDIRECT_URI",
                    "META_TOKEN_ENCRYPTION_KEY",
                )
            ),
            "mode": os.environ.get("META_PROVIDER_MODE", "live"),
        }
    )


@api.post("/connect")
@require_staff("OWNER", "ADMIN")
def connect():
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
        raise BadRequest(
            "Instagram authorization was declined. You can try again from Settings"
        )
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
    except ProviderError as exc:
        raise BadRequest(str(exc)) from None
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
    base = os.environ.get("CRM_PUBLIC_URL", "")
    allowed = {
        s.strip().rstrip("/")
        for s in os.environ.get("CRM_ALLOWED_ORIGINS", "").split(",")
    }
    parsed = urlparse(base)
    if base and (parsed.scheme + "://" + parsed.netloc) in allowed:
        return redirect(base.rstrip("/") + "/crm/settings/integrations")
    return redirect("/crm/settings/integrations")


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
