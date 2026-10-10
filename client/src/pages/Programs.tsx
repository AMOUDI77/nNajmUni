import { useSearchParams } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import {
  Notice,
  PageIntro,
  ProgramRow,
  fieldLabel,
  levelLabel,
  useCopy,
} from "../components/public/UI";
export default function Programs() {
  const c = useCopy();
  const { programs, loading, offline } = useCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const field = params.get("field") || "";
  const level = params.get("level") || "";
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = programs.filter(
    (p) =>
      (!field || p.field === field) &&
      (!level || p.level === level) &&
      `${p.name} ${p.university_name} ${fieldLabel(p.field, c)}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        eyebrow={c("البرامج الدراسية", "Study programs")}
        title={c("ما الذي تريد أن تدرسه؟", "What would you like to study?")}
      >
        {c(
          "برامج من دليلنا، مع المدة والرسوم والخطوة التالية في مكان واحد.",
          "Directory programs, duration, tuition and your next step in one place.",
        )}
      </PageIntro>
      <Notice />
      {offline && (
        <p className="nu-small">
          {c(
            "نسخة محفوظة من الدليل؛ تحتاج المعلومات تأكيدًا.",
            "Saved directory; details require confirmation.",
          )}
        </p>
      )}
      <div className="nu-filters">
        <label>
          {c("ابحث عن برنامج", "Search programs")}
          <input
            type="search"
            value={q}
            onChange={(e) => set("q", e.target.value)}
            placeholder={c(
              "اسم البرنامج أو الجامعة",
              "Program or university name",
            )}
          />
        </label>
        <label>
          {c("المجال", "Field")}
          <select value={field} onChange={(e) => set("field", e.target.value)}>
            <option value="">{c("كل المجالات", "All fields")}</option>
            {[...new Set(programs.map((p) => p.field))].map((f) => (
              <option value={f} key={f}>
                {fieldLabel(f, c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c("المرحلة", "Level")}
          <select value={level} onChange={(e) => set("level", e.target.value)}>
            <option value="">{c("كل المراحل", "All levels")}</option>
            {["foundation", "diploma", "bachelor", "master", "phd"].map((l) => (
              <option key={l} value={l}>
                {levelLabel(l, c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="nu-result-count" role="status">
        {loading
          ? c("جاري تحميل البرامج…", "Loading programs…")
          : c(`${filtered.length} برنامج`, `${filtered.length} programs`)}
      </p>
      {filtered.map((p) => (
        <ProgramRow key={p.id} program={p} />
      ))}
      {!loading && !filtered.length && (
        <div className="nu-empty">
          <h2>
            {c(
              "لم نجد برنامجًا بهذه الخيارات",
              "No programs match these filters",
            )}
          </h2>
          <button className="nu-button" onClick={() => setParams({})}>
            {c("عرض كل البرامج", "Show all programs")}
          </button>
        </div>
      )}
    </main>
  );
}
