"""Incremental, idempotent import from Meta's Conversations API."""

from datetime import datetime, timezone
from time import monotonic
from urllib.parse import parse_qs, urlparse

from sqlalchemy import or_, select, update

from crm.common import now
from crm.schema_v1 import contacts, identities, messages, social_accounts
from crm.schema_v3 import conversation_sources
from crm.schema_v5 import conversations, jobs

from .client import ProviderError, decrypt, graph_url, provider_request


MAX_CONVERSATION_PAGES = 5_000
MAX_MESSAGE_PAGES_PER_CONVERSATION = 500
MAX_SYNC_SECONDS = 2 * 60 * 60


class SyncSafetyError(ProviderError):
    def __init__(self, message, code="sync_safety"):
        super().__init__(message, code=code)


def _timestamp(value):
    if not isinstance(value, str) or len(value) > 80:
        raise ProviderError(
            "Instagram returned an invalid message timestamp",
            code="provider_response",
        )
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ProviderError(
            "Instagram returned an invalid message timestamp",
            code="provider_response",
        ) from None
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _page(path, token, params, max_pages, check_deadline):
    """Yield provider pages with a hard cap and repeated-cursor protection."""
    after = None
    seen = set()
    page_count = 0
    while True:
        check_deadline()
        page_count += 1
        if page_count > max_pages:
            raise SyncSafetyError("Instagram pagination exceeded its safety limit")
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
            raise ProviderError(
                "Instagram returned an unexpected history response",
                code="provider_response",
            )
        yield data
        paging = payload.get("paging") if isinstance(payload.get("paging"), dict) else {}
        cursors = paging.get("cursors") if isinstance(paging.get("cursors"), dict) else {}
        after = cursors.get("after")
        if not after and paging.get("next"):
            parsed = urlparse(str(paging["next"]))
            if parsed.scheme != "https" or parsed.netloc != "graph.instagram.com":
                raise SyncSafetyError("Instagram returned an unsafe pagination link")
            after = parse_qs(parsed.query).get("after", [None])[0]
        if not after:
            return
        after = str(after)
        if len(after) > 2000 or after in seen:
            raise SyncSafetyError("Instagram returned a repeated pagination cursor")
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


def _get_detail(path, token, fields, check_deadline):
    check_deadline()
    return provider_request(
        "GET",
        graph_url(path),
        headers={"Authorization": "Bearer " + token},
        params={"fields": fields},
    )


def _conversation_detail(thread, token, check_deadline):
    if _items(thread.get("participants")):
        return thread
    detail = _get_detail(
        str(thread["id"]), token, "id,participants,updated_time", check_deadline
    )
    return {**thread, **detail}


def _message_detail(message, token, check_deadline):
    if (
        message.get("id")
        and message.get("created_time")
        and _person_id(message.get("from"))
    ):
        return message
    message_id = str(message.get("id") or "")
    if not message_id:
        return None
    try:
        detail = _get_detail(
            message_id,
            token,
            "id,created_time,from,to,message,attachments",
            check_deadline,
        )
    except ProviderError as error:
        # A deleted historical message must not discard prior committed data.
        if error.code == "provider_bad_request":
            return None
        raise
    return {**message, **detail}


def _external_person(thread, remote_messages, provider_account_id):
    candidates = list(_items(thread.get("participants")))
    for message in remote_messages:
        candidates.append(message.get("from"))
        candidates.extend(_items(message.get("to")))
    return next(
        (
            person
            for person in candidates
            if _person_id(person) and _person_id(person) != provider_account_id
        ),
        None,
    )


def _heartbeat(db_engine, job, progress):
    if not job:
        return
    progress["last_progress_at"] = now().isoformat() + "Z"
    with db_engine.begin() as conn:
        changed = conn.execute(
            update(jobs)
            .where(
                jobs.c.id == job["id"],
                jobs.c.lease_token == job["lease_token"],
                jobs.c.status == "PROCESSING",
            )
            .values(
                payload={**job["payload"], "progress": dict(progress)},
                heartbeat_at=now(),
            )
        ).rowcount
    if changed != 1:
        raise SyncSafetyError("Instagram synchronization lease was lost", "lease_lost")


def _persist_batch(db_engine, account_id, thread_id, external, remote_messages):
    imported_conversations = imported_messages = skipped_existing = unavailable = 0
    provider_user_id = _person_id(external)
    if not provider_user_id:
        return imported_conversations, imported_messages, skipped_existing, 1

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
            raise ProviderError(
                "Instagram needs reconnection", code="provider_authentication"
            )
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

        matches = (
            conn.execute(
                select(conversations).where(
                    or_(
                        conversations.c.provider_conversation_id == thread_id,
                        conversations.c.identity_id == identity_id,
                    )
                )
            )
            .mappings()
            .all()
        )
        if len(matches) > 1:
            raise SyncSafetyError(
                "Instagram conversation identity conflicts with an existing record",
                "identity_conflict",
            )
        conversation = matches[0] if matches else None
        if conversation:
            conversation_id = conversation["id"]
            if not conversation["provider_conversation_id"]:
                conn.execute(
                    update(conversations)
                    .where(conversations.c.id == conversation_id)
                    .values(provider_conversation_id=thread_id)
                )
        else:
            conversation_id = conn.execute(
                conversations.insert().values(
                    contact_id=contact_id,
                    identity_id=identity_id,
                    provider_conversation_id=thread_id,
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
            sender_id = _person_id(message.get("from"))
            if not provider_id or not sender_id:
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
            outbound = sender_id == current["provider_account_id"]
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
    return imported_conversations, imported_messages, skipped_existing, unavailable


def sync_account(db_engine, account_id, job=None):
    started = monotonic()

    def check_deadline():
        if monotonic() - started >= MAX_SYNC_SECONDS:
            raise SyncSafetyError("Instagram synchronization reached its time limit")

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
        raise ProviderError("Instagram needs reconnection", code="provider_authentication")

    token = decrypt(account["encrypted_token"])
    progress = {
        "state": "RUNNING",
        "pages_processed": 0,
        "conversations_seen": 0,
        "imported_conversations": 0,
        "imported_messages": 0,
        "skipped_existing": 0,
        "unavailable": 0,
        "last_progress_at": None,
    }
    _heartbeat(db_engine, job, progress)

    for conversation_page in _page(
        account["provider_account_id"] + "/conversations",
        token,
        {"fields": "id,participants,updated_time"},
        MAX_CONVERSATION_PAGES,
        check_deadline,
    ):
        progress["pages_processed"] += 1
        for raw_thread in conversation_page:
            if not isinstance(raw_thread, dict) or not raw_thread.get("id"):
                progress["unavailable"] += 1
                continue
            progress["conversations_seen"] += 1
            thread = _conversation_detail(raw_thread, token, check_deadline)
            thread_id = str(thread["id"])
            external = _external_person(thread, [], account["provider_account_id"])
            for message_page in _page(
                thread_id + "/messages",
                token,
                {"fields": "id,created_time,from,to,message,attachments"},
                MAX_MESSAGE_PAGES_PER_CONVERSATION,
                check_deadline,
            ):
                progress["pages_processed"] += 1
                hydrated = []
                for raw_message in message_page:
                    if not isinstance(raw_message, dict):
                        progress["unavailable"] += 1
                        continue
                    message = _message_detail(raw_message, token, check_deadline)
                    if message is None:
                        progress["unavailable"] += 1
                    else:
                        hydrated.append(message)
                external = external or _external_person(
                    thread, hydrated, account["provider_account_id"]
                )
                if not external:
                    progress["unavailable"] += len(hydrated)
                    _heartbeat(db_engine, job, progress)
                    continue
                delta = _persist_batch(
                    db_engine, account_id, thread_id, external, hydrated
                )
                for key, value in zip(
                    (
                        "imported_conversations",
                        "imported_messages",
                        "skipped_existing",
                        "unavailable",
                    ),
                    delta,
                ):
                    progress[key] += value
                _heartbeat(db_engine, job, progress)
            _heartbeat(db_engine, job, progress)
        _heartbeat(db_engine, job, progress)

    progress["state"] = "COMPLETED"
    _heartbeat(db_engine, job, progress)
    return {
        key: progress[key]
        for key in (
            "pages_processed",
            "conversations_seen",
            "imported_conversations",
            "imported_messages",
            "skipped_existing",
            "unavailable",
        )
    }
