import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { write } from "../api";
import { date, Empty, ErrorBanner, Skeleton, useData } from "../components";
import { useCRM } from "../context";
type Step = {
  action: string;
  text?: string;
  field?: string;
  value?: string;
  target_id?: number;
  options?: Record<string, number>;
};
type Rule = {
  id: number;
  name: string;
  status: string;
  version: number;
  trigger: {
    kind: string;
    keywords: string[];
    match: string;
    media_id?: string;
  };
  steps: Step[];
  executions?: number;
  last_run?: string;
  runs?: {
    id: number;
    status: string;
    created_at: string;
    safe_error?: string;
  }[];
};
const actions = [
  "SEND_MESSAGE",
  "ASK_QUESTION",
  "WAIT_FOR_REPLY",
  "BRANCH_ON_REPLY",
  "ADD_LABEL",
  "REMOVE_LABEL",
  "CREATE_LEAD",
  "UPDATE_CONTACT_FIELD",
  "ASSIGN_COUNSELOR",
  "HUMAN_HANDOFF",
  "STOP",
];
const fields = [
  "preferred_language",
  "nationality",
  "country",
  "degree_level",
  "program_interests",
  "target_intake",
  "budget_currency",
  "english_status",
  "university_interests",
  "main_concerns",
];
const blank: Rule = {
  id: 0,
  name: "",
  status: "DRAFT",
  version: 1,
  trigger: { kind: "DM", keywords: [], match: "contains" },
  steps: [{ action: "SEND_MESSAGE", text: "" }],
};

export default function Automations() {
  const { automationId } = useParams();
  const navigate = useNavigate();
  const { user } = useCRM();
  const [tick, setTick] = useState(0),
    [error, setError] = useState("");
  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN";
  const {
    data: rules,
    loading,
    error: loadError,
  } = useData<Rule[]>("/automations", tick);
  if (automationId) return <Builder id={automationId} canEdit={canEdit} />;
  async function status(rule: Rule) {
    try {
      await write(
        "/automations/" + rule.id,
        { status: rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
        "PATCH",
      );
      setTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function duplicate(rule: Rule) {
    try {
      const r = await write<{ id: number }>("/automations", {
        ...rule,
        name: rule.name + " (copy)",
      });
      navigate("/crm/automations/" + r.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="crm-page">
      <header className="crm-page-header">
        <div>
          <span className="crm-eyebrow">THOUGHTFUL FOLLOW-UPS</span>
          <h1>Automations</h1>
          <p>
            Guide student inquiries with clear questions and a timely human
            handoff.
          </p>
        </div>
        {canEdit && (
          <Link className="crm-button-link" to="/crm/automations/new">
            + Create automation
          </Link>
        )}
      </header>
      <ErrorBanner message={error || loadError} />
      {loading ? (
        <Skeleton />
      ) : rules?.length ? (
        <div className="crm-table-scroll">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Automation</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Runs</th>
                <th>Last run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={"/crm/automations/" + r.id}>{r.name}</Link>
                  </td>
                  <td>
                    {r.trigger.kind} · {r.trigger.keywords.join(", ")}
                  </td>
                  <td>
                    <span
                      className={
                        "crm-tag " + (r.status === "ACTIVE" ? "success" : "")
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.executions || 0}</td>
                  <td>{date(r.last_run)}</td>
                  <td>
                    {canEdit && (
                      <>
                        <button onClick={() => status(r)}>
                          {r.status === "ACTIVE" ? "Pause" : "Activate"}
                        </button>{" "}
                        <button onClick={() => duplicate(r)}>Duplicate</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Make the first step easier"
          detail="Start with a keyword, ask about study interests, then hand the conversation to a counselor."
        />
      )}
    </main>
  );
}
function Builder({ id, canEdit }: { id: string; canEdit: boolean }) {
  const navigate = useNavigate();
  const isNew = id === "new";
  const { data, error: loadError } = useData<Rule>(
    isNew ? null : "/automations/" + id,
  );
  const [rule, setRule] = useState<Rule>(blank),
    [keywords, setKeywords] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { data: labels } = useData<{ id: number; name: string }[]>("/labels");
  const { data: team } =
    useData<{ id: number; full_name: string; role: string; status: string }[]>(
      "/team",
    );
  useEffect(() => {
    if (data) {
      setRule(data);
      setKeywords(data.trigger.keywords.join(", "));
    }
  }, [data]);
  const stepChange = (i: number, values: Partial<Step>) =>
    setRule((r) => ({
      ...r,
      steps: r.steps.map((s, n) => (n === i ? { ...s, ...values } : s)),
    }));
  const move = (i: number, delta: number) =>
    setRule((r) => {
      const steps = [...r.steps];
      [steps[i], steps[i + delta]] = [steps[i + delta], steps[i]];
      return { ...r, steps };
    });
  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...rule,
        trigger: {
          ...rule.trigger,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
      };
      const result = await write<{ id: number }>(
        "/automations" + (isNew ? "" : "/" + id),
        payload,
        isNew ? "POST" : "PATCH",
      );
      if (isNew) navigate("/crm/automations/" + result.id);
      else setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="crm-page">
      <header className="crm-page-header">
        <div>
          <Link to="/crm/automations">← Automations</Link>
          <h1>{isNew ? "Create automation" : rule.name || "Automation"}</h1>
          <p>
            Linear steps · Version {rule.version} · Changes apply to new runs
          </p>
        </div>
        {canEdit && (
          <button className="crm-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save automation"}
          </button>
        )}
      </header>
      <ErrorBanner message={error || loadError} />
      <div className="crm-builder">
        <fieldset disabled={!canEdit}>
          <section className="crm-editor-section">
            <h2>Start with a trigger</h2>
            <label>
              Automation name
              <input
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
              />
            </label>
            <div className="crm-form-grid">
              <label>
                When someone
                <select
                  value={rule.trigger.kind}
                  onChange={(e) =>
                    setRule({
                      ...rule,
                      trigger: { ...rule.trigger, kind: e.target.value },
                    })
                  }
                >
                  <option value="DM">Sends a DM</option>
                  <option value="COMMENT">Comments on a post or reel</option>
                  <option value="POSTBACK">Chooses an option</option>
                </select>
              </label>
              <label>
                Match
                <select
                  value={rule.trigger.match}
                  onChange={(e) =>
                    setRule({
                      ...rule,
                      trigger: { ...rule.trigger, match: e.target.value },
                    })
                  }
                >
                  <option value="contains">Contains a keyword</option>
                  <option value="equals">Exactly matches</option>
                </select>
              </label>
            </div>
            <label>
              Keywords{" "}
              <small>
                Separate with commas. Arabic and English are supported.
              </small>
              <input
                dir="auto"
                placeholder="ماليزيا, Malaysia"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </label>
            {rule.trigger.kind === "COMMENT" && (
              <label>
                Post / reel media ID{" "}
                <small>Leave blank for any supported media.</small>
                <input
                  value={rule.trigger.media_id || ""}
                  onChange={(e) =>
                    setRule({
                      ...rule,
                      trigger: { ...rule.trigger, media_id: e.target.value },
                    })
                  }
                />
              </label>
            )}
          </section>
          {rule.steps.map((step, i) => (
            <section className="crm-step" key={i}>
              <div className="crm-step-number">{i + 1}</div>
              <div className="crm-step-content">
                <header>
                  <select
                    aria-label={`Step ${i + 1} action`}
                    value={step.action}
                    onChange={(e) => stepChange(i, { action: e.target.value })}
                  >
                    {actions.map((a) => (
                      <option key={a} value={a}>
                        {a.toLowerCase().replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <div>
                    <button
                      disabled={i === 0}
                      aria-label="Move step up"
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      disabled={i === rule.steps.length - 1}
                      aria-label="Move step down"
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      disabled={rule.steps.length === 1}
                      aria-label="Remove step"
                      onClick={() =>
                        setRule({
                          ...rule,
                          steps: rule.steps.filter((_, n) => n !== i),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                </header>
                {["SEND_MESSAGE", "ASK_QUESTION"].includes(step.action) && (
                  <label>
                    Message
                    <textarea
                      dir="auto"
                      placeholder="Write your message…"
                      value={step.text || ""}
                      onChange={(e) => stepChange(i, { text: e.target.value })}
                    />
                  </label>
                )}
                {[
                  "ASK_QUESTION",
                  "WAIT_FOR_REPLY",
                  "UPDATE_CONTACT_FIELD",
                ].includes(step.action) && (
                  <label>
                    {step.action === "UPDATE_CONTACT_FIELD"
                      ? "Contact field"
                      : "Save the next reply to"}
                    <select
                      value={step.field || ""}
                      onChange={(e) => stepChange(i, { field: e.target.value })}
                    >
                      <option value="">Choose a study field</option>
                      {fields.map((f) => (
                        <option key={f} value={f}>
                          {f.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {step.action === "UPDATE_CONTACT_FIELD" && (
                  <label>
                    Value
                    <input
                      value={step.value || ""}
                      onChange={(e) => stepChange(i, { value: e.target.value })}
                    />
                  </label>
                )}
                {["ADD_LABEL", "REMOVE_LABEL", "ASSIGN_COUNSELOR"].includes(
                  step.action,
                ) && (
                  <label>
                    {step.action === "ASSIGN_COUNSELOR" ? "Counselor" : "Label"}
                    <select
                      value={step.target_id || ""}
                      onChange={(e) =>
                        stepChange(i, { target_id: Number(e.target.value) })
                      }
                    >
                      <option value="">Choose…</option>
                      {step.action === "ASSIGN_COUNSELOR"
                        ? team
                            ?.filter(
                              (t) =>
                                t.role !== "VIEWER" && t.status === "ACTIVE",
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name}
                              </option>
                            ))
                        : labels?.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                    </select>
                  </label>
                )}
                {step.action === "BRANCH_ON_REPLY" && (
                  <BranchEditor
                    value={step.options || {}}
                    steps={rule.steps.length}
                    start={i}
                    onChange={(options) => stepChange(i, { options })}
                  />
                )}
                <p className="crm-muted">
                  {step.action === "ASK_QUESTION"
                    ? "The flow waits until the student replies."
                    : step.action === "HUMAN_HANDOFF"
                      ? "A counselor takes over. Automatic replies stop."
                      : step.action === "CREATE_LEAD"
                        ? "Creates a linked NajmUni lead once. Existing links are preserved."
                        : ""}
                </p>
              </div>
            </section>
          ))}
          <button
            className="crm-add-step"
            onClick={() =>
              setRule({
                ...rule,
                steps: [...rule.steps, { action: "SEND_MESSAGE", text: "" }],
              })
            }
          >
            + Add step
          </button>
        </fieldset>
        {rule.runs && (
          <section className="crm-editor-section">
            <h2>Recent runs</h2>
            {rule.runs.length ? (
              rule.runs.map((run) => (
                <div className="crm-run" key={run.id}>
                  <span className="crm-tag">{run.status}</span>
                  <time>{date(run.created_at)}</time>
                  {run.safe_error && <p role="alert">{run.safe_error}</p>}
                </div>
              ))
            ) : (
              <p className="crm-muted">
                No runs yet. Activate the automation when its steps are ready.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
function BranchEditor({
  value,
  steps,
  start,
  onChange,
}: {
  value: Record<string, number>;
  steps: number;
  start: number;
  onChange: (v: Record<string, number>) => void;
}) {
  const [keyword, setKeyword] = useState(""),
    [target, setTarget] = useState(start + 1);
  return (
    <div>
      <label>
        Reply keyword
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </label>
      <label>
        Go to step
        <select
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        >
          {Array.from({ length: steps }, (_, i) => i)
            .filter((i) => i > start)
            .map((i) => (
              <option key={i} value={i}>
                Step {i + 1}
              </option>
            ))}
        </select>
      </label>
      <button
        onClick={() => {
          if (keyword.trim()) {
            onChange({ ...value, [keyword.trim()]: target });
            setKeyword("");
          }
        }}
      >
        Add branch
      </button>
      {Object.entries(value).map(([k, v]) => (
        <p key={k}>
          {k} → Step {v + 1}{" "}
          <button
            aria-label={`Remove ${k} branch`}
            onClick={() =>
              onChange(
                Object.fromEntries(
                  Object.entries(value).filter(([key]) => key !== k),
                ),
              )
            }
          >
            ×
          </button>
        </p>
      ))}
    </div>
  );
}
