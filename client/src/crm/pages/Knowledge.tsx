import { useState } from "react";
import { write } from "../api";
import { date, Empty, ErrorBanner, Skeleton, useData } from "../components";
import { useCRM } from "../context";
type Article = {
  id: number;
  title: string;
  category: string;
  language: string;
  content: string;
  status: string;
  updated_at?: string;
};
const blank: Article = {
  id: 0,
  title: "",
  category: "Admissions",
  language: "en",
  content: "",
  status: "DRAFT",
};
export default function Knowledge() {
  const { user } = useCRM();
  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN";
  const [tick, setTick] = useState(0),
    [editing, setEditing] = useState<Article | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    data,
    loading,
    error: loadError,
  } = useData<Article[]>("/knowledge", tick);
  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await write(
        "/knowledge" + (editing.id ? "/" + editing.id : ""),
        editing,
        editing.id ? "PATCH" : "POST",
      );
      setEditing(null);
      setTick((t) => t + 1);
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
          <span className="crm-eyebrow">TRUSTED ANSWERS</span>
          <h1>Knowledge</h1>
          <p>Give counselors and AI a reliable source for NajmUni guidance.</p>
        </div>
        {canEdit && (
          <button className="crm-primary" onClick={() => setEditing(blank)}>
            + New article
          </button>
        )}
      </header>
      <ErrorBanner message={error || loadError} />
      {editing ? (
        <section className="crm-editor-section crm-article-editor">
          <label>
            Title
            <input
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
          </label>
          <div className="crm-form-grid">
            <label>
              Category
              <input
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              />
            </label>
            <label>
              Language
              <select
                value={editing.language}
                onChange={(e) =>
                  setEditing({ ...editing, language: e.target.value })
                }
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>ARCHIVED</option>
              </select>
            </label>
          </div>
          <label>
            Trusted guidance
            <textarea
              rows={15}
              dir="auto"
              value={editing.content}
              onChange={(e) =>
                setEditing({ ...editing, content: e.target.value })
              }
            />
          </label>
          <footer>
            <button onClick={() => setEditing(null)}>Cancel</button>{" "}
            <button
              className="crm-primary"
              disabled={busy || !canEdit}
              onClick={save}
            >
              Save article
            </button>
          </footer>
        </section>
      ) : loading ? (
        <Skeleton />
      ) : data?.length ? (
        <div className="crm-articles">
          {data.map((a) => (
            <article className="crm-article" key={a.id}>
              <header>
                <span className="crm-tag">{a.category}</span>
                <span
                  className={
                    "crm-tag " + (a.status === "PUBLISHED" ? "success" : "")
                  }
                >
                  {a.status}
                </span>
              </header>
              <h2 dir="auto">{a.title}</h2>
              <p dir="auto">{a.content}</p>
              <footer>
                <small>
                  {a.language.toUpperCase()} · {date(a.updated_at)}
                </small>
                <button onClick={() => setEditing(a)}>
                  {canEdit ? "Edit" : "Read"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Build a trusted knowledge base"
          detail="Add admissions guidance, visa FAQs and service policies. Only published articles are used by the copilot."
        />
      )}
    </main>
  );
}
