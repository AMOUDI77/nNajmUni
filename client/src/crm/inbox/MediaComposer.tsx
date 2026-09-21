import { useEffect, useRef, useState } from "react";
import { uploadWithProgress } from "../api";
import type { ChannelCapabilities } from "../types";

type Draft = { file: File; url: string; kind: "image" | "file" };
const drafts = new Map<number, Draft>();
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_FILE = 10 * 1024 * 1024;

export function validateMedia(file: File, requested: "image" | "file") {
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (requested === "image" && !imageTypes.includes(file.type)) return "Choose a JPEG, PNG, GIF, or WebP image.";
  if (requested === "file" && ![...imageTypes, "application/pdf"].includes(file.type)) return "This file type cannot be sent through Instagram.";
  if (file.size > (requested === "image" ? MAX_IMAGE : MAX_FILE)) return requested === "image" ? "Images must be smaller than 8 MB." : "Files must be smaller than 10 MB.";
  return "";
}

export default function MediaComposer({ conversationId, capabilities, text, blockedReason, onSent, incomingFile }: {
  conversationId: number;
  capabilities: ChannelCapabilities;
  text: string;
  blockedReason?: string | null;
  onSent: () => void;
  incomingFile?: { file: File; token: string } | null;
}) {
  const [draft, setDraft] = useState<Draft | undefined>(() => drafts.get(conversationId));
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const imageInput = useRef<HTMLInputElement>(null), fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(drafts.get(conversationId)), [conversationId]);
  useEffect(() => {
    if (incomingFile) choose(incomingFile.file, incomingFile.file.type.startsWith("image/") ? "image" : "file");
  }, [incomingFile]);

  function choose(file: File, kind: "image" | "file") {
    const problem = validateMedia(file, kind);
    if (problem) { setError(problem); return; }
    const previous = drafts.get(conversationId);
    if (previous) URL.revokeObjectURL(previous.url);
    const next = { file, kind, url: URL.createObjectURL(file) };
    drafts.set(conversationId, next);
    setDraft(next);
    setError("");
  }
  function remove() {
    if (draft) URL.revokeObjectURL(draft.url);
    drafts.delete(conversationId);
    setDraft(undefined);
    setError("");
  }
  async function send(close: boolean) {
    if (!draft || progress !== null || blockedReason) return;
    const form = new FormData();
    form.append("file", draft.file);
    form.append("text", text.trim());
    form.append("request_id", crypto.randomUUID());
    form.append("close_after_send", String(close));
    setProgress(0); setError("");
    try {
      await uploadWithProgress(`/conversations/${conversationId}/media`, form, setProgress);
      remove(); onSent();
    } catch (reason) {
      setError((reason as Error).message);
    } finally { setProgress(null); }
  }
  const imageDisabled = !capabilities.canSendImage;
  const fileDisabled = !capabilities.canSendAttachment;
  return <>
    <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0], "image")} />
    <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0], "file")} />
    <button title={imageDisabled ? "Images are unavailable for this Instagram connection" : "Send image"} aria-label="Choose image" disabled={imageDisabled} onClick={() => imageInput.current?.click()}>▧</button>
    <button title={fileDisabled ? "Attachments are unavailable for this Instagram connection" : "Attach file"} aria-label="Choose attachment" disabled={fileDisabled} onClick={() => fileInput.current?.click()}>⌕</button>
    {draft && <div className="crm-media-draft" data-testid="media-draft">
      {draft.kind === "image" && <img src={draft.url} alt="Selected upload preview" />}
      <span><strong>{draft.file.name}</strong><small>{Math.ceil(draft.file.size / 1024)} KB</small></span>
      <button aria-label="Remove attachment" onClick={remove}>×</button>
      {progress !== null && <progress aria-label="Upload progress" max="100" value={progress} />}
      <button className="crm-primary" disabled={!!blockedReason || progress !== null} onClick={() => send(false)}>Send media</button>
      <button disabled={!!blockedReason || progress !== null} onClick={() => send(true)}>Send & Close</button>
    </div>}
    {error && <span className="crm-media-error" role="alert">{error}</span>}
  </>;
}

export function mediaFromTransfer(transfer: DataTransfer | null) {
  return transfer?.files?.[0] || null;
}
