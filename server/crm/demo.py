"""Explicit, loopback-only demo data. Never import for application startup."""

import os
from datetime import timedelta

from sqlalchemy import select

from .auth import hasher
from .common import now
from .schema_v1 import (
    campaigns,
    contact_labels,
    contacts,
    conversations,
    identities,
    labels,
    messages,
    rules,
    social_accounts,
    staff_users,
    touchpoints,
)


def require_local(engine):
    if os.environ.get("CRM_ENV") != "development" or os.environ.get("RENDER"):
        raise SystemExit("Demo requires CRM_ENV=development outside Render")
    if engine.dialect.name == "postgresql" and engine.url.host not in (
        "localhost",
        "127.0.0.1",
        "::1",
    ):
        raise SystemExit("Demo only permits a local loopback PostgreSQL database")
    if engine.dialect.name == "sqlite" and not str(engine.url.database).endswith(
        "crm-demo.db"
    ):
        raise SystemExit("SQLite demo must use a dedicated crm-demo.db file")


def seed_demo(engine, password):
    require_local(engine)
    with engine.begin() as conn:
        if (
            conn.execute(select(contacts.c.id).limit(1)).first()
            or conn.execute(select(staff_users.c.id).limit(1)).first()
        ):
            raise SystemExit("Demo requires an empty CRM schema")
        uid = conn.execute(
            staff_users.insert().values(
                full_name="Demo Counselor",
                email="demo@najmuni.test",
                password_hash=hasher.hash(password),
                role="OWNER",
            )
        ).inserted_primary_key[0]
        account = conn.execute(
            social_accounts.insert().values(
                provider="instagram",
                provider_account_id="demo-business",
                username="najmuni_demo",
            )
        ).inserted_primary_key[0]
        lids = [
            conn.execute(
                labels.insert().values(name=name, color=color)
            ).inserted_primary_key[0]
            for name, color in [
                ("University", "#4F6BFF"),
                ("Fees", "#bd9042"),
                ("Visa", "#8c67b5"),
            ]
        ]
        source = conn.execute(
            campaigns.insert().values(
                account_id=account,
                provider="instagram",
                source_key="demo-reel",
                media_id="demo-reel",
                campaign_name="Study in Malaysia",
            )
        ).inserted_primary_key[0]
        names = [
            "أحمد محمد",
            "سارة العتيبي",
            "Khalid Hassan",
            "نور عبدالله",
            "Omar Ali",
            "ريم خالد",
            "Yusuf Ahmed",
            "ليان",
            "Maya Noor",
            "عبدالله",
        ]
        texts = [
            "السلام عليكم أبي أدرس في ماليزيا",
            "هل يوجد تخصص الأمن السيبراني؟",
            "What is the next intake for computer science?",
            "أريد معرفة تكاليف الدراسة والسكن",
            "Can a counselor help me compare universities?",
        ]
        for i, name in enumerate(names):
            cid = conn.execute(
                contacts.insert().values(
                    display_name=name,
                    preferred_language="ar" if i % 2 == 0 else "en",
                    degree_level="Bachelor" if i % 3 == 0 else None,
                    stage="CONTACTED" if i % 2 else "NEW",
                    country="Saudi Arabia" if i % 2 == 0 else None,
                    program_interests="Computer Science" if i % 3 == 0 else None,
                    updated_at=now(),
                )
            ).inserted_primary_key[0]
            iid = conn.execute(
                identities.insert().values(
                    contact_id=cid,
                    account_id=account,
                    provider_user_id="demo-" + str(i),
                    username="student_demo_" + str(i + 1),
                )
            ).inserted_primary_key[0]
            stamp = now() - timedelta(minutes=i * 12)
            vid = conn.execute(
                conversations.insert().values(
                    contact_id=cid,
                    identity_id=iid,
                    assigned_to=uid if i % 3 == 0 else None,
                    unread=i % 2 == 0,
                    last_message_at=stamp,
                    last_inbound_at=stamp,
                    preview=texts[i % len(texts)],
                )
            ).inserted_primary_key[0]
            conn.execute(
                messages.insert().values(
                    conversation_id=vid,
                    dedupe_key=f"demo:{i}:in",
                    direction="INBOUND",
                    sender_type="CONTACT",
                    text=texts[i % len(texts)],
                    attachments=[],
                    status="RECEIVED",
                    provider_timestamp=stamp,
                    created_at=stamp,
                )
            )
            conn.execute(
                contact_labels.insert().values(contact_id=cid, label_id=lids[i % 3])
            )
            conn.execute(
                touchpoints.insert().values(
                    contact_id=cid,
                    campaign_source_id=source,
                    event_type="instagram_dm",
                    provider_event_id="demo-touch-" + str(i),
                    occurred_at=stamp,
                )
            )
        conn.execute(
            rules.insert().values(
                name="Malaysia study inquiry",
                status="DRAFT",
                trigger={
                    "kind": "DM",
                    "keywords": ["ماليزيا", "Malaysia"],
                    "match": "contains",
                },
                steps=[
                    {
                        "action": "ASK_QUESTION",
                        "text": "أهلاً بك في نجم! ما المرحلة الدراسية التي ترغب بها؟",
                        "field": "degree_level",
                    },
                    {
                        "action": "ASK_QUESTION",
                        "text": "وما التخصص الذي تهتم به؟",
                        "field": "program_interests",
                    },
                    {"action": "CREATE_LEAD"},
                    {"action": "HUMAN_HANDOFF"},
                ],
                updated_by=uid,
            )
        )


def main():
    import getpass

    from app import DATABASE_ENGINE

    password = getpass.getpass("Local demo password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    seed_demo(DATABASE_ENGINE, password)
    print("Demo created. Sign in as demo@najmuni.test at /crm/login")


if __name__ == "__main__":
    main()
