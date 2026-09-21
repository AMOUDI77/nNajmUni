import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { write } from "../api";
import {
  Avatar,
  Empty,
  ErrorBanner,
  Skeleton,
  useData,
  useDebounce,
} from "../components";
import { useCRM } from "../context";
import type { Contact, Page, Label, Staff } from "../types";
import ContactPanel, { stages } from "./ContactPanel";

export default function Contacts() {
  const { contactId } = useParams(),
    { user, ar } = useCRM();
  const [q, setQ] = useState(""),
    [stage, setStage] = useState(""),
    [tick, setTick] = useState(0),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [before, setBefore] = useState(0);
  const search = useDebounce(q);
  const [filters, setFilters] = useState({
    country: "",
    program: "",
    label: "",
    assigned_to: "",
    source: "",
  });
  const filterQuery = useDebounce(new URLSearchParams(filters).toString());
  const { data: labels } = useData<Label[]>("/labels");
  const { data: team } = useData<Staff[]>("/team");
  const { data: sources } =
    useData<{ id: number; campaign_name: string }[]>("/sources");
  const {
    data,
    loading,
    error: loadError,
  } = useData<Page<Contact>>(
    `/contacts?q=${encodeURIComponent(search)}&stage=${stage}&before=${before}&${filterQuery}`,
    tick,
  );
  return (
    <main className="crm-page">
      <header className="crm-page-header">
        <div>
          <span className="crm-eyebrow">STUDENT JOURNEYS</span>
          <h1>{ar ? "جهات الاتصال" : "Contacts"}</h1>
          <p>Turn the first conversation into a clear next step.</p>
        </div>
        {user?.role !== "VIEWER" && (
          <button
            className="crm-primary"
            onClick={() => setCreating(!creating)}
          >
            + New contact
          </button>
        )}
      </header>
      <ErrorBanner message={error || loadError} />
      {creating && (
        <form
          className="crm-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await write("/contacts", values);
              setCreating(false);
              setTick((t) => t + 1);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            Full name
            <input required name="display_name" dir="auto" />
          </label>
          <label>
            Email
            <input type="email" name="email" />
          </label>
          <label>
            Phone
            <input name="phone" />
          </label>
          <button className="crm-primary">Create contact</button>
        </form>
      )}
      <div className="crm-table-toolbar">
        <input
          placeholder="Search name, username, phone or email"
          aria-label="Search contacts"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setBefore(0);
          }}
        />
        <select
          aria-label="Filter stage"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            setBefore(0);
          }}
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <details className="crm-contact-filters">
        <summary>More filters</summary>
        <div className="crm-form-grid">
          {(["country", "program"] as const).map((key) => (
            <label key={key}>
              {key === "country" ? "Country" : "Study interest"}
              <input
                value={filters[key]}
                onChange={(e) => {
                  setFilters({ ...filters, [key]: e.target.value });
                  setBefore(0);
                }}
              />
            </label>
          ))}
          <label>
            Label
            <select
              value={filters.label}
              onChange={(e) => {
                setFilters({ ...filters, label: e.target.value });
                setBefore(0);
              }}
            >
              <option value="">All labels</option>
              {labels
                ?.filter((l) => !l.archived)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Counselor
            <select
              value={filters.assigned_to}
              onChange={(e) => {
                setFilters({ ...filters, assigned_to: e.target.value });
                setBefore(0);
              }}
            >
              <option value="">All counselors</option>
              {team?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select
              value={filters.source}
              onChange={(e) => {
                setFilters({ ...filters, source: e.target.value });
                setBefore(0);
              }}
            >
              <option value="">All sources</option>
              {sources?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.campaign_name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <div
        className={"crm-contact-directory " + (contactId ? "with-detail" : "")}
      >
        <div>
          {loading && !data ? (
            <Skeleton />
          ) : data?.items.length ? (
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Country</th>
                    <th>Stage</th>
                    <th>Study interest</th>
                    <th>Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr
                      key={c.id}
                      className={contactId === String(c.id) ? "selected" : ""}
                    >
                      <td>
                        <Link to={"/crm/contacts/" + c.id}>
                          <Avatar name={c.display_name} />
                          <span dir="auto">{c.display_name}</span>
                        </Link>
                      </td>
                      <td>{c.country || "—"}</td>
                      <td>
                        <span className="crm-tag">{c.stage.toLowerCase()}</span>
                      </td>
                      <td dir="auto">
                        {c.program_interests || c.degree_level || "—"}
                      </td>
                      <td>{c.lead_id ? "Linked" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No contacts yet"
              detail="Incoming Instagram conversations create contacts automatically. You can also add one manually."
            />
          )}
          <div className="crm-pagination">
            <button disabled={!before} onClick={() => setBefore(0)}>
              First page
            </button>
            <button
              disabled={!data?.next_cursor}
              onClick={() => setBefore(data?.next_cursor || 0)}
            >
              Next page
            </button>
          </div>
        </div>
        {contactId && (
          <div className="crm-directory-detail">
            <Link to="/crm/contacts">← All contacts</Link>
            <ContactPanel
              id={Number(contactId)}
              onChange={() => setTick((t) => t + 1)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
