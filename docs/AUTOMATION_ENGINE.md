# Automation engine

CRM automations are linear, versioned rule definitions stored in PostgreSQL. Owners/admins create drafts, edit, activate, pause and duplicate them. Active sessions snapshot their step list, so editing a definition affects new runs without changing a student’s current questions.

Supported triggers are DM, comment and postback. DM rules can run for every matching keyword, only for the first message in a conversation, or for the first message after a configured inactivity period. This prevents a welcome flow from repeating on every student message. Keywords support contains/exact matching, case folding, Arabic diacritic/tatweel removal and conservative alef normalization. Comment triggers may target one media ID. One matching rule is selected by priority and ID. The default repeat cooldown is one hour per conversation/rule.

Actions: send message, ask question, wait for reply, branch to a later step, add/remove label, create a linked lead, fill an empty study field, assign a counselor, human handoff and stop. `LINK_OR_UPDATE_LEAD` currently uses the safe create/link-if-missing behavior; it does not overwrite an existing lead. Reply collection also fills empty contact fields only. Branches are forward-only; definitions and execution are bounded to 30 steps.

Session position, waiting field, snapshot, last event identity and seven-day expiry are durable. Ingestion deduplicates messages before invoking the engine; run event keys are also unique. A repeated envelope cannot advance a question twice. Paused rules stop waiting-session advancement. Incoming `stop`, `unsubscribe`, `توقف` or `الغاء` places the conversation under human control. HUMAN/OFF control suppresses automatic sends, including messages still queued when control changes.

Comment workflows can send one private response, then must wait for a user DM before more messages. The builder rejects consecutive comment-triggered sends without a waiting step. A comment alone never opens the standard DM window. The shared outbound path rechecks account connection, control state and the applicable window at delivery time. It does not broadcast or bypass Meta restrictions.

Runs show status and safe errors in the builder. Outbound failures appear on the conversation message. Worker jobs retry processing failures with a bounded backoff. Ambiguous provider sends are never retried automatically; counselors reconcile them first. The engine does not execute user code or arbitrary JavaScript.

Tests cover Arabic matching, a persisted question flow, lead creation, duplicate suppression, private-comment response and worker concurrency. Live Meta payload and permission validation is still required before connecting a production account.
