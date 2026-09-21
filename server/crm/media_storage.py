"""Private development media storage behind a replaceable storage boundary.

Production media must use durable object storage with signed staff URLs and a
separate provider-readable URL. Local disk is deliberately restricted to the
development mock provider and defaults outside the repository.
"""

import os
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class StoredMedia:
    key: str
    staff_url: str
    provider_url: str | None = None


class LocalDevelopmentMediaStore:
    def __init__(self):
        configured = os.environ.get("CRM_MEDIA_DIR", "").strip()
        self.root = Path(configured) if configured else Path(tempfile.gettempdir()) / "najmuni-crm-media"

    def save(self, content: bytes, extension: str) -> StoredMedia:
        self.root.mkdir(parents=True, exist_ok=True)
        key = f"{uuid.uuid4().hex}.{extension}"
        target = self.root / key
        target.write_bytes(content)
        return StoredMedia(key=key, staff_url=f"/api/crm/media/{key}")

    def remove(self, key: str) -> None:
        (self.root / key).unlink(missing_ok=True)

    def path(self, key: str) -> Path:
        return self.root / key


def media_store():
    return LocalDevelopmentMediaStore()
