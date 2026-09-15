"""Opaque, database-backed sessions with CSRF protection and revocation."""

import hashlib
import hmac
import os
import re
import secrets
from datetime import timedelta
from functools import wraps

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from werkzeug.exceptions import BadRequest, Forbidden, TooManyRequests, Unauthorized

from .common import audit, body, engine, now, output, string
from .schema_v1 import auth_limits
from .schema_v1 import staff_sessions as sessions
from .schema_v1 import staff_users as users

auth = Blueprint("crm_auth", __name__, url_prefix="/api/crm")
hasher = PasswordHasher()
# One process-local dummy hash prevents timing-based email enumeration.
dummy_hash = hasher.hash(secrets.token_urlsafe(32))
ROLES = ("OWNER", "ADMIN", "COUNSELOR", "VIEWER")


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def development():
    return not os.environ.get("RENDER") and (
        current_app.testing or os.environ.get("CRM_ENV") == "development"
    )


def cookie_name():
    return "najmuni_crm_dev" if development() else "__Host-najmuni_crm"


def public_user(user):
    return {
        key: user[key]
        for key in ("id", "full_name", "email", "role", "status", "avatar_url")
    }


def origin_check():
    origin = request.headers.get("Origin")
    allowed = {
        s.strip().rstrip("/")
        for s in os.environ.get(
            "CRM_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173"
        ).split(",")
        if s.strip()
    }
    if origin and origin.rstrip("/") not in allowed:
        raise Forbidden("Origin not allowed")
    if request.headers.get("Sec-Fetch-Site") == "cross-site" and not origin:
        raise Forbidden("Origin required")


def require_staff(*roles):
    def decorate(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            token = request.cookies.get(cookie_name(), "")
            if not token or len(token) > 256:
                raise Unauthorized("Please sign in")
            with engine().connect() as conn:
                session = (
                    conn.execute(
                        select(sessions).where(
                            sessions.c.token_hash == digest(token),
                            sessions.c.revoked_at.is_(None),
                            sessions.c.expires_at > now(),
                        )
                    )
                    .mappings()
                    .first()
                )
                user = (
                    conn.execute(
                        select(users).where(
                            users.c.id == session["user_id"], users.c.status == "ACTIVE"
                        )
                    )
                    .mappings()
                    .first()
                    if session
                    else None
                )
            if not user:
                raise Unauthorized("Session expired. Please sign in")
            if roles and user["role"] not in roles:
                raise Forbidden("Your role cannot perform this action")
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                origin_check()
                csrf = request.headers.get("X-CSRF-Token", "")
                if not csrf or not hmac.compare_digest(
                    digest(csrf), session["csrf_hash"]
                ):
                    raise Forbidden("Invalid CSRF token")
            g.staff = dict(user)
            g.crm_session = dict(session)
            return fn(*args, **kwargs)

        return wrapped

    return decorate


def valid_password(password):
    if not isinstance(password, str) or not 12 <= len(password) <= 256:
        raise BadRequest("Password must contain 12–256 characters")
    return password


def valid_email(email):
    if (
        not isinstance(email, str)
        or len(email) > 254
        or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
    ):
        raise BadRequest("Enter a valid email address")
    return email.strip().lower()


def consume_login_attempt(email):
    # Persisted across workers. Never trust arbitrary X-Forwarded-For headers.
    stamp = now()
    keys = [
        (digest("ip:" + (request.remote_addr or "unknown")), 100),
        (digest("email:" + email), 10),
    ]
    blocked = False
    with engine().begin() as conn:
        insert = pg_insert if conn.dialect.name == "postgresql" else sqlite_insert
        for key, limit in keys:
            conn.execute(
                insert(auth_limits)
                .values(key=key, attempts=0, window_start=stamp)
                .on_conflict_do_nothing(index_elements=["key"])
            )
            row = (
                conn.execute(
                    select(auth_limits)
                    .where(auth_limits.c.key == key)
                    .with_for_update()
                )
                .mappings()
                .one()
            )
            attempts = (
                row["attempts"]
                if row["window_start"] > stamp - timedelta(minutes=15)
                else 0
            )
            blocked |= attempts >= limit
            conn.execute(
                update(auth_limits)
                .where(auth_limits.c.key == key)
                .values(
                    attempts=attempts + 1,
                    window_start=row["window_start"] if attempts else stamp,
                )
            )
            if blocked:
                break  # Do not create arbitrary email buckets for a blocked IP.
        if blocked:
            audit(conn, None, "auth.rate_limited")
    if blocked:
        raise TooManyRequests("Too many sign-in attempts. Try again in 15 minutes")


@auth.post("/auth/login")
def login():
    origin_check()
    data = body()
    email = valid_email(string(data, "email", 254, True))
    password = data.get("password")
    if not isinstance(password, str) or not 1 <= len(password) <= 256:
        raise BadRequest("Invalid password")
    consume_login_attempt(email)
    with engine().begin() as conn:
        user = (
            conn.execute(select(users).where(users.c.email == email)).mappings().first()
        )
        try:
            good = hasher.verify(
                user["password_hash"] if user else dummy_hash, password
            )
        except (VerificationError, InvalidHashError):
            good = False
        if not user or not good or user["status"] != "ACTIVE":
            audit(conn, None, "auth.login_failed")
            denied = True
        else:
            denied = False
            token = secrets.token_urlsafe(48)
            csrf = hmac.new(
                token.encode(), b"najmuni-crm-csrf", hashlib.sha256
            ).hexdigest()
            old = request.cookies.get(cookie_name())
            if old:
                conn.execute(
                    update(sessions)
                    .where(sessions.c.token_hash == digest(old))
                    .values(revoked_at=now())
                )
            conn.execute(
                sessions.insert().values(
                    user_id=user["id"],
                    token_hash=digest(token),
                    csrf_hash=digest(csrf),
                    expires_at=now() + timedelta(hours=12),
                )
            )
            values = {"last_login_at": now()}
            if hasher.check_needs_rehash(user["password_hash"]):
                values["password_hash"] = hasher.hash(password)
            conn.execute(update(users).where(users.c.id == user["id"]).values(**values))
            audit(conn, user["id"], "auth.login")
    if denied:
        raise Unauthorized("Email or password is incorrect")
    response = jsonify(user=public_user(user), csrf_token=csrf)
    response.set_cookie(
        cookie_name(),
        token,
        max_age=43200,
        secure=not development(),
        httponly=True,
        samesite="Lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@auth.get("/auth/me")
@require_staff()
def me():
    # Deterministic CSRF supports reloads and multiple tabs without a GET write.
    token = request.cookies[cookie_name()]
    csrf = hmac.new(token.encode(), b"najmuni-crm-csrf", hashlib.sha256).hexdigest()
    return jsonify(user=public_user(g.staff), csrf_token=csrf)


@auth.post("/auth/logout")
@require_staff()
def logout():
    with engine().begin() as conn:
        conn.execute(
            update(sessions)
            .where(sessions.c.id == g.crm_session["id"])
            .values(revoked_at=now())
        )
        audit(conn, g.staff["id"], "auth.logout")
    response = jsonify(ok=True)
    response.delete_cookie(
        cookie_name(), path="/", secure=not development(), httponly=True, samesite="Lax"
    )
    return response


@auth.get("/team")
@require_staff()
def team():
    with engine().connect() as conn:
        return output(
            [
                public_user(u)
                for u in conn.execute(
                    select(users).order_by(users.c.full_name)
                ).mappings()
            ]
        )


@auth.post("/team")
@require_staff("OWNER", "ADMIN")
def create_staff():
    data = body()
    role = data.get("role", "COUNSELOR")
    if role not in ROLES or (g.staff["role"] != "OWNER" and role in ("OWNER", "ADMIN")):
        raise Forbidden("Only owners can grant administrative roles")
    email = valid_email(string(data, "email", 254, True))
    with engine().begin() as conn:
        uid = conn.execute(
            users.insert().values(
                full_name=string(data, "full_name", 120, True),
                email=email,
                password_hash=hasher.hash(valid_password(data.get("password"))),
                role=role,
            )
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "team.created", "staff", uid, role=role)
    return output({"id": uid}, 201)


@auth.patch("/team/<int:uid>")
@require_staff("OWNER", "ADMIN")
def edit_staff(uid):
    data = body()
    if uid == g.staff["id"] and any(k in data for k in ("status", "role")):
        raise BadRequest("Ask another owner to change your own access")
    with engine().begin() as conn:
        # Serialize owner changes so two simultaneous demotions cannot remove
        # every active owner from the workspace.
        owners = (
            conn.execute(
                select(users.c.id)
                .where(users.c.role == "OWNER", users.c.status == "ACTIVE")
                .order_by(users.c.id)
                .with_for_update()
            )
            .scalars()
            .all()
        )
        target = (
            conn.execute(select(users).where(users.c.id == uid).with_for_update())
            .mappings()
            .first()
        )
        if not target:
            raise BadRequest("Staff member not found")
        if g.staff["role"] != "OWNER" and target["role"] in ("OWNER", "ADMIN"):
            raise Forbidden("Only owners can change administrative accounts")
        values = {"updated_at": now()}
        if "role" in data:
            if data["role"] not in ROLES or (
                g.staff["role"] != "OWNER" and data["role"] in ("OWNER", "ADMIN")
            ):
                raise Forbidden("Invalid role")
            values["role"] = data["role"]
        if "status" in data:
            if data["status"] not in ("ACTIVE", "INACTIVE"):
                raise BadRequest("Invalid status")
            values["status"] = data["status"]
        if "full_name" in data:
            values["full_name"] = string(data, "full_name", 120, True)
        if "password" in data:
            values["password_hash"] = hasher.hash(valid_password(data["password"]))
        if (
            target["role"] == "OWNER"
            and target["status"] == "ACTIVE"
            and len(owners) <= 1
            and (
                values.get("role", "OWNER") != "OWNER"
                or values.get("status", "ACTIVE") != "ACTIVE"
            )
        ):
            raise BadRequest("The workspace must retain an active owner")
        conn.execute(update(users).where(users.c.id == uid).values(**values))
        conn.execute(
            update(sessions).where(sessions.c.user_id == uid).values(revoked_at=now())
        )
        audit(
            conn,
            g.staff["id"],
            "team.updated",
            "staff",
            uid,
            fields=[k for k in values if k != "password_hash"],
        )
    return jsonify(ok=True)
