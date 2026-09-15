import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { crmApi, write } from "../api";
import Copilot from "./Copilot";
import {
  Avatar,
  date,
  Empty,
  ErrorBanner,
  Skeleton,
  useData,
  useDebounce,
} from "../components";
import { useCRM } from "../context";
import ContactPanel from "../contacts/ContactPanel";
import type {
  Conversation,
  Contact,
  Label,
  Message,
  Page,
  Staff,
} from "../types";

export default function Inbox() {
  const { conversationId } = useParams();
  const { user, ar } = useCRM();
  const [q, setQ] = useState(""),
    [view, setView] = useState("all"),
    [label, setLabel] = useState(""),
    [sort, setSort] = useState("newest"),
    [offset, setOffset] = useState(0),
    [tick, setTick] = useState(0);
  const search = useDebounce(q);
  const refresh = () => setTick((t) => t + 1);
  useEffect(() => {
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setOffset(0), [search, view, label, sort]);
  const {
    data: page,
    loading,
    error,
  } = useData<Page<Conversation>>(
    `/conversations?q=${encodeURIComponent(search)}&view=${view}&label=${label}&sort=${sort}&offset=${offset}`,
    tick,
  );
  const { data: labels } = useData<Label[]>("/labels");
  const filters = [
    ["all", "All conversations", "كل المحادثات"],
    ["unread", "Unread", "غير مقروءة"],
    ["unassigned", "Unassigned", "غير مسندة"],
    ["mine", "Assigned to me", "مسندة إليّ"],
    ["attention", "Needs attention", "تحتاج متابعة"],
  ];
  return (
    <div className={"crm-inbox " + (conversationId ? "has-thread" : "")}>
      <aside className="crm-inbox-nav">
        <header>
          <h1>{ar ? "المحادثات" : "Inbox"}</h1>
          <span className="crm-muted">NajmUni Conversations</span>
        </header>
        <div className="crm-filters">
          {filters.map(([key, en, arabic]) => (
            <button
              key={key}
              className={view === key && !label ? "selected" : ""}
              onClick={() => {
                setView(key);
                setLabel("");
              }}
            >
              {ar ? arabic : en}
            </button>
          ))}
        </div>
        <div className="crm-filter-labels">
          <h3>{ar ? "التصنيفات" : "LABELS"}</h3>
          {labels
            ?.filter((l) => !l.archived)
            .map((l) => (
              <button
                key={l.id}
                className={label === String(l.id) ? "selected" : ""}
                onClick={() => {
                  setLabel(String(l.id));
                  setView("all");
                }}
              >
                <i style={{ background: l.color }} />
                {l.name}
              </button>
            ))}
          <Link to="/crm/settings/labels">Manage labels</Link>
        </div>
        <footer>
          <span className="crm-status-dot" /> {user?.full_name}
        </footer>
      </aside>
      <section className="crm-conversation-list">
        <header>
          <input
            aria-label="Search conversations"
            placeholder={ar ? "ابحث في المحادثات…" : "Search conversations…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="crm-list-toolbar">
            <select
              aria-label="Conversation filter"
              value={view}
              onChange={(e) => {
                setView(e.target.value);
                setLabel("");
              }}
            >
              {filters.map(([key, en, arabic]) => (
                <option key={key} value={key}>
                  {ar ? arabic : en}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort conversations"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </header>
        <ErrorBanner message={error} retry={refresh} />
        <div className="crm-list-scroll">
          {loading && !page ? (
            <Skeleton />
          ) : page?.items.length ? (
            page.items.map((c) => (
              <Link
                to={"/crm/inbox/" + c.id}
                className={
                  "crm-conversation-row " +
                  (conversationId === String(c.id) ? "active" : "")
                }
                key={c.id}
              >
                <Avatar name={c.display_name} />
                <div>
                  <div className="crm-row-heading">
                    <strong dir="auto">{c.display_name}</strong>
                    <time>
                      {c.last_message_at
                        ? new Date(c.last_message_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </time>
                  </div>
                  <p dir="auto">{c.preview || "New conversation"}</p>
                  <div className="crm-row-meta">
                    <span>◎ Instagram</span>
                    {c.assignee_name && (
                      <span>{c.assignee_name.split(" ")[0]}</span>
                    )}
                    {c.labels.slice(0, 1).map((l) => (
                      <span className="crm-mini-tag" key={l.id}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
                {c.unread && (
                  <i className="crm-unread-dot" aria-label="Unread" />
                )}
              </Link>
            ))
          ) : (
            <Empty
              title="No conversations found"
              detail="New Instagram conversations will appear here. Try another filter or check your integration."
            />
          )}
        </div>
        <footer className="crm-pagination">
          <button
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 40))}
          >
            Previous
          </button>
          <button
            disabled={!page?.next_offset}
            onClick={() => setOffset(page?.next_offset || 0)}
          >
            Next
          </button>
        </footer>
      </section>
      {conversationId ? (
        <Thread
          key={conversationId}
          id={Number(conversationId)}
          tick={tick}
          refresh={refresh}
        />
      ) : (
        <Empty
          title={ar ? "مساحة لكل بداية" : "A space for every new beginning"}
          detail={
            ar
              ? "اختر محادثة لمتابعة رحلة الطالب."
              : "Select a conversation to help a student take their next step."
          }
        >
          <Link to="/crm/settings/integrations">Connect Instagram →</Link>
        </Empty>
      )}
    </div>
  );
}

function Thread({
  id,
  tick,
  refresh,
}: {
  id: number;
  tick: number;
  refresh: () => void;
}) {
  const { user, ar } = useCRM();
  const navigate = useNavigate();
  const editable = user?.role !== "VIEWER";
  const { data: conversation, error } = useData<Conversation>(
    "/conversations/" + id,
    tick,
  );
  const { data: page } = useData<Page<Message>>(
    `/conversations/${id}/messages`,
    tick,
  );
  const { data: contact } = useData<Contact>(
    conversation ? "/contacts/" + conversation.contact_id : null,
    tick,
  );
  const { data: team } = useData<Staff[]>("/team");
  const [details, setDetails] = useState(false),
    [failure, setFailure] = useState(""),
    [noteMode, setNoteMode] = useState(false),
    [busy, setBusy] = useState(false);
  const draftKey = `crm-draft:${user?.id}:${id}`;
  const [draft, setDraft] = useState(
    () => sessionStorage.getItem(draftKey) || "",
  );
  const [older, setOlder] = useState<Message[]>([]),
    [before, setBefore] = useState<number | null>(null);
  const requestId = useRef(crypto.randomUUID()),
    lastSentText = useRef("");
  useEffect(() => {
    sessionStorage.setItem(draftKey, draft);
  }, [draft, draftKey]);
  const list = useRef<HTMLDivElement>(null),
    lastCount = useRef(0);
  useEffect(() => {
    if (page && page.items.length !== lastCount.current) {
      list.current?.scrollTo({
        top: list.current.scrollHeight,
        behavior: "smooth",
      });
      lastCount.current = page.items.length;
    }
  }, [page]);
  async function change(values: unknown) {
    try {
      await write("/conversations/" + id, values, "PATCH");
      refresh();
    } catch (e) {
      setFailure((e as Error).message);
    }
  }
  async function submit() {
    if (!draft.trim() || busy || !conversation) return;
    setBusy(true);
    setFailure("");
    if (draft !== lastSentText.current) {
      requestId.current = crypto.randomUUID();
      lastSentText.current = draft;
    }
    try {
      if (noteMode)
        await write(`/contacts/${conversation.contact_id}/notes`, {
          text: draft,
        });
      else
        await write(`/conversations/${id}/messages`, {
          text: draft,
          request_id: requestId.current,
        });
      setDraft("");
      requestId.current = crypto.randomUUID();
      refresh();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadOlder() {
    try {
      const r = await crmApi<Page<Message>>(
        `/conversations/${id}/messages?before=${before || page?.next_cursor}`,
      );
      setOlder((v) => [...r.items, ...v]);
      setBefore(r.next_cursor ?? -1);
    } catch (e) {
      setFailure((e as Error).message);
    }
  }
  if (!conversation)
    return (
      <div className="crm-thread">
        <ErrorBanner message={error} />
        <Skeleton />
      </div>
    );
  const allMessages = [...older, ...(page?.items || [])];
  return (
    <div className={"crm-thread-layout " + (details ? "show-details" : "")}>
      <section className="crm-thread">
        <header className="crm-thread-header">
          <button
            className="crm-mobile-back"
            aria-label="Back to conversations"
            onClick={() => navigate("/crm/inbox")}
          >
            ←
          </button>
          <Avatar name={contact?.display_name || "Instagram"} />
          <div className="crm-thread-title">
            <strong dir="auto">{contact?.display_name}</strong>
            <small>
              ◎ Instagram{" "}
              {conversation.username ? "· @" + conversation.username : ""}
            </small>
          </div>
          <button
            className="crm-context-toggle"
            onClick={() => setDetails(!details)}
            aria-expanded={details}
          >
            Contact
          </button>
        </header>
        <div className="crm-thread-actions">
          <select
            aria-label="Assigned counselor"
            disabled={!editable}
            value={conversation.assigned_to || ""}
            onChange={(e) =>
              change({
                assigned_to: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Unassigned</option>
            {team
              ?.filter((s) => s.status === "ACTIVE" && s.role !== "VIEWER")
              .map((s) => (
                <option value={s.id} key={s.id}>
                  {s.full_name}
                </option>
              ))}
          </select>
          <button
            disabled={!editable}
            className={
              conversation.control === "HUMAN"
                ? "crm-takeover active"
                : "crm-takeover"
            }
            onClick={() =>
              change({
                control: conversation.control === "HUMAN" ? "SUGGEST" : "HUMAN",
              })
            }
          >
            {conversation.control === "HUMAN" ? "Human handling" : "Take over"}
          </button>
          <button
            disabled={!editable}
            onClick={() => change({ unread: !conversation.unread })}
          >
            {conversation.unread ? "Mark read" : "Mark unread"}
          </button>
          <button
            disabled={!editable}
            onClick={() =>
              change({
                status: conversation.status === "OPEN" ? "CLOSED" : "OPEN",
              })
            }
          >
            {conversation.status === "OPEN" ? "Close" : "Reopen"}
          </button>
        </div>
        <ErrorBanner message={failure || error} retry={refresh} />
        <div className="crm-messages" ref={list}>
          {before !== -1 && (before || page?.next_cursor) && (
            <button className="crm-load-older" onClick={loadOlder}>
              Load earlier messages
            </button>
          )}
          {allMessages.map((m, index) => (
            <div key={m.id}>
              {(!index ||
                allMessages[index - 1].created_at.slice(0, 10) !==
                  m.created_at.slice(0, 10)) && (
                <div className="crm-date-separator">
                  {new Date(m.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              )}
              <article
                className={
                  "crm-message " +
                  (m.direction === "OUTBOUND" ? "outbound" : "inbound")
                }
              >
                {m.message_type === "comment" && (
                  <small>Instagram comment</small>
                )}
                {m.sender_type === "AUTOMATION" && <small>Automation</small>}
                <p dir="auto">{m.text}</p>
                {m.attachments.map((a, i) => (
                  <div className="crm-attachment" key={i}>
                    {a.url && a.url.startsWith("https://") ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        Open {a.type} ↗
                      </a>
                    ) : (
                      <span>Attachment unavailable</span>
                    )}
                  </div>
                ))}
                <footer>
                  <time dir="ltr">
                    {new Date(
                      m.provider_timestamp || m.created_at,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {m.direction === "OUTBOUND" && (
                    <span
                      className={
                        ["FAILED", "UNCERTAIN"].includes(m.status)
                          ? "crm-send-error"
                          : ""
                      }
                    >
                      {m.status.toLowerCase()}
                    </span>
                  )}
                </footer>
                {m.safe_error && (
                  <div role="status" className="crm-message-error">
                    {m.safe_error}
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>
        {editable ? (
          <div className={"crm-composer " + (noteMode ? "note-mode" : "")}>
            <div className="crm-composer-tabs">
              <button
                className={!noteMode ? "active" : ""}
                onClick={() => setNoteMode(false)}
              >
                {ar ? "رد" : "Reply"}
              </button>
              <button
                className={noteMode ? "active" : ""}
                onClick={() => setNoteMode(true)}
              >
                {ar ? "ملاحظة خاصة" : "Private note"}
              </button>
              <span>
                {noteMode
                  ? "Only visible to your team"
                  : "Instagram direct message"}
              </span>
            </div>
            {!noteMode && conversation.send_blocked_reason && (
              <p className="crm-policy" role="status">
                {conversation.send_blocked_reason}
              </p>
            )}
            <textarea
              aria-label={noteMode ? "Private note" : "Reply message"}
              placeholder={
                noteMode
                  ? "Write a private team note…"
                  : ar
                    ? "اكتب ردك هنا…"
                    : "Write a thoughtful reply…"
              }
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <footer>
              <small>Ctrl / ⌘ + Enter to {noteMode ? "save" : "send"}</small>
              <button
                className="crm-primary"
                disabled={
                  busy ||
                  !draft.trim() ||
                  (!noteMode && !!conversation.send_blocked_reason)
                }
                onClick={submit}
              >
                {busy ? "Saving…" : noteMode ? "Save note" : "Send reply ↗"}
              </button>
            </footer>
          </div>
        ) : (
          <div className="crm-readonly">
            You have read-only access to this workspace.
          </div>
        )}
      </section>
      <div className="crm-details-wrap">
        <button className="crm-drawer-close" onClick={() => setDetails(false)}>
          Close contact panel ×
        </button>
        {editable && (
          <Copilot
            id={id}
            tick={tick}
            refresh={refresh}
            onUse={(text) => {
              setNoteMode(false);
              setDraft(text);
              setDetails(false);
            }}
          />
        )}
        <ContactPanel
          id={conversation.contact_id}
          refresh={tick}
          onChange={refresh}
        />
      </div>
    </div>
  );
}
