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
import SavedReplies from "../settings/SavedReplies";
import VoiceRecorder, { AudioBubble } from "./VoiceRecorder";
import MediaComposer, { mediaFromTransfer } from "./MediaComposer";
import type {
  Conversation,
  ConversationContext,
  ConversationEvent,
  ConversationSource,
  Contact,
  Label,
  Message,
  Page,
  Staff,
  SavedReply,
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
    ["all", "All", "كل المحادثات"],
    ["open", "Open chats", "المحادثات المفتوحة"],
    ["unread", "Unread", "غير مقروءة"],
    ["mine", "Mine", "مسندة إليّ"],
    ["unassigned", "Unassigned", "غير مسندة"],
    ["reminders", "Reminders", "التذكيرات"],
    ["due", "Follow-up due", "متابعة مستحقة"],
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
            <select aria-label="Channel" defaultValue="instagram">
              <option value="instagram">Instagram</option>
            </select>
            {(view !== "all" || label || sort !== "newest" || q) && (
              <button
                onClick={() => {
                  setView("all");
                  setLabel("");
                  setSort("newest");
                  setQ("");
                }}
              >
                Reset
              </button>
            )}
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
                    <span>
                      ◎ {c.source_type === "instagram_reel_comment"
                        ? "Reel comment"
                        : c.source_type === "instagram_post_comment"
                          ? "Post comment"
                          : "Instagram"}
                    </span>
                    {c.assignee_name && (
                      <span>{c.assignee_name.split(" ")[0]}</span>
                    )}
                    {c.labels.slice(0, 1).map((l) => (
                      <span className="crm-mini-tag" key={l.id}>
                        {l.name}
                      </span>
                    ))}
                    {c.reminder_at && (
                      <span className="crm-mini-tag">⏰ {date(c.reminder_at)}</span>
                    )}
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
  const { data: context } = useData<ConversationContext>(
    `/conversations/${id}/context`,
    tick,
  );
  const { data: contact } = useData<Contact>(
    conversation ? "/contacts/" + conversation.contact_id : null,
    tick,
  );
  const { data: team } = useData<Staff[]>("/team");
  const { data: labels } = useData<Label[]>("/labels");
  const { data: savedReplies } = useData<SavedReply[]>("/saved-replies", tick);
  const { data: recentReplies } = useData<SavedReply[]>(
    "/saved-replies?recent=1",
    tick,
  );
  const [details, setDetails] = useState(false),
    [failure, setFailure] = useState(""),
    [noteMode, setNoteMode] = useState(false),
    [busy, setBusy] = useState(false),
    [aiOpen, setAiOpen] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false),
    [manageReplies, setManageReplies] = useState(false),
    [newReply, setNewReply] = useState(false),
    [replyTab, setReplyTab] = useState<"recent" | "pinned" | "team" | "all">("recent"),
    [replyPickerOpen, setReplyPickerOpen] = useState(false),
    [replySearch, setReplySearch] = useState(""),
    [incomingFile, setIncomingFile] = useState<{ file: File; token: string } | null>(null),
    [lightbox, setLightbox] = useState(""),
    [dragActive, setDragActive] = useState(false),
    [customReminder, setCustomReminder] = useState(""),
    [caret, setCaret] = useState(0),
    [replyIndex, setReplyIndex] = useState(0);
  const draftKey = `crm-draft:${user?.id}:${id}`;
  const [draft, setDraft] = useState(
    () => sessionStorage.getItem(draftKey) || "",
  );
  const [older, setOlder] = useState<Message[]>([]),
    [before, setBefore] = useState<number | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null),
    requestId = useRef(crypto.randomUUID()),
    lastSentText = useRef("");
  const capabilities = conversation?.capabilities || {
    canSendText: true,
    canSendImage: false,
    canSendAttachment: false,
    canSendAudio: false,
    canSendVoiceRecording: false,
    canSendTemplate: false,
    canSendQuickReplies: false,
  };
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
  async function submit(closeAfterSend = false) {
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
          close_after_send: closeAfterSend,
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
  const command = !noteMode
    ? draft.slice(0, caret).match(/(?:^|\s)\/([a-z0-9_-]*)$/i)
    : null;
  const replyQuery = (command?.[1] ?? replySearch).toLocaleLowerCase();
  const replyPool = replyQuery
    ? savedReplies || []
    : replyTab === "recent" && recentReplies?.length
      ? recentReplies
      : replyTab === "pinned"
        ? (savedReplies || []).filter((reply) => reply.pinned)
        : savedReplies || [];
  const replyMatches = replyPickerOpen
    ? replyPool
        .filter((reply) =>
          [reply.shortcut, reply.title, reply.content].some((value) =>
            value.toLocaleLowerCase().includes(replyQuery),
          ),
        )
        .slice(0, 8)
    : [];
  function chooseReply(reply: SavedReply) {
    if (!contact) return;
    const start = command ? draft.slice(0, caret).lastIndexOf("/") : caret;
    const variables: Record<string, string | undefined> = {
      first_name: contact.display_name.trim().split(/\s+/)[0],
      university: contact.university_interests,
      program: contact.program_interests,
    };
    const content = reply.content.replace(
      /{{(first_name|university|program)}}/g,
      (token, key: string) => variables[key] || token,
    );
    const next = draft.slice(0, start) + content + draft.slice(caret);
    const nextCaret = start + content.length;
    setDraft(next);
    setCaret(nextCaret);
    setReplyIndex(0);
    setReplyPickerOpen(false);
    setReplySearch("");
    void write(`/saved-replies/${reply.id}/use`, { conversation_id: id }).catch(
      () => undefined,
    );
    requestAnimationFrame(() => {
      composer.current?.focus();
      composer.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }
  async function setReminder(payload: unknown) {
    try {
      await write(`/conversations/${id}/reminders`, payload);
      setCustomReminder("");
      refresh();
    } catch (reason) {
      setFailure((reason as Error).message);
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
  const displayMessages = context?.source
    ? allMessages.filter((message) => message.message_type !== "comment")
    : allMessages;
  const timeline = [
    ...displayMessages.map((message) => ({
      kind: "message" as const,
      at: message.provider_timestamp || message.created_at,
      message,
    })),
    ...(context?.events || []).map((event) => ({
      kind: "event" as const,
      at: event.created_at,
      event,
    })),
  ].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
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
          <span className={`crm-conversation-state ${conversation.status.toLowerCase()}`}>
            {conversation.status === "OPEN" ? "Open" : "Closed"}
          </span>
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
          <details className="crm-action-menu">
            <summary>Labels</summary>
            <div>
              {labels
                ?.filter((item) => !item.archived)
                .map((item) => {
                  const selected = contact?.labels?.some((label) => label.id === item.id);
                  return (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={!!selected}
                        disabled={!editable}
                        onChange={() => {
                          if (!contact) return;
                          void write(
                            `/contacts/${contact.id}/labels/${item.id}`,
                            {},
                            selected ? "DELETE" : "PUT",
                          )
                            .then(refresh)
                            .catch((reason) => setFailure(reason.message));
                        }}
                      />
                      <i style={{ background: item.color }} /> {item.name}
                    </label>
                  );
                })}
            </div>
          </details>
          <details className="crm-action-menu">
            <summary>⏰ Reminder</summary>
            <div>
              {[
                ["later_today", "Later today"],
                ["tomorrow", "Tomorrow"],
                ["three_days", "In 3 days"],
                ["next_week", "Next week"],
              ].map(([preset, title]) => (
                <button key={preset} disabled={!editable} onClick={() => setReminder({ preset })}>
                  {title}
                </button>
              ))}
              <label>
                Pick date & time
                <input
                  type="datetime-local"
                  value={customReminder}
                  onChange={(event) => setCustomReminder(event.target.value)}
                />
              </label>
              <button
                disabled={!editable || !customReminder}
                onClick={() =>
                  setReminder({ remind_at: new Date(customReminder).toISOString() })
                }
              >
                Set custom reminder
              </button>
            </div>
          </details>
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
          {context?.reminders?.find((reminder) => reminder.status === "OPEN") && (
            <span className="crm-active-reminder">
              ⏰ {date(context.reminders.find((reminder) => reminder.status === "OPEN")?.remind_at)}
            </span>
          )}
        </div>
        <ErrorBanner message={failure || error} retry={refresh} />
        <div className="crm-messages" ref={list}>
          {before !== -1 && (before || page?.next_cursor) && (
            <button className="crm-load-older" onClick={loadOlder}>
              Load earlier messages
            </button>
          )}
          {context?.source && <SourceCard source={context.source} />}
          {timeline.map((item, index) => (
            <div key={`${item.kind}-${item.kind === "message" ? item.message.id : item.event.id}`}>
              {(!index ||
                timeline[index - 1].at.slice(0, 10) !== item.at.slice(0, 10)) && (
                <div className="crm-date-separator">
                  {new Date(item.at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              )}
              {item.kind === "event" ? (
                <SystemEventRow event={item.event} />
              ) : (
              <article
                className={
                  "crm-message " +
                  (item.message.direction === "OUTBOUND" ? "outbound" : "inbound")
                }
              >
                {item.message.sender_type === "AUTOMATION" && <small>Automation</small>}
                <p dir="auto">{item.message.text}</p>
                {item.message.attachments.map((a, i) => (
                  <div className="crm-attachment" key={i}>
                    {a.url &&
                    (a.url.startsWith("https://") || a.url.startsWith("/api/crm/media/")) ? (
                      a.type === "image" ? (
                        <button className="crm-image-attachment" onClick={() => setLightbox(a.url || "")}>
                          <img src={a.url} alt="Instagram attachment" loading="lazy" />
                        </button>
                      ) : a.type === "video" ? (
                        <video src={a.url} controls preload="metadata" />
                      ) : a.type === "audio" ? (
                        <AudioBubble url={a.url} durationMs={a.duration_ms} />
                      ) : (
                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                          Open {a.type} ↗
                        </a>
                      )
                    ) : (
                      <span>Attachment unavailable</span>
                    )}
                  </div>
                ))}
                <footer>
                  <time dir="ltr">
                    {new Date(
                      item.message.provider_timestamp || item.message.created_at,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {item.message.direction === "OUTBOUND" && (
                    <span
                      className={
                        ["FAILED", "UNCERTAIN"].includes(item.message.status)
                          ? "crm-send-error"
                          : ""
                      }
                    >
                      {item.message.status.toLowerCase()}
                    </span>
                  )}
                </footer>
                {item.message.safe_error && (
                  <div role="status" className="crm-message-error">
                    {item.message.safe_error}
                    {item.message.status === "FAILED" && (
                      <button
                        onClick={() =>
                          write(`/conversations/${id}/messages/${item.message.id}/retry`, {})
                            .then(refresh)
                            .catch((reason) => setFailure(reason.message))
                        }
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </article>
              )}
            </div>
          ))}
          {contact?.notes?.slice().reverse().map((note) => (
            <article className="crm-internal-note" key={`note-${note.id}`}>
              <small>INTERNAL NOTE · TEAM ONLY</small>
              <p dir="auto">{note.text}</p>
              <footer>{note.author_name} · {date(note.created_at)}</footer>
            </article>
          ))}
        </div>
        {editable ? (
          <div className={"crm-composer " + (noteMode ? "note-mode " : "") + (dragActive ? "drag-active" : "")}>
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
                {ar ? "ملاحظة داخلية" : "Internal Note"}
              </button>
              <span>
                {noteMode
                  ? "TEAM ONLY · Never sent to Instagram"
                  : "Send to Instagram"}
              </span>
            </div>
            {!noteMode && conversation.send_blocked_reason && (
              <p className="crm-policy" role="status">
                {conversation.send_blocked_reason}
              </p>
            )}
            {!noteMode && aiOpen && (
              <Copilot
                id={id}
                tick={tick}
                refresh={refresh}
                onUse={(text) => {
                  setDraft(text);
                  setCaret(text.length);
                  setAiOpen(false);
                }}
              />
            )}
            {!noteMode && replyPickerOpen && (
              <div
                className="crm-saved-reply-menu"
                role="listbox"
                aria-label="Saved replies"
              >
                <header>
                  <strong>Saved Replies</strong>
                  <small>↑ ↓ navigate · Enter insert · Esc close</small>
                </header>
                <input
                  aria-label="Search composer saved replies"
                  autoFocus={!command}
                  placeholder="Search saved replies…"
                  value={command ? command[1] : replySearch}
                  readOnly={!!command}
                  onChange={(event) => {
                    setReplySearch(event.target.value);
                    setReplyIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (replyMatches.length && event.key === "ArrowDown") {
                      event.preventDefault();
                      setReplyIndex((value) => (value + 1) % replyMatches.length);
                    } else if (replyMatches.length && event.key === "ArrowUp") {
                      event.preventDefault();
                      setReplyIndex((value) => (value - 1 + replyMatches.length) % replyMatches.length);
                    } else if (replyMatches.length && event.key === "Enter") {
                      event.preventDefault();
                      chooseReply(replyMatches[replyIndex]);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      setReplyPickerOpen(false);
                      composer.current?.focus();
                    }
                  }}
                />
                <nav aria-label="Saved reply categories">
                  {([
                    ["recent", "Recently Used"],
                    ["pinned", "Favorites"],
                    ["team", "Team Replies"],
                    ["all", "All Replies"],
                  ] as const).map(([key, title]) => (
                    <button
                      key={key}
                      className={replyTab === key ? "active" : ""}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setReplyTab(key);
                        setReplyIndex(0);
                      }}
                    >
                      {title}
                    </button>
                  ))}
                </nav>
                {replyMatches.map((reply, index) => (
                  <button
                    key={reply.id}
                    type="button"
                    role="option"
                    aria-selected={index === replyIndex}
                    className={index === replyIndex ? "selected" : ""}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      chooseReply(reply);
                    }}
                  >
                    <strong>/{reply.shortcut}</strong>
                    <span>{reply.title}</span>
                    <small dir="auto">{reply.content}</small>
                  </button>
                ))}
                {!replyMatches.length && (
                  <p className="crm-saved-reply-empty">No saved replies found.</p>
                )}
                <footer>
                  <button
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setNewReply(false);
                      setManageReplies(true);
                      setReplyPickerOpen(false);
                    }}
                  >
                    Manage
                  </button>
                  <button
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setNewReply(true);
                      setManageReplies(true);
                      setReplyPickerOpen(false);
                    }}
                  >
                    + New
                  </button>
                </footer>
              </div>
            )}
            {!noteMode && emojiOpen && (
              <div className="crm-emoji-picker" aria-label="Emoji picker">
                {["👍", "😊", "🎓", "✅", "🙏", "📚"].map((emoji) => (
                  <button
                    key={emoji}
                    title={`Insert ${emoji}`}
                    onClick={() => {
                      setDraft((value) => value + emoji);
                      setEmojiOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {dragActive && <div className="crm-drop-target">Drop a supported image or file here</div>}
            <textarea
              ref={composer}
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
              onChange={(e) => {
                setDraft(e.target.value);
                setCaret(e.target.selectionStart);
                setReplyIndex(0);
                const beforeCaret = e.target.value.slice(0, e.target.selectionStart);
                if (/(?:^|\s)\/[a-z0-9_-]*$/i.test(beforeCaret)) {
                  setReplyPickerOpen(true);
                  setReplySearch("");
                }
              }}
              onPaste={(event) => {
                if (noteMode) return;
                const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
                if (file) {
                  event.preventDefault();
                  setIncomingFile({ file, token: crypto.randomUUID() });
                }
              }}
              onDragOver={(event) => {
                if (!noteMode) {
                  event.preventDefault();
                  setDragActive(true);
                }
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                if (noteMode) return;
                event.preventDefault();
                setDragActive(false);
                const file = mediaFromTransfer(event.dataTransfer);
                if (file) setIncomingFile({ file, token: crypto.randomUUID() });
              }}
              onClick={(e) => setCaret(e.currentTarget.selectionStart)}
              onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
              onKeyDown={(e) => {
                if (replyMatches.length && e.key === "ArrowDown") {
                  e.preventDefault();
                  setReplyIndex((value) => (value + 1) % replyMatches.length);
                  return;
                }
                if (replyMatches.length && e.key === "ArrowUp") {
                  e.preventDefault();
                  setReplyIndex(
                    (value) =>
                      (value - 1 + replyMatches.length) % replyMatches.length,
                  );
                  return;
                }
                if (
                  replyMatches.length &&
                  (e.key === "Enter" || e.key === "Tab")
                ) {
                  e.preventDefault();
                  chooseReply(replyMatches[replyIndex]);
                  return;
                }
                if (e.key === "Escape" && replyPickerOpen) {
                  e.preventDefault();
                  setReplyPickerOpen(false);
                  return;
                }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void submit(false);
                }
              }}
            />
            <footer>
              <div className="crm-composer-tools">
                {!noteMode && (
                  <>
                    <button
                      title="Insert emoji"
                      aria-label="Insert emoji"
                      onClick={() => setEmojiOpen((value) => !value)}
                    >
                      😊
                    </button>
                    <button
                      title="Saved replies"
                      aria-label="Open saved replies"
                      className={replyPickerOpen ? "active" : ""}
                      onClick={() => {
                        setReplyPickerOpen((value) => !value);
                        setReplySearch("");
                        setReplyIndex(0);
                      }}
                    >
                      ⚡
                    </button>
                    <MediaComposer
                      conversationId={id}
                      capabilities={capabilities}
                      text={draft}
                      blockedReason={conversation.send_blocked_reason}
                      incomingFile={incomingFile}
                      onSent={() => {
                        setDraft("");
                        setIncomingFile(null);
                        refresh();
                      }}
                    />
                    <VoiceRecorder
                      conversationId={id}
                      blockedReason={conversation.send_blocked_reason}
                      deliverySupported={capabilities.canSendVoiceRecording}
                      onSent={refresh}
                    />
                    <button
                      title="AI tools"
                      aria-label="Open AI tools"
                      className={aiOpen ? "active" : ""}
                      onClick={() => setAiOpen((value) => !value)}
                    >
                      ✦
                    </button>
                  </>
                )}
                <small>
                  {noteMode ? "Internal note · team only" : "Type / for saved replies"}
                </small>
              </div>
              <div className="crm-send-actions">
                <button
                  className="crm-primary"
                  disabled={
                    busy ||
                    !draft.trim() ||
                    (!noteMode && !!conversation.send_blocked_reason)
                  }
                  onClick={() => submit(false)}
                >
                  {busy ? "Saving…" : noteMode ? "Save internal note" : "Send"}
                </button>
                {!noteMode && (
                  <details className="crm-send-menu">
                    <summary aria-label="More send options">▾</summary>
                    <div>
                      <button
                        disabled={busy || !draft.trim() || !!conversation.send_blocked_reason}
                        onClick={() => submit(true)}
                      >
                        Send & Close
                      </button>
                    </div>
                  </details>
                )}
              </div>
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
        <ContactSummary contact={contact} conversation={conversation} />
      </div>
      {manageReplies && (
        <div className="crm-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manage saved replies">
          <div className="crm-modal">
            <button className="crm-modal-close" onClick={() => { setManageReplies(false); setNewReply(false); refresh(); }}>
              Close ×
            </button>
            <SavedReplies startNew={newReply} />
          </div>
        </div>
      )}
      {lightbox && (
        <div className="crm-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setLightbox("")}>
          <button aria-label="Close image preview">×</button>
          <img src={lightbox} alt="Full attachment preview" />
        </div>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: ConversationSource }) {
  const reel = source.source_type === "instagram_reel_comment";
  const post = source.source_type === "instagram_post_comment";
  return (
    <article className="crm-source-card">
      {source.thumbnail_url?.startsWith("https://") && (
        <img src={source.thumbnail_url} alt="Instagram source" loading="lazy" />
      )}
      <div>
        <small>{reel ? "Started from an Instagram Reel" : post ? "Started from an Instagram post" : "Started on Instagram"}</small>
        {source.caption && <p dir="auto">{source.caption}</p>}
        {source.original_comment && (
          <blockquote dir="auto">“{source.original_comment}”</blockquote>
        )}
        <footer>
          {source.keyword && <span>Keyword: {source.keyword}</span>}
          {source.automation_name && <span>Automation: {source.automation_name}</span>}
          <time>{date(source.occurred_at)}</time>
        </footer>
      </div>
    </article>
  );
}

function SystemEventRow({ event }: { event: ConversationEvent }) {
  return (
    <div className="crm-system-event">
      <span>{event.text}</span>
      <time>{date(event.created_at)}</time>
    </div>
  );
}

function ContactSummary({
  contact,
  conversation,
}: {
  contact: Contact | null;
  conversation: Conversation;
}) {
  if (!contact) return <Skeleton />;
  const warm = ["CONTACTED", "COUNSELING", "DOCUMENTS"];
  const hot = ["QUALIFIED", "APPLICATION", "OFFER", "VISA", "ENROLLED"];
  const temperature = hot.includes(contact.stage)
    ? "Hot"
    : warm.includes(contact.stage)
      ? "Warm"
      : contact.stage === "LOST"
        ? "Cold"
        : "New";
  const username = conversation.username || contact.identities?.[0]?.username;
  const fields = [
    ["Instagram", username ? "@" + username : "—"],
    ["Country", contact.country || "—"],
    ["Lead temperature", temperature],
    ["Program interest", contact.program_interests || "—"],
    ["Degree", contact.degree_level || "—"],
    ["Intake", contact.target_intake || "—"],
    ["Assigned counselor", conversation.assignee_name || "Unassigned"],
  ];
  return (
    <aside className="crm-contact-summary">
      <header>
        <Avatar name={contact.display_name} />
        <div>
          <strong dir="auto">{contact.display_name}</strong>
          <small>Student snapshot</small>
        </div>
      </header>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd dir="auto">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        className="crm-primary crm-open-profile"
        to={`/crm/contacts/${contact.id}`}
      >
        Open CRM profile
      </Link>
    </aside>
  );
}
