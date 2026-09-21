"""Idempotent import of the history exposed by Meta's Conversations API."""

from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from sqlalchemy import or_, select, update

from crm.common import now
from crm.schema_v1 import contacts, conversations, identities, messages, social_accounts
from crm.schema_v3 import conversation_sources

from .client import ProviderError, decrypt, graph_url, provider_request


def _timestamp(value):
    if not isinstance(value, str) or len(value) > 80:
        raise ProviderError("Instagram returned an invalid message timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ProviderError("Instagram returned an invalid message timestamp") from None
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _page(path, token, params):
    """Yield every provider page while accepting only Meta cursor pagination."""
    after = None
    seen = set()
    while True:
        query = {**params, "limit": 100}
        if after:
            query["after"] = after
        payload = provider_request(
            "GET",
            graph_url(path),
            headers={"Authorization": "Bearer " + token},
            params=query,
        )
        data = payload.get("data", [])
        if not isinstance(data, list):
            raise ProviderError("Instagram returned an unexpected history response")
        yield data
        paging = payload.get("paging") if isinstance(payload.get("paging"), dict) else {}
        cursors = paging.get("cursors") if isinstance(paging.get("cursors"), dict) else {}
        after = cursors.get("after")
        if not after and paging.get("next"):
            parsed = urlparse(str(paging["next"]))
            if parsed.scheme != "https" or parsed.netloc != "graph.instagram.com":
                raise ProviderError("Instagram returned an unsafe pagination link")
            after = parse_qs(parsed.query).get("after", [None])[0]
        if not after:
            return
        after = str(after)
        if len(after) > 2000 or after in seen:
            raise ProviderError("Instagram returned invalid pagination")
        seen.add(after)


def _items(value):
    if isinstance(value, dict):
        value = value.get("data", [])
    return value if isinstance(value, list) else []


def _person_id(value):
    return str(value.get("id", "")) if isinstance(value, dict) else ""


def _attachments(value):
    result = []
    for item in _items(value)[:10]:
        if not isinstance(item, dict):
            continue
        image_data = item.get("image_data")
        video_data = item.get("video_data")
        url = (
            item.get("file_url")
            or (image_data.get("url") if isinstance(image_data, dict) else None)
            or (video_data.get("url") if isinstance(video_data, dict) else None)
        )
        if not isinstance(url, str) or not url.startswith("https://") or len(url) > 4096:
            url = None
        result.append(
            {
                "type": str(item.get("mime_type") or item.get("type") or "unsupported")[:30],
                "url": url,
            }
        )
    return result


def _fetch(account):
    token = decrypt(account["encrypted_token"])
    remote = []
    for page in _page(
        account["provider_account_id"] + "/conversations",
        token,
        {"fields": "id,participants,updated_time"},
    ):
        for thread in page:
            if not isinstance(thread, dict) or not thread.get("id"):
                continue
            remote_messages = []
            for message_page in _page(
                str(thread["id"]) + "/messages",
                token,
                {"fields": "id,created_time,from,to,message,attachments"},
            ):
                remote_messages.extend(m for m in message_page if isinstance(m, dict))
            participants = _items(thread.get("participants"))
            external = next(
                (
                    person
                    for person in participants
                    if _person_id(person) != account["provider_account_id"]
                ),
                None,
            )
            if not external:
                for message in remote_messages:
                    sender = message.get("from")
                    if _person_id(sender) and _person_id(sender) != account["provider_account_id"]:
                        external = sender
                        break
            if not external or not _person_id(external):
                continue
            remote.append((external, remote_messages))
    return remote


def sync_account(db_engine, account_id):
    with db_engine.connect() as conn:
        account = (
            conn.execute(
                select(social_accounts).where(
                    social_accounts.c.id == account_id,
                    social_accounts.c.provider == "instagram",
                    social_accounts.c.status == "CONNECTED",
                )
            )
            .mappings()
            .first()
        )
    if not account or not account["encrypted_token"]:
        raise ProviderError("Instagram needs reconnection")
    remote = _fetch(account)
    imported_conversations = 0
    imported_messages = 0
    skipped_existing = 0
    unavailable = 0
    with db_engine.begin() as conn:
        current = (
            conn.execute(
                select(social_accounts)
                .where(social_accounts.c.id == account_id)
                .with_for_update()
            )
            .mappings()
            .one()
        )
        if current["status"] != "CONNECTED":
            raise ProviderError("Instagram needs reconnection")
        for external, remote_messages in remote:
            provider_user_id = _person_id(external)
            identity = (
                conn.execute(
                    select(identities).where(
                        identities.c.account_id == account_id,
                        identities.c.provider_user_id == provider_user_id,
                    )
                )
                .mappings()
                .first()
            )
            username = str(external.get("username") or external.get("name") or "")[:255] or None
            if identity:
                identity_id = identity["id"]
                contact_id = identity["contact_id"]
                if username and username != identity["username"]:
                    conn.execute(
                        update(identities)
                        .where(identities.c.id == identity_id)
                        .values(username=username)
                    )
            else:
                contact_id = conn.execute(
                    contacts.insert().values(
                        display_name=username or "Instagram contact", updated_at=now()
                    )
                ).inserted_primary_key[0]
                identity_id = conn.execute(
                    identities.insert().values(
                        contact_id=contact_id,
                        account_id=account_id,
                        provider_user_id=provider_user_id,
                        username=username,
                    )
                ).inserted_primary_key[0]
            conversation = (
                conn.execute(
                    select(conversations).where(conversations.c.identity_id == identity_id)
                )
                .mappings()
                .first()
            )
            if conversation:
                conversation_id = conversation["id"]
            else:
                conversation_id = conn.execute(
                    conversations.insert().values(
                        contact_id=contact_id, identity_id=identity_id
                    )
                ).inserted_primary_key[0]
                imported_conversations += 1
            newest_at = conversation["last_message_at"] if conversation else None
            newest_text = conversation["preview"] if conversation else None
            latest_inbound = conversation["last_inbound_at"] if conversation else None
            earliest = None
            for message in sorted(
                remote_messages, key=lambda item: str(item.get("created_time", ""))
            ):
                provider_id = str(message.get("id") or "")
                if not provider_id:
                    unavailable += 1
                    continue
                dedupe_key = f"instagram:{account_id}:DM:{provider_id}"
                exists = conn.execute(
                    select(messages.c.id).where(
                        or_(
                            messages.c.dedupe_key == dedupe_key,
                            (messages.c.conversation_id == conversation_id)
                            & (messages.c.provider_message_id == provider_id),
                        )
                    )
                ).first()
                if exists:
                    skipped_existing += 1
                    continue
                sent_at = _timestamp(message.get("created_time"))
                outbound = _person_id(message.get("from")) == current["provider_account_id"]
                text = str(message.get("message") or "")[:10000]
                conn.execute(
                    messages.insert().values(
                        conversation_id=conversation_id,
                        provider_message_id=provider_id,
                        dedupe_key=dedupe_key,
                        direction="OUTBOUND" if outbound else "INBOUND",
                        sender_type="STAFF" if outbound else "CONTACT",
                        message_type="text",
                        text=text,
                        attachments=_attachments(message.get("attachments")),
                        status="SENT" if outbound else "RECEIVED",
                        provider_timestamp=sent_at,
                        created_at=sent_at,
                    )
                )
                imported_messages += 1
                earliest = sent_at if earliest is None or sent_at < earliest else earliest
                if newest_at is None or sent_at >= newest_at:
                    newest_at, newest_text = sent_at, text[:200]
                if not outbound and (latest_inbound is None or sent_at > latest_inbound):
                    latest_inbound = sent_at
            conn.execute(
                update(conversations)
                .where(conversations.c.id == conversation_id)
                .values(
                    last_message_at=newest_at,
                    last_inbound_at=latest_inbound,
                    preview=newest_text,
                )
            )
            if earliest and not conn.execute(
                select(conversation_sources.c.id).where(
                    conversation_sources.c.conversation_id == conversation_id
                )
            ).first():
                conn.execute(
                    conversation_sources.insert().values(
                        conversation_id=conversation_id,
                        provider="instagram",
                        source_type="instagram_dm",
                        occurred_at=earliest,
                    )
                )
    return {
        "imported_conversations": imported_conversations,
        "imported_messages": imported_messages,
        "skipped_existing": skipped_existing,
        "unavailable": unavailable,
    }
