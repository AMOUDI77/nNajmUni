import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { write } from "../api";
import { date, ErrorBanner, Skeleton, useData } from "../components";
import { useCRM } from "../context";
import type { Staff, Label } from "../types";
import Knowledge from "../pages/Knowledge";
import SavedReplies from "./SavedReplies";
type Integration = {
  configured: boolean;
  mode: string;
  accounts: {
    id: number;
    username: string;
    status: string;
    token_expires_at: string;
    last_webhook_at: string;
  }[];
};
type Settings = {
  ai_mode: string;
  auto_available: boolean;
  ai_configured: boolean;
  workspace_name: string;
  provider_mode: string;
};
type Operations = {
  database: string;
  last_webhook_at: string;
  queue: { status: string; count: number }[];
  failed_jobs: {
    id: number;
    kind: string;
    status: string;
    safe_error: string;
  }[];
  audit: { id: number; action: string; created_at: string }[];
};

export default function Settings() {
  const { section = "integrations" } = useParams();
  const { user } = useCRM();
  const admin = user?.role === "OWNER" || user?.role === "ADMIN";
  const [tick, setTick] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(path: string, data: unknown, method = "POST") {
    setError("");
    setBusy(true);
    try {
      await write(path, data, method);
      setTick((t) => t + 1);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (section === "knowledge") return <Knowledge />;
  const tabs = [
    "integrations",
    "team",
    "saved-replies",
    "labels",
    "knowledge",
    "ai",
    "general",
  ];
  return (
    <main className="crm-page">
      <header className="crm-page-header">
        <div>
          <span className="crm-eyebrow">YOUR WORKSPACE</span>
          <h1>Settings</h1>
          <p>Manage your team, connected accounts and conversation tools.</p>
        </div>
      </header>
      <nav className="crm-settings-tabs" aria-label="Settings sections">
        {tabs.map((t) => (
          <NavLink key={t} to={"/crm/settings/" + t}>
            {t === "ai"
              ? "AI Copilot"
              : t === "saved-replies"
                ? "Saved replies"
                : t[0].toUpperCase() + t.slice(1)}
          </NavLink>
        ))}
      </nav>
      <ErrorBanner message={error} />
      <fieldset className="crm-settings-fieldset" disabled={busy}>
        {section === "integrations" && (
          <Integrations
            tick={tick}
            admin={admin}
            act={act}
            onError={setError}
          />
        )}
        {section === "team" && <Team tick={tick} admin={admin} act={act} />}
        {section === "labels" && <Labels tick={tick} admin={admin} act={act} />}
        {section === "saved-replies" && <SavedReplies />}
        {section === "ai" && <AISettings tick={tick} admin={admin} act={act} />}
        {section === "general" && (
          <General tick={tick} admin={admin} act={act} />
        )}
      </fieldset>
    </main>
  );
}
type Props = {
  tick: number;
  admin: boolean;
  act: (path: string, data: unknown, method?: string) => Promise<boolean>;
};
function Integrations({
  tick,
  admin,
  act,
  onError,
}: Props & { onError: (s: string) => void }) {
  const { data, error } = useData<Integration>("/integrations/instagram", tick);
  if (!data) return error ? <ErrorBanner message={error} /> : <Skeleton />;
  async function connect() {
    try {
      const r = await write<{ url: string }>(
        "/integrations/instagram/connect",
        {},
      );
      window.location.assign(r.url);
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <section className="crm-editor-section crm-integration">
      <div className="crm-integration-icon">◎</div>
      <h2>Instagram</h2>
      <p className="crm-muted">
        Receive student messages and reply from the NajmUni inbox.
      </p>
      {data.mode === "mock" && (
        <p className="crm-policy">
          Development provider · Messages stay in the local test workspace.
        </p>
      )}
      {data.accounts.length ? (
        data.accounts.map((a) => (
          <div key={a.id} className="crm-integration-account">
            <strong>@{a.username || "Instagram account"}</strong>
            <span
              className={
                "crm-tag " + (a.status === "CONNECTED" ? "success" : "")
              }
            >
              {a.status.toLowerCase()}
            </span>
            <div className="crm-kv">
              <span>Last webhook</span>
              <span>{date(a.last_webhook_at)}</span>
            </div>
            <div className="crm-kv">
              <span>Authorization expires</span>
              <span>{date(a.token_expires_at)}</span>
            </div>
            {admin && a.status === "CONNECTED" && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Disconnect Instagram? New messages and queued replies will stop.",
                    )
                  )
                    void act(`/integrations/instagram/${a.id}/disconnect`, {});
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        ))
      ) : (
        <p>No Instagram account connected yet.</p>
      )}
      {admin && (
        <button
          className="crm-primary"
          disabled={!data.configured}
          onClick={connect}
        >
          {data.accounts.length ? "Reconnect Instagram" : "Connect Instagram"}
        </button>
      )}
      {!data.configured && (
        <p className="crm-muted">
          An owner needs to complete the Instagram integration setup before
          connecting.
        </p>
      )}
    </section>
  );
}
function Team({ tick, admin, act }: Props) {
  const { data, error } = useData<Staff[]>("/team", tick);
  const { user } = useCRM();
  const [adding, setAdding] = useState(false),
    [reset, setReset] = useState<number | null>(null);
  const roles =
    user?.role === "OWNER"
      ? ["OWNER", "ADMIN", "COUNSELOR", "VIEWER"]
      : ["COUNSELOR", "VIEWER"];
  return (
    <section>
      <div className="crm-section-heading">
        <h2>Team members</h2>
        {admin && (
          <button onClick={() => setAdding(!adding)}>+ Add staff member</button>
        )}
      </div>
      <ErrorBanner message={error} />
      {adding && (
        <form
          className="crm-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await act(
                "/team",
                Object.fromEntries(new FormData(e.currentTarget)),
              )
            )
              setAdding(false);
          }}
        >
          <label>
            Name
            <input name="full_name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              name="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Role
            <select name="role" defaultValue="COUNSELOR">
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button className="crm-primary">Create staff account</button>
        </form>
      )}
      <div className="crm-table-scroll">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.full_name}
                  {s.id === user?.id ? " (you)" : ""}
                </td>
                <td dir="ltr">{s.email}</td>
                <td>
                  {admin &&
                  s.id !== user?.id &&
                  (user?.role === "OWNER" ||
                    !["OWNER", "ADMIN"].includes(s.role)) ? (
                    <select
                      aria-label={`Role for ${s.full_name}`}
                      value={s.role}
                      onChange={(e) =>
                        act("/team/" + s.id, { role: e.target.value }, "PATCH")
                      }
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    s.role
                  )}
                </td>
                <td>
                  <span
                    className={
                      "crm-tag " + (s.status === "ACTIVE" ? "success" : "")
                    }
                  >
                    {s.status.toLowerCase()}
                  </span>
                </td>
                <td>
                  {admin &&
                    s.id !== user?.id &&
                    (user?.role === "OWNER" ||
                      !["OWNER", "ADMIN"].includes(s.role)) && (
                      <>
                        <button
                          onClick={() =>
                            act(
                              "/team/" + s.id,
                              {
                                status:
                                  s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                              },
                              "PATCH",
                            )
                          }
                        >
                          {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>{" "}
                        <button onClick={() => setReset(s.id)}>
                          Reset password
                        </button>
                      </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reset && (
        <form
          className="crm-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await act(
                "/team/" + reset,
                Object.fromEntries(new FormData(e.currentTarget)),
                "PATCH",
              )
            )
              setReset(null);
          }}
        >
          <label>
            New temporary password
            <input
              type="password"
              name="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="crm-primary">Reset and revoke sessions</button>
          <button type="button" onClick={() => setReset(null)}>
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
function Labels({ tick, admin, act }: Props) {
  const { data, error } = useData<Label[]>("/labels", tick);
  return (
    <section>
      <h2>Conversation labels</h2>
      <p className="crm-muted">
        Keep the inbox organized around student needs.
      </p>
      <ErrorBanner message={error} />
      {admin && (
        <form
          className="crm-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (await act("/labels", Object.fromEntries(new FormData(form))))
              form.reset();
          }}
        >
          <label>
            Name
            <input name="name" required maxLength={60} />
          </label>
          <label>
            Color
            <input name="color" type="color" defaultValue="#4f6bff" />
          </label>
          <button className="crm-primary">Create label</button>
        </form>
      )}
      <div className="crm-label-list">
        {data?.map((l) => (
          <form
            key={l.id}
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                "/labels/" + l.id,
                Object.fromEntries(new FormData(e.currentTarget)),
                "PATCH",
              );
            }}
          >
            <input
              name="color"
              type="color"
              defaultValue={l.color}
              aria-label="Label color"
              disabled={!admin}
            />
            <input
              name="name"
              defaultValue={l.name}
              aria-label="Label name"
              disabled={!admin}
            />
            <span className="crm-tag">
              {l.archived ? "Archived" : "Active"}
            </span>
            {admin && (
              <>
                <button>Save</button>
                <button
                  type="button"
                  onClick={() =>
                    act("/labels/" + l.id, { archived: !l.archived }, "PATCH")
                  }
                >
                  {l.archived ? "Restore" : "Archive"}
                </button>
              </>
            )}
          </form>
        ))}
      </div>
    </section>
  );
}
function AISettings({ tick, admin, act }: Props) {
  const { data } = useData<Settings>("/settings", tick);
  return (
    <section className="crm-editor-section">
      <h2>AI Copilot</h2>
      <p className="crm-muted">
        Draft replies and extract study interests. Counselors review every
        reply.
      </p>
      <div className="crm-kv">
        <span>Anthropic connection</span>
        <span>{data?.ai_configured ? "Configured" : "Not configured"}</span>
      </div>
      <label>
        Workspace mode
        <select
          disabled={!admin}
          value={data?.ai_mode || "SUGGEST"}
          onChange={(e) =>
            act("/settings", { ai_mode: e.target.value }, "PATCH")
          }
        >
          <option value="OFF">Off — pause AI requests</option>
          <option value="SUGGEST">Suggest — counselor reviews drafts</option>
          <option disabled value="AUTO">
            Auto — unavailable in V1
          </option>
        </select>
      </label>
      <p className="crm-muted">
        Human takeover always pauses automated replies. Extracted memory is
        separate from the verified contact profile.
      </p>
    </section>
  );
}
function General({ tick, admin, act }: Props) {
  const { logout, toggleLanguage, ar } = useCRM();
  const [accountError, setAccountError] = useState("");
  const { data, error } = useData<Operations>(
    admin ? "/operations" : null,
    tick,
  );
  return (
    <section className="crm-editor-section">
      <h2>Workspace health</h2>
      <div className="crm-tags">
        <button onClick={toggleLanguage}>{ar ? "English" : "العربية"}</button>
        <button
          onClick={() => logout().catch((e) => setAccountError(e.message))}
        >
          Sign out
        </button>
      </div>
      <ErrorBanner message={accountError} />
      <p className="crm-muted">NajmUni · Private staff workspace</p>
      <ErrorBanner message={error} />
      {!admin ? (
        <p>Operational details are available to workspace administrators.</p>
      ) : (
        <>
          <div className="crm-kv">
            <span>Database</span>
            <strong>{data?.database || "Checking…"}</strong>
          </div>
          <div className="crm-kv">
            <span>Last webhook</span>
            <span>{date(data?.last_webhook_at)}</span>
          </div>
          <div className="crm-tags">
            {data?.queue.map((q) => (
              <span className="crm-tag" key={q.status}>
                {q.status.toLowerCase()}: {q.count}
              </span>
            ))}
          </div>
          <h3>Jobs needing attention</h3>
          {data?.failed_jobs.length ? (
            data.failed_jobs.map((j) => (
              <div className="crm-run" key={j.id}>
                <strong>{j.kind.replace(/_/g, " ")}</strong>
                <p>{j.safe_error}</p>
                {j.status === "FAILED" && j.kind !== "send_message" && (
                  <button
                    onClick={() => act(`/operations/jobs/${j.id}/retry`, {})}
                  >
                    Retry
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="crm-muted">No failed jobs.</p>
          )}
          <h3>Recent activity</h3>
          {data?.audit.map((e) => (
            <div className="crm-funnel-row" key={e.id}>
              <span>{e.action.replace(/[._]/g, " ")}</span>
              <small>{date(e.created_at)}</small>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
