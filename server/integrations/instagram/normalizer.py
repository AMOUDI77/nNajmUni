"""Normalize Instagram messaging and comment webhook envelopes."""

from datetime import datetime, timezone
from urllib.parse import urlparse


def timestamp(value):
    try:
        number = float(value)
        if number > 10**11:
            number /= 1000
        return datetime.fromtimestamp(number, timezone.utc).replace(tzinfo=None)
    except (ValueError, TypeError, OverflowError, OSError):
        raise ValueError("Invalid provider timestamp")


def attachments(items):
    result = []
    for item in items[:10] if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        url = item.get("payload", {}).get("url", "")
        if (
            not isinstance(url, str)
            or len(url) > 4096
            or urlparse(url).scheme != "https"
        ):
            url = None
        result.append({"type": str(item.get("type", "unsupported"))[:30], "url": url})
    return result


def normalize(payload):
    if not isinstance(payload, dict) or payload.get("object") != "instagram":
        return []
    result = []
    for entry in payload.get("entry", []):
        account = str(entry.get("id", ""))
        for event in entry.get("messaging", []):
            message = event.get("message", {})
            postback = event.get("postback", {})
            if message.get("is_echo") or (not message and not postback):
                continue
            sender = str(event.get("sender", {}).get("id", ""))
            mid = message.get("mid") or postback.get("mid")
            if (
                not sender
                or not mid
                or sender == account
                or str(event.get("recipient", {}).get("id", "")) != account
            ):
                continue
            result.append(
                {
                    "account": account,
                    "sender": sender,
                    "id": str(mid),
                    "kind": "POSTBACK" if postback else "DM",
                    "text": str(
                        postback.get("payload")
                        or message.get("quick_reply", {}).get("payload")
                        or message.get("text", "")
                    )[:10000],
                    "timestamp": timestamp(event.get("timestamp")),
                    "attachments": attachments(message.get("attachments", [])),
                    "reference": message.get("reply_to", {}).get("mid"),
                    "media_id": None,
                }
            )
        for change in entry.get("changes", []):
            if change.get("field") != "comments":
                continue
            value = change.get("value", {})
            sender = str(value.get("from", {}).get("id", ""))
            if not value.get("id") or not sender or sender == account:
                continue
            result.append(
                {
                    "account": account,
                    "sender": sender,
                    "id": str(value["id"]),
                    "kind": "COMMENT",
                    "text": str(value.get("text", ""))[:10000],
                    "timestamp": timestamp(entry.get("time")),
                    "attachments": [],
                    "username": value.get("from", {}).get("username"),
                    "media_id": str(value.get("media", {}).get("id", "")),
                    "reference": None,
                }
            )
    return result
