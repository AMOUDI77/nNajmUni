import { useState } from "react";
import { Link } from "react-router-dom";
import { write } from "../api";
import { date, ErrorBanner, Skeleton, useData } from "../components";
import { useCRM } from "../context";
import type { Contact, Label } from "../types";

export const stages = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "COUNSELING",
  "DOCUMENTS",
  "APPLICATION",
  "OFFER",
  "VISA",
  "ENROLLED",
  "LOST",
];
export default function ContactPanel({
  id,
  refresh = 0,
  onChange = () => {},
}: {
  id: number;
  refresh?: number;
  onChange?: () => void;
}) {
  const { user, ar } = useCRM(),
    [tick, setTick] = useState(0),
    [editing, setEditing] = useState(false),
    [error, setError] = useState("");
  const {
    data: contact,
    loading,
    error: loadError,
  } = useData<Contact>("/contacts/" + id, refresh + tick);
  const { data: labels } = useData<Label[]>("/labels", refresh);
  const editable = user?.role !== "VIEWER";
  const reload = () => {
    setTick((x) => x + 1);
    onChange();
  };
  async function act(path: string, data: unknown, method = "POST") {
    setError("");
    try {
      await write(path, data, method);
      reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  if (loading && !contact) return <Skeleton />;
  if (!contact) return <ErrorBanner message={loadError} />;
  return (
    <aside className="crm-contact-panel">
      <header>
        <span className="crm-eyebrow">
          {ar ? "ملف الطالب" : "CONTACT CONTEXT"}
        </span>
        {editable && (
          <button onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </header>
      <ErrorBanner message={error || loadError} />
      <h2 dir="auto">{contact.display_name}</h2>
      <div className="crm-tag">
        {contact.stage.toLowerCase().replace("_", " ")}
      </div>
      {editing ? (
        <form
          className="crm-edit-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            const payload={...values,budget_amount:values.budget_amount?Number(values.budget_amount):null};
            if (await act("/contacts/" + id, payload, "PATCH"))
              setEditing(false);
          }}
        >
          {(
            [
              "display_name",
              "country",
              "email",
              "phone",
              "degree_level",
              "program_interests",
              "target_intake",
              "budget_currency",
              "english_status",
              "preferred_language",
              "main_concerns",
            ] as const
          ).map((field) => (
            <label key={field}>
              {field.replace(/_/g, " ")}
              <input
                name={field}
                defaultValue={String(contact[field] || "")}
                dir="auto"
                required={field === "display_name"}
              />
            </label>
          ))}
          <label>Budget amount<input name="budget_amount" type="number" min="0" step="0.01" defaultValue={contact.budget_amount??''}/></label>
          <label>
            Stage
            <select name="stage" defaultValue={contact.stage}>
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="crm-primary">Save profile</button>
        </form>
      ) : (
        <>
          <section>
            <h3>{ar ? "الملف الشخصي" : "Profile"}</h3>
            {[
              ["Country", contact.country],
              ["Email", contact.email],
              ["Phone", contact.phone],
              ["Language", contact.preferred_language],
            ].map(([k, v]) => (
              <div className="crm-kv" key={k}>
                <span>{k}</span>
                <span dir="auto">{v || "—"}</span>
              </div>
            ))}
          </section>
          <section>
            <h3>{ar ? "الدراسة" : "Study interests"}</h3>
            {[
              ["Degree", contact.degree_level],
              ["Program", contact.program_interests],
              ["Intake", contact.target_intake],
              [
                "Budget",
                [contact.budget_amount, contact.budget_currency]
                  .filter(Boolean)
                  .join(" "),
              ],
              ["English", contact.english_status],
            ].map(([k, v]) => (
              <div className="crm-kv" key={k}>
                <span>{k}</span>
                <span dir="auto">{v || "—"}</span>
              </div>
            ))}
          </section>
          <section>
            <h3>NajmUni CRM</h3>
            <div className="crm-kv">
              <span>Lead</span>
              <span>{contact.lead_id ? "Linked" : "Not linked"}</span>
            </div>
            {editable &&
              (!contact.lead_id ? (
                <button onClick={() => act(`/contacts/${id}/lead`, {})}>
                  Create lead from contact
                </button>
              ) : (
                <button
                  onClick={() =>
                    act(`/contacts/${id}/links/lead`, { id: null }, "PUT")
                  }
                >
                  Unlink lead
                </button>
              ))}
            <div className="crm-kv">
              <span>Student</span>
              <span>{contact.student_id ? "Linked" : "Not linked"}</span>
            </div>
            {editable && (
              <LinkControl
                id={id}
                kind="student"
                linked={!!contact.student_id}
                act={act}
              />
            )}{" "}
            {editable && !contact.lead_id && (
              <LinkControl id={id} kind="lead" linked={false} act={act} />
            )}
          </section>
          <section>
            <h3>{ar ? "التصنيفات" : "Labels"}</h3>
            <div className="crm-tags">
              {contact.labels?.map((l) => (
                <button
                  key={l.id}
                  disabled={!editable}
                  style={{ borderColor: l.color }}
                  onClick={() =>
                    act(`/contacts/${id}/labels/${l.id}`, {}, "DELETE")
                  }
                >
                  {l.name} {editable ? "×" : ""}
                </button>
              ))}
            </div>
            {editable && (
              <select
                aria-label="Add label"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    void act(
                      `/contacts/${id}/labels/${e.target.value}`,
                      {},
                      "PUT",
                    );
                }}
              >
                <option value="">Add label…</option>
                {labels
                  ?.filter(
                    (l) =>
                      !l.archived &&
                      !contact.labels?.some((t) => t.id === l.id),
                  )
                  .map((l) => (
                    <option value={l.id} key={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            )}
          </section>
          <section>
            <h3>{ar ? "ذاكرة المساعد" : "AI memory"}</h3>
            {contact.memory?.length ? (
              contact.memory.map((m) => (
                <div className="crm-memory" key={m.id}>
                  <strong>{m.field.replace(/_/g, " ")}</strong>
                  <p dir="auto">{m.value}</p>
                  <small>
                    {m.verified
                      ? "Verified"
                      : `${Math.round(m.confidence * 100)}% confidence · needs review`}
                  </small>
                  {editable && !m.verified && (
                    <button
                      onClick={() =>
                        act(`/contacts/${id}/memory/${m.id}`, {}, "PATCH")
                      }
                    >
                      Verify fact
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="crm-muted">No extracted study details yet.</p>
            )}
          </section>
          <section>
            <h3>{ar ? "المصدر" : "Source history"}</h3>
            {contact.touchpoints?.length ? (
              contact.touchpoints.map((t) => (
                <p key={t.id} className="crm-source">
                  {t.campaign_name}
                  <small>
                    {t.event_type.replace(/_/g, " ")} · {date(t.occurred_at)}
                  </small>
                </p>
              ))
            ) : (
              <p className="crm-muted">No recorded touchpoints.</p>
            )}
          </section>
          <section>
            <h3>{ar ? "ملاحظات خاصة" : "Private notes"}</h3>
            {contact.notes?.map((n) => (
              <div className="crm-note" key={n.id}>
                <p dir="auto">{n.text}</p>
                <small>
                  {n.author_name} · {date(n.created_at)}
                </small>
              </div>
            ))}
            {!contact.notes?.length && (
              <p className="crm-muted">Notes stay inside NajmUni.</p>
            )}
            {editable && (
              <form
                className="crm-edit-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  if (
                    await act(
                      `/contacts/${id}/notes`,
                      Object.fromEntries(new FormData(form)),
                    )
                  )
                    form.reset();
                }}
              >
                <label>
                  Add a private note
                  <textarea name="text" required maxLength={10000} dir="auto" />
                </label>
                <button>Save private note</button>
              </form>
            )}
          </section>
          <section>
            <h3>Conversation history</h3>
            {contact.conversations?.map((c) => (
              <p className="crm-source" key={c.id}>
                <Link to={"/crm/inbox/" + c.id}>Instagram conversation</Link>
                <small>
                  {date(c.last_message_at)} · {c.status.toLowerCase()}
                </small>
              </p>
            ))}
          </section>
          <Link to={"/crm/contacts/" + id}>Open full contact →</Link>
        </>
      )}
    </aside>
  );
}
function LinkControl({
  id,
  kind,
  linked,
  act,
}: {
  id: number;
  kind: string;
  linked: boolean;
  act: (path: string, data: unknown, method?: string) => Promise<boolean>;
}) {
  const [q, setQ] = useState("");
  const { data } = useData<
    { id: number; name: string; email: string; phone: string }[]
  >(q.length >= 2 ? `/links/${kind}s?q=${encodeURIComponent(q)}` : null);
  if (linked)
    return (
      <button
        onClick={() =>
          act(`/contacts/${id}/links/${kind}`, { id: null }, "PUT")
        }
      >
        Unlink {kind}
      </button>
    );
  return (
    <details>
      <summary>Link existing {kind}</summary>
      <input
        aria-label={`Search ${kind}`}
        placeholder="Search name, email or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {data?.map((r) => (
        <button
          className="crm-link-result"
          key={r.id}
          onClick={() =>
            act(`/contacts/${id}/links/${kind}`, { id: r.id }, "PUT")
          }
        >
          {r.name} <small>{r.email || r.phone}</small>
        </button>
      ))}
    </details>
  );
}
