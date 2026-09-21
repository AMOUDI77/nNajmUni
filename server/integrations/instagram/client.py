"""Bounded provider HTTP calls with safe errors and encrypted token storage."""

import os
import re
import uuid

import httpx
from crm.auth import development
from cryptography.fernet import Fernet, InvalidToken


class ProviderError(Exception):
    def __init__(self, message, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain


def cipher():
    try:
        return Fernet(os.environ.get("META_TOKEN_ENCRYPTION_KEY", "").encode())
    except ValueError:
        raise ProviderError("Instagram encryption key is not configured") from None


def encrypt(token):
    return cipher().encrypt(token.encode()).decode()


def decrypt(token):
    try:
        return cipher().decrypt(token.encode()).decode()
    except (InvalidToken, AttributeError):
        raise ProviderError("Instagram needs reconnection") from None


def is_mock():
    mode = os.environ.get("META_PROVIDER_MODE", "live")
    if mode not in ("mock", "live"):
        raise ProviderError("Invalid Instagram provider mode")
    if mode == "mock" and not development():
        raise ProviderError("Mock Instagram is forbidden in production")
    return mode == "mock"


def graph_url(path):
    version = os.environ.get("META_API_VERSION", "")
    if not re.fullmatch(r"v\d+\.\d+", version):
        raise ProviderError("Configure a verified Meta API version")
    return f"https://graph.instagram.com/{version}/{path.lstrip('/')}"


def provider_request(method, url, **kwargs):
    try:
        response = httpx.request(
            method, url, timeout=20, follow_redirects=False, **kwargs
        )
    except httpx.TransportError:
        raise ProviderError(
            "Provider connection interrupted. Delivery may be uncertain",
            uncertain=method == "POST",
        ) from None
    if response.status_code >= 500:
        raise ProviderError(
            "Instagram is temporarily unavailable", uncertain=method == "POST"
        )
    if response.status_code >= 400:
        raise ProviderError(
            "Instagram rejected the request. Check authorization and messaging eligibility"
        )
    try:
        data = response.json()
        if not isinstance(data, dict) or "error" in data:
            raise ValueError()
        return data
    except ValueError:
        raise ProviderError(
            "Unexpected Instagram response", uncertain=method == "POST"
        ) from None


def send_message(account, recipient, text, comment_id=None):
    if is_mock():
        return "mock-" + uuid.uuid4().hex
    payload = {
        "recipient": {"comment_id": comment_id} if comment_id else {"id": recipient},
        "message": {"text": text},
    }
    response = provider_request(
        "POST",
        graph_url(account["provider_account_id"] + "/messages"),
        headers={"Authorization": "Bearer " + decrypt(account["encrypted_token"])},
        json=payload,
    )
    mid = response.get("message_id")
    if not mid:
        raise ProviderError("Instagram did not confirm a message ID", uncertain=True)
    return str(mid)


def send_audio(account, recipient, media_url):
    """Deliver recorded audio only where the provider capability is verified.

    The mock provider deliberately supports the complete composer state machine.
    Live Instagram delivery remains disabled until NajmUni verifies an exact
    supported audio format and public-media delivery contract against Meta.
    """
    if is_mock():
        return "mock-audio-" + uuid.uuid4().hex
    raise ProviderError(
        "Recorded voice delivery is not enabled for this Instagram connection"
    )


def send_media(account, recipient, media_type, attachment):
    """Mock media delivery; live stays closed until durable public storage exists."""
    if is_mock():
        return "mock-media-" + uuid.uuid4().hex
    if media_type != "image":
        raise ProviderError("This file type cannot be sent through Instagram")
    provider_url = attachment.get("provider_url")
    if not provider_url or not provider_url.startswith("https://"):
        raise ProviderError("Image delivery requires configured secure object storage")
    payload = {"recipient": {"id": recipient}, "message": {"attachment": {"type": "image", "payload": {"url": provider_url}}}}
    response = provider_request(
        "POST", graph_url(account["provider_account_id"] + "/messages"),
        headers={"Authorization": "Bearer " + decrypt(account["encrypted_token"])}, json=payload,
    )
    mid = response.get("message_id")
    if not mid:
        raise ProviderError("Instagram did not confirm a message ID", uncertain=True)
    return str(mid)
