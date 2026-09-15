import { useState } from "react";
import { write } from "../api";
import { ErrorBanner, useData } from "../components";
type Suggestion = {
  id: number;
  status: string;
  text: string;
  feedback?: string;
  safe_error?: string;
  evidence?: { escalate?: boolean };
};
export default function Copilot({
  id,
  tick,
  onUse,
  refresh,
}: {
  id: number;
  tick: number;
  onUse: (text: string, sid: number) => void;
  refresh: () => void;
}) {
  const { data } = useData<Suggestion[]>(
    `/conversations/${id}/suggestions`,
    tick,
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const suggestion = data?.find((s) => !s.feedback);
  async function request() {
    setBusy(true);
    setError("");
    try {
      if (suggestion?.status === "READY")
        await write(
          `/conversations/${id}/suggestions/${suggestion.id}`,
          { feedback: "REGENERATED" },
          "PATCH",
        );
      await write(`/conversations/${id}/suggestions`, {});
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function feedback(value: string) {
    if (!suggestion) return;
    try {
      await write(
        `/conversations/${id}/suggestions/${suggestion.id}`,
        { feedback: value },
        "PATCH",
      );
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="crm-copilot">
      <header>
        <span>✦ AI Copilot</span>
        <button
          disabled={busy || suggestion?.status === "QUEUED"}
          onClick={request}
        >
          {busy || suggestion?.status === "QUEUED"
            ? "Preparing draft…"
            : suggestion?.status === "READY"
              ? "Regenerate"
              : "Suggest a reply"}
        </button>
      </header>
      <ErrorBanner
        message={
          error ||
          (suggestion?.status === "FAILED" && suggestion.safe_error) ||
          ""
        }
      />
      {suggestion?.status === "READY" && (
        <>
          <p dir="auto">{suggestion.text}</p>
          {suggestion.evidence?.escalate && (
            <small className="crm-policy">
              Counselor judgment required. Verify consequential details before
              sending.
            </small>
          )}
          <footer>
            <button
              onClick={() => {
                onUse(suggestion.text, suggestion.id);
                void feedback("ACCEPTED");
              }}
            >
              Use draft
            </button>
            <button
              onClick={() => {
                onUse(suggestion.text, suggestion.id);
                void feedback("EDITED");
              }}
            >
              Edit in composer
            </button>
            <button onClick={() => feedback("DISMISSED")}>Dismiss</button>
          </footer>
        </>
      )}
    </div>
  );
}
