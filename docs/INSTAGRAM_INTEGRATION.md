# Instagram integration

NajmUni implements an Instagram Login provider boundary and a strictly local mock provider. Production uses `META_PROVIDER_MODE=live`; mock mode is rejected unless the app is in explicit local development or testing, and normal development mock mode is rejected on Render.

## Contract and validation status

The intended scopes are `instagram_business_basic`, `instagram_business_manage_messages`, and `instagram_business_manage_comments`. No publishing scope or publishing endpoint is included. The Graph host is `graph.instagram.com`; authorization uses Instagram’s OAuth endpoint and a server-side code/token exchange. Tokens use Fernet authenticated encryption with `META_TOKEN_ENCRYPTION_KEY` and are never returned to React.

`META_API_VERSION` is required for live Graph calls and intentionally has no guessed default. Direct retrieval of the current Meta developer pages was blocked by HTTP 429 during implementation. Meta’s accessible Postman collection confirmed the platform context, but did not establish a complete current Instagram Login contract. Consequently **live readiness is not claimed**. Verify the selected supported version, exact scopes, OAuth response fields, webhook subscription names, private-reply constraints and app-review requirements against current official documentation before enabling the live connection:

- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/)
- [Messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/)
- [Instagram webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/)

## Connection and events

Settings reports platform readiness separately from account connection and never returns configuration values. Readiness requires the six documented `META_` variables, a valid API version and HTTPS callback path, and a valid Fernet encryption key. Missing platform setup gives the owner deployment guidance without collecting secrets in the browser. Once ready, the enabled Connect action starts the official OAuth flow; Instagram credentials are entered only on Instagram.

The backend creates a ten-minute, one-use OAuth state bound to both staff user and session. Callback validation occurs before any provider call. Denied authorization and failed provider calls redirect to Settings with safe result codes. The verified account identity, encrypted token and expiry are stored, followed by a subscribed-app registration. Reconnection updates the same provider-account record. Disconnect clears the local token and stops processing/sending for that account; it does not delete conversation history. Owners should also remove app authorization in Instagram if revocation at the provider is required.

Connected accounts can enqueue a conversation-history sync. The worker follows Meta cursor pagination for conversations and messages and fetches conversation/message details when list responses contain only object references. It commits each message page independently, preserves provider timestamps and IDs, and updates a durable job heartbeat and progress counters after each batch. A later provider failure therefore preserves valid earlier batches and a retry resumes idempotently. Hard page limits, a two-hour deadline, and repeated-cursor detection prevent an endless job. Repeated syncs use provider conversation/message IDs and the same message dedupe key as webhooks, so existing records are counted and skipped. The sync imports only history returned by Meta; unavailable older Requests-folder history and other provider limits cannot be reconstructed.

Alembic revision `0006_instagram_sync_safety` adds the provider conversation ID and background-job heartbeat. Apply it explicitly before starting the matching worker release; neither Gunicorn nor the worker runs migrations automatically. Web and worker must use the same `DATABASE_URL` and the same `META_TOKEN_ENCRYPTION_KEY`.

Webhook URL: `/api/webhooks/instagram`. GET validates `hub.verify_token`; POST verifies `X-Hub-Signature-256` over raw bytes before parsing. The request only persists a unique envelope and job. Worker normalization handles DMs, quick-reply/postback content and regular comments, ignoring echoes/unsupported events. Message IDs are scoped to the connected account. A replay with a different envelope still cannot create duplicate messages or flows.

The current conservative send policy permits standard replies within 24 hours of an inbound DM, or one private reply within seven days of a regular post/reel comment. Live comments and extended human-agent windows are not implemented. Attachments are represented as bounded metadata/HTTPS links; the backend never downloads arbitrary media. Links can expire, and unsupported media remains visible as unavailable rather than breaking the thread.

## Local testing

Use a disposable local database, apply Alembic explicitly, set `CRM_ENV=development` and `META_PROVIDER_MODE=mock`, then run `python -m crm.demo`. The demo command refuses Render, remote PostgreSQL hosts and non-demo SQLite filenames. It prompts for a local demo password and refuses a populated CRM. It never runs at application startup.

Automated tests exercise signed official-style envelopes through the webhook endpoint and actual job normalization; they do not need live Meta credentials. The provider network boundary is mocked for delivery and failure cases. Before production, repeat the acceptance flows with the approved test Instagram account and inspect the actual provider responses.
