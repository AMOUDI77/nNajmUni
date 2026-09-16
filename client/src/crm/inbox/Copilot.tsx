import { useState } from "react";
import { write } from "../api";
import { ErrorBanner, useData } from "../components";

type Kind = "SUGGEST_REPLY" | "SUMMARIZE" | "NEXT_QUESTION";
type Suggestion = {
  id: number;
  status: string;
  text: string;
  feedback?: string;
  safe_error?: string;
  evidence?: { escalate?: boolean; kind?: Kind };
};

export default function Copilot({ id, tick, onUse, refresh }: {
  id: number;
  tick: number;
  onUse: (text: string, sid: number) => void;
  refresh: () => void;
}) {
  const { data } = useData<Suggestion[]>(`/conversations/${id}/suggestions`, tick);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestion = data?.find((item) => !item.feedback);
  const kind = suggestion?.evidence?.kind || "SUGGEST_REPLY";

  async function request(nextKind: Kind) {
    setBusy(true);
    setError("");
    try {
      if (suggestion?.status === "READY") {
        await write(`/conversations/${id}/suggestions/${suggestion.id}`, { feedback: "REGENERATED" }, "PATCH");
      }
      await write(`/conversations/${id}/suggestions`, { kind: nextKind });
      refresh();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function feedback(value: string) {
    if (!suggestion) return;
    try {
      await write(`/conversations/${id}/suggestions/${suggestion.id}`, { feedback: value }, "PATCH");
      refresh();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const title = {
    SUGGEST_REPLY: "Suggested reply",
    SUMMARIZE: "Conversation summary",
    NEXT_QUESTION: "Best next question",
  }[kind];
  const disabled = busy || suggestion?.status === "QUEUED";
  return (
    <div className="crm-copilot">
      <header>
        <span>✦ AI Copilot</span>
        <small>Creates drafts only. You decide what gets sent.</small>
      </header>
      <div className="crm-copilot-actions">
        <button disabled={disabled} onClick={() => request("SUGGEST_REPLY")}>Suggest reply</button>
        <button disabled={disabled} onClick={() => request("SUMMARIZE")}>Summarize</button>
        <button disabled={disabled} onClick={() => request("NEXT_QUESTION")}>Next question</button>
      </div>
      {disabled && <small>Preparing…</small>}
      <ErrorBanner message={error || (suggestion?.status === "FAILED" && suggestion.safe_error) || ""} />
      {suggestion?.status === "READY" && (
        <>
          <strong>{title}</strong>
          <p dir="auto">{suggestion.text}</p>
          {suggestion.evidence?.escalate && (
            <small className="crm-policy">Counselor judgment required. Verify consequential details before sending.</small>
          )}
          <footer>
            {kind !== "SUMMARIZE" && (
              <>
                <button onClick={() => { onUse(suggestion.text, suggestion.id); void feedback("ACCEPTED"); }}>Use draft</button>
                <button onClick={() => { onUse(suggestion.text, suggestion.id); void feedback("EDITED"); }}>Edit in composer</button>
              </>
            )}
            <button onClick={() => request(kind)}>Regenerate</button>
            <button onClick={() => feedback("DISMISSED")}>Dismiss</button>
          </footer>
        </>
      )}
    </div>
  );
}
