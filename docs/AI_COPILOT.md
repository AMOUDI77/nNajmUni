# AI Copilot

The CRM uses Anthropic for counselor-reviewed drafts. It does not implement automatic AI sending. Settings allow OFF/SUGGEST; AUTO is disabled server-side, not merely hidden in the interface.

Draft requests create durable jobs. Context is limited to the current contact’s profile, 20 recent conversation messages, prior summary, 20 memory facts, up to 8 published knowledge articles and 10 relevant catalog rows. Contact email/phone and private staff notes are excluded. No tool or unrestricted database query is available to the model. The prompt separates trusted catalog/knowledge from untrusted conversations/memories and instructs the model to escalate consequential admission, scholarship, visa, legal or payment decisions.

Only validated JSON drafts/facts are persisted. Facts require a supported field, an inbound source message ID from this conversation, a bounded string value and confidence between 0 and 1. Memory records do not overwrite the contact profile, existing leads or students. A counselor can verify a memory item through the CRM API. Summaries are stored separately; original messages remain unchanged.

The Inbox exposes one AI control with Suggest Reply, Summarize Conversation and What Should I Ask Next. Reply and next-question results provide Use, Edit, Regenerate and Dismiss; summaries stay counselor-only. These actions are product feedback, not foundation-model training. Failed AI calls expose a safe status and allow manual replies. Input/output token counts are recorded per successful suggestion. Missing `ANTHROPIC_API_KEY` disables generation with a clear error. `CRM_CLAUDE_MODEL` defaults to the existing NajmUni Haiku model; verify account availability before rollout.

Prompt instructions are a mitigation, not a guarantee against malicious input. Human review is mandatory in V1. Only publish knowledge that is appropriate to use in student-facing guidance. Establish the organization’s retention, access and Anthropic data-processing policy before processing real student messages.
