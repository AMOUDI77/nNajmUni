# Inbox media delivery

NajmUni exposes channel capabilities on each conversation and the React composer renders only actions that the active provider can deliver. Text is available for a connected Instagram conversation. Recorded voice, images, and PDF attachments are enabled only for the development mock provider today. Unsupported files fail before a message is queued, and provider failures remain visible as `FAILED` or `UNCERTAIN` messages.

The mock provider stores private files through `crm.media_storage` in the operating-system temporary directory by default, or `CRM_MEDIA_DIR` during isolated tests. Media routes require a staff session, filenames are generated UUIDs, file signatures and byte limits are checked server-side, and responses use `nosniff`. This local store is disposable and must never be used as production persistence.

Production media requires a durable object-storage adapter. It must provide a short-lived authenticated staff URL for previews and a separate HTTPS URL readable by Meta for delivery, enforce workspace ownership, encrypt data at rest, expire or delete objects under the retention policy, and remove abandoned uploads. The adapter should return the same `StoredMedia` contract. Only after the provider payload and supported format are verified against the current official Meta API should the corresponding live capability be enabled.

Verified on 2026-09-17 against Meta's official Instagram Postman workspace: the Send API documents text messages and an image/GIF attachment with `message.attachment.type = image` plus a provider-readable `payload.url`. The same source does not establish arbitrary PDF or recorded voice delivery for this integration. The code therefore contains the verified image payload shape but keeps live media capabilities off until object storage and a test Instagram account validate the complete delivery path.

Current limits are 8 MB for JPEG, PNG, GIF, and WebP images; 10 MB for PDF or image attachments; and 25 MB / 10 minutes for mock voice recordings. SVG and file types inferred only from a browser MIME header are rejected.
