import { useState } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import { Notice, PageIntro, money, useCopy } from "../components/public/UI";
export default function Universities() {
  const c = useCopy();
  const { universities, loading, offline } = useCatalog();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [compare, setCompare] = useState<number[]>([]);
  const types = [
    ["", c("كل الجامعات", "All universities")],
    ["public", c("حكومية", "Public")],
    ["private", c("خاصة", "Private")],
    ["foreign_branch", c("فرع دولي", "International branch")],
  ];
  const filtered = universities.filter(
    (u) =>
      (!type || u.type === type) &&
      `${u.name} ${u.abbr} ${u.location}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        eyebrow={c("دليل الجامعات", "University directory")}
        title={c("اختر بيئة دراستك.", "Find your place to study.")}
      >
        {c(
          "استكشف الموقع والبرامج والرسوم. يمكنك مقارنة جامعتين أو ثلاث قبل اتخاذ الخطوة التالية.",
          "Explore locations, programs and fees. Compare two or three universities before your next step.",
        )}
      </PageIntro>
      <Notice />
      {offline && (
        <p className="nu-notice">
          {c(
            "نعرض نسخة الدليل المحفوظة لعدم توفر الاتصال بالخدمة.",
            "Showing the saved directory while the service is unavailable.",
          )}
        </p>
      )}
      <div className="nu-filters">
        <label>
          {c("ابحث عن جامعة أو مدينة", "Search university or city")}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="APU, Kuala Lumpur…"
          />
        </label>
        <label>
          {c("نوع الجامعة", "University type")}
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {compare.length > 0 && (
        <section
          className="nu-comparison"
          aria-label={c("مقارنة الجامعات", "University comparison")}
        >
          <div className="nu-section-heading">
            <h2>{c("مقارنة سريعة", "At a glance")}</h2>
            <button className="nu-text-link" onClick={() => setCompare([])}>
              {c("مسح المقارنة", "Clear comparison")}
            </button>
          </div>
          <div className="nu-table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>{c("المعلومة", "Detail")}</th>
                  {universities
                    .filter((u) => compare.includes(u.id))
                    .map((u) => (
                      <th key={u.id}>{u.abbr}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[
                  c("المدينة", "Location"),
                  c("الرسوم السنوية الاسترشادية", "Indicative annual tuition"),
                ].map((label, i) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {universities
                      .filter((u) => compare.includes(u.id))
                      .map((u) => (
                        <td key={u.id} dir="auto">
                          {i === 0
                            ? u.location
                            : `${money(u.tuition_min)} – ${money(u.tuition_max)}`}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nu-small">
            {c(
              "تختلف الرسوم حسب البرنامج. المقارنة لا تعني ملاءمة شروط القبول.",
              "Fees vary by program. This comparison does not assess eligibility.",
            )}
          </p>
        </section>
      )}
      <p className="nu-result-count" role="status">
        {loading
          ? c("جاري تحميل الدليل…", "Loading directory…")
          : c(`${filtered.length} جامعة`, `${filtered.length} universities`)}
      </p>
      <div className="nu-university-grid">
        {filtered.map((u) => (
          <article className="nu-university" key={u.id}>
            <span className="nu-university-mark">{u.abbr}</span>
            <span className="nu-meta">
              {types.find(([id]) => id === u.type)?.[1]}
            </span>
            <h2>
              <Link to={`/universities/${u.id}`} dir="auto">
                {u.name}
              </Link>
            </h2>
            <p dir="auto">{u.location}</p>
            <div className="nu-university-fee">
              <span>
                {c(
                  "نطاق الرسوم السنوية في الدليل",
                  "Directory annual tuition range",
                )}
              </span>
              <strong dir="ltr">
                {money(u.tuition_min)} – {money(u.tuition_max)}
              </strong>
            </div>
            <div className="nu-card-actions">
              <Link className="nu-text-link" to={`/universities/${u.id}`}>
                {c("البرامج والتفاصيل", "Programs & details")} ↗
              </Link>
              <label className="nu-check">
                <input
                  type="checkbox"
                  checked={compare.includes(u.id)}
                  disabled={!compare.includes(u.id) && compare.length === 3}
                  onChange={() =>
                    setCompare((s) =>
                      s.includes(u.id)
                        ? s.filter((id) => id !== u.id)
                        : [...s, u.id],
                    )
                  }
                />
                {c("قارن", "Compare")}
              </label>
            </div>
          </article>
        ))}
      </div>
      {!loading && !filtered.length && (
        <div className="nu-empty">
          <h2>{c("لا توجد نتائج لهذا البحث", "No matches found")}</h2>
          <button
            className="nu-button"
            onClick={() => {
              setQ("");
              setType("");
            }}
          >
            {c("مسح البحث", "Clear filters")}
          </button>
        </div>
      )}
    </main>
  );
}
