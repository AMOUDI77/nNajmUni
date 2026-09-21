import { useMemo, useState } from "react";
import { write } from "../api";
import { Empty, ErrorBanner, Skeleton, useData } from "../components";
import { useCRM } from "../context";
import type { SavedReply } from "../types";

const blank: SavedReply = {
  id: 0,
  title: "",
  shortcut: "",
  content: "",
  status: "ACTIVE",
  pinned: false,
};

export default function SavedReplies({ startNew = false }: { startNew?: boolean }) {
  const { user } = useCRM();
  const editable = user?.role !== "VIEWER";
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SavedReply | null>(startNew ? blank : null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    data,
    loading,
    error: loadError,
  } = useData<SavedReply[]>("/saved-replies?include_archived=1", tick);
  const rows = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return data || [];
    return (data || []).filter((reply) =>
      [reply.title, reply.shortcut, reply.content].some((field) =>
        field.toLocaleLowerCase().includes(value.replace(/^\//, "")),
      ),
    );
  }, [data, query]);

  async function action(path: string, payload: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      await write(path, payload, method);
      setTick((value) => value + 1);
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    const ok = await action(
      "/saved-replies" + (editing.id ? "/" + editing.id : ""),
      editing,
      editing.id ? "PATCH" : "POST",
    );
    if (ok) setEditing(null);
  }

  return (
    <section className="crm-editor-section crm-saved-replies-page">
      <header className="crm-section-heading">
        <div>
          <h2>Saved replies</h2>
          <p className="crm-muted">
            Reuse trusted answers. Counselors can always edit before sending.
          </p>
        </div>
        {editable && (
          <button className="crm-primary" onClick={() => setEditing(blank)}>
            + New reply
          </button>
        )}
      </header>
      <input
        aria-label="Search saved replies"
        placeholder="Search title, shortcut or response…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ErrorBanner message={error || loadError} />
      {editing && (
        <div className="crm-saved-reply-editor">
          <div className="crm-form-grid">
            <label>
              Name
              <input
                autoFocus
                maxLength={100}
                value={editing.title}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <label>
              Shortcut
              <div className="crm-shortcut-input">
                <span>/</span>
                <input
                  maxLength={32}
                  placeholder="visa"
                  value={editing.shortcut}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      shortcut: event.target.value
                        .toLocaleLowerCase()
                        .replace(/[^a-z0-9_-]/g, ""),
                    })
                  }
                />
              </div>
            </label>
          </div>
          <label>
            Response
            <textarea
              rows={7}
              dir="auto"
              maxLength={4000}
              value={editing.content}
              onChange={(event) =>
                setEditing({ ...editing, content: event.target.value })
              }
            />
          </label>
          <small className="crm-muted">
            Optional variables: {"{{first_name}}"}, {"{{university}}"},{" "}
            {"{{program}}"}
          </small>
          <label className="crm-pin-reply">
            <input
              type="checkbox"
              checked={editing.pinned}
              onChange={(event) =>
                setEditing({ ...editing, pinned: event.target.checked })
              }
            />
            Pin in the Inbox picker
          </label>
          <footer>
            <button onClick={() => setEditing(null)}>Cancel</button>
            <button
              className="crm-primary"
              disabled={
                busy ||
                !editing.title.trim() ||
                !editing.shortcut ||
                !editing.content.trim()
              }
              onClick={save}
            >
              Save reply
            </button>
          </footer>
        </div>
      )}
      {loading && !data ? (
        <Skeleton />
      ) : rows.length ? (
        <div className="crm-saved-reply-list">
          {rows.map((reply) => (
            <article
              key={reply.id}
              className={reply.status === "ARCHIVED" ? "archived" : ""}
            >
              <div>
                <strong>{reply.title}</strong>
                <code>/{reply.shortcut}</code>
                {reply.pinned && <span className="crm-tag">Pinned</span>}
                <span className="crm-tag">{reply.status.toLowerCase()}</span>
                <p dir="auto">{reply.content}</p>
              </div>
              {editable && (
                <div className="crm-row-actions">
                  <button onClick={() => setEditing(reply)}>Edit</button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/saved-replies/${reply.id}`,
                        { pinned: !reply.pinned },
                        "PATCH",
                      )
                    }
                  >
                    {reply.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(`/saved-replies/${reply.id}/duplicate`, {})
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/saved-replies/${reply.id}`,
                        {
                          status:
                            reply.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                        },
                        "PATCH",
                      )
                    }
                  >
                    {reply.status === "ACTIVE" ? "Archive" : "Restore"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No saved replies"
          detail="Create your first reusable answer for fees, visas or required documents."
        />
      )}
    </section>
  );
}
