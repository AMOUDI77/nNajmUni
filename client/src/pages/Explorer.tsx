import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { levels, track, useCatalog } from "../discovery";
import AdvisorLink from "../components/AdvisorLink";
import InstitutionIdentity from "../components/InstitutionIdentity";
import { fieldLabels, studyDuration } from '../catalogPresentation';
import CatalogSearchInput from "../components/CatalogSearchInput";
import {
  institutionSearchNames,
  programSearchNames,
  searchScore,
} from "../catalogSearch";

export default function Explorer() {
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    category = params.get("category") || "programs",
    level = params.get("level") || "",
    location = params.get("location") || "",
    university = params.get("university") || "",
    field = params.get('field') || '',
    sort = params.get('sort') || '';
  const shown = Math.max(12, Math.min(10000, Number(params.get("shown")) || 12));
  const update = (key: string, value: string) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        next.delete("shown");
        value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true },
    );
  useEffect(() => {
    track("explorer_opened");
  }, []);
  const programs = catalog.programs
    .map((p) => ({
      ...p,
      university: catalog.universities.find((u) => u.id === p.university_id),
    }))
    .map((p) => ({
      ...p,
      score: searchScore(q, [
        ...programSearchNames(p.name, p.field),
        ...institutionSearchNames(
          p.university?.name || "",
          p.university?.abbr || "",
        ),
      ]),
    }))
    .filter(
      (p) =>
        p.score > 0 &&
        (!level || level === p.level) &&
        (!field || field === p.field) &&
        (!location || p.university?.location === location) &&
        (!university || String(p.university_id) === university),
    )
    .sort((a, b) => {
      if (sort === 'fee') return (a.tuition_per_year ?? Infinity) - (b.tuition_per_year ?? Infinity) || a.name.localeCompare(b.name);
      const order = ['bachelor', 'master', 'foundation', 'diploma', 'phd', 'certificate', 'postgraduate_diploma', 'other'];
      return b.score - a.score || order.indexOf(a.level) - order.indexOf(b.level) || a.name.localeCompare(b.name);
    });
  const universities = catalog.universities
    .map((u) => ({
      ...u,
      score: searchScore(q, institutionSearchNames(u.name, u.abbr)),
    }))
    .filter((u) => u.score > 0 && (!location || u.location === location))
    .sort((a, b) => b.score - a.score);
  const institutes = catalog.institutes
    .map((i) => ({
      ...i,
      score: searchScore(q, [
        ...institutionSearchNames(i.name, i.abbr),
        "معهد لغة",
        "لغة انجليزية",
        "language",
        "english",
      ]),
    }))
    .filter((i) => i.score > 0 && (!location || i.location === location))
    .sort((a, b) => b.score - a.score);
  const suggestions = [
    ...catalog.universities.map((u) => ({
      key: `u-${u.id}`,
      name: u.name,
      caption: `جامعة · ${u.abbr}`,
      category: "universities",
      query: u.abbr,
      score: searchScore(q, institutionSearchNames(u.name, u.abbr)),
    })),
    ...catalog.institutes.map((i) => ({
      key: `i-${i.id}`,
      name: i.name,
      caption: `معهد لغة · ${i.abbr}`,
      category: "institutes",
      query: i.abbr,
      score: searchScore(q, [
        ...institutionSearchNames(i.name, i.abbr),
        "معهد لغة",
      ]),
    })),
    ...catalog.programs.map((p) => ({
      key: `p-${p.id}`,
      name: p.name,
      caption: `تخصص · ${catalog.universities.find((u) => u.id === p.university_id)?.abbr || ""}`,
      category: "programs",
      query: p.name,
      score: searchScore(q, programSearchNames(p.name, p.field)),
    })),
  ]
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            other.category === item.category && other.query === item.query,
        ) === index,
    )
    .slice(0, 6);
  const count =
    category === "universities"
      ? universities.length
      : category === "institutes"
        ? institutes.length
        : programs.length;
  const locations = [
    ...new Set(
      (category === "institutes"
        ? catalog.institutes
        : catalog.universities
      ).map((x) => x.location),
    ),
  ].sort();
  return (
    <main className="student-page explorer-page" dir="rtl">
      <header>
        <p className="student-eyebrow">اكتشف خيارات الدراسة في ماليزيا</p>
        <h1>ابحث عن تخصصك أو جامعتك</h1>
        <p>
          تصفح الجامعات والمعاهد والتخصصات، واقرأ التفاصيل ثم ناقش خياراتك مع
          مستشار.
        </p>
      </header>
      <form
        className="student-search"
        onSubmit={(e) => {
          e.preventDefault();
          track("search_performed", { category, result_count: count });
          document.getElementById("explorer-results")?.focus();
        }}
      >
        <label htmlFor="explorer-query">التخصص أو الجامعة أو المعهد</label>
        <div className="student-actions">
          <CatalogSearchInput
            value={q}
            onChange={(value) => update("q", value)}
            suggestions={suggestions}
            onSelect={(item) => {
              setParams(
                { q: item.query, category: item.category },
                { replace: true },
              );
            }}
          />
          <button className="student-button">بحث</button>
        </div>
        <div
          className="student-actions explorer-categories"
          aria-label="نوع النتائج"
        >
          {[
            ["programs", "تخصصات"],
            ["universities", "جامعات"],
            ["institutes", "معاهد لغة"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className="student-button secondary"
              aria-pressed={category === value}
              onClick={() => {
                setParams(
                  (old) => {
                    const next = new URLSearchParams(old);
                    next.set("category", value);
                    next.delete("location");
                    return next;
                  },
                  { replace: true },
                );
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                {value === "programs" ? (
                  <>
                    <path d="m2 9 10-5 10 5-10 5-10-5Z" />
                    <path d="M6 11v6c4 3 8 3 12 0v-6M22 9v8" />
                  </>
                ) : value === "universities" ? (
                  <>
                    <path d="m3 9 9-6 9 6H3ZM3 21h18M5 10v8m7-8v8m7-8v8" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z" />
                  </>
                )}
              </svg>
              {label}
            </button>
          ))}
        </div>
        <div className="student-filters">
          {category === 'programs' && <>
            <label>الجامعة<select value={university} onChange={e => update('university', e.target.value)}>
              <option value="">كل الجامعات المتعاونة ({catalog.universities.length})</option>
              {[...catalog.universities].sort((a,b) => a.name.localeCompare(b.name)).map(u => <option key={u.id} value={u.id}>{u.abbr} · {u.name}</option>)}
            </select></label>
            <label>المجال الدراسي<select value={field} onChange={e => update('field', e.target.value)}>
              <option value="">كل المجالات</option>
              {[...new Set(catalog.programs.filter(p => !university || String(p.university_id) === university).map(p => p.field))].sort().map(f => <option key={f} value={f}>{fieldLabels[f] || f}</option>)}
            </select></label>
          </>}
          {category === "programs" && (
            <label>
              المرحلة الدراسية
              <select
                value={level}
                onChange={(e) => update("level", e.target.value)}
              >
                <option value="">كل المراحل</option>
                {Object.entries(levels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            الموقع
            <select
              value={location}
              onChange={(e) => update("location", e.target.value)}
            >
              <option value="">كل المواقع</option>
              {locations.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {university && (
            <button
              type="button"
              className="student-button secondary"
              onClick={() => update("university", "")}
            >
              إلغاء تحديد الجامعة
            </button>
          )}
          {category === 'programs' && <label>ترتيب النتائج<select value={sort} onChange={e => update('sort', e.target.value)}>
            <option value="">الأقرب للبحث</option><option value="fee">الرسوم السنوية: الأقل أولًا</option>
          </select></label>}
          {(q || level || field || university || location || sort) && <button type="button" className="student-button secondary" onClick={() => setParams({category})}>مسح كل الفلاتر</button>}
        </div>
      </form>
      {catalog.offline && (
        <p role="status" className="student-notice">
          تعذر تحديث الدليل؛ نعرض نسخة الموقع المحفوظة. التفاصيل تحتاج تأكيدًا.{" "}
          <button onClick={catalog.retry}>إعادة المحاولة</button>
        </p>
      )}
      <section id="explorer-results" tabIndex={-1} aria-busy={catalog.loading}>
        <h2 className="explorer-result-heading" aria-live="polite">
          {catalog.loading ? "جارٍ تحميل الخيارات…" : `${count} نتيجة`}
        </h2>
        {!catalog.loading && count === 0 && (
          <div className="student-card">
            <h3>لم نجد نتائج مطابقة</h3>
            <p>جرّب اسم الجامعة أو التخصص بالعربية أو الإنجليزية، أو خفّف الفلاتر. عدم ظهوره هنا لا يعني أنه غير متاح؛ اسألنا لنراجعه مع الجامعة.</p>
            <button
              className="student-button secondary"
              onClick={() => setParams({ category })}
            >
              مسح البحث والفلاتر
            </button>
            <AdvisorLink />
          </div>
        )}
        <div className="student-results">
          {!catalog.loading &&
            category === "programs" &&
            programs.slice(0, shown).map((p) => (
              <article key={p.id} className="student-card">
                <InstitutionIdentity
                  name={p.university?.name || p.university_name || ""}
                  abbr={p.university?.abbr || p.university_abbr || ""}
                  domain={p.university?.domain}
                  location={p.university?.location}
                />
                <p className="student-eyebrow">{levels[p.level]} · {fieldLabels[p.field] || p.field}</p>
                <h3 dir="auto">
                  <Link
                    to={`/programs/${p.id}?${new URLSearchParams({ return: "/explore?" + params.toString() })}`}
                    onClick={() =>
                      track("search_result_viewed", { program_id: p.id })
                    }
                  >
                    {p.name}
                  </Link>
                </h3>
                <dl className="explorer-facts">
                  <div>
                    <dt>مدة الدراسة</dt>
                    <dd>{studyDuration(p.duration_years)}</dd>
                  </div>
                  <div>
                    <dt>الرسوم السنوية المسجلة</dt>
                    <dd>
                      {p.tuition_per_year ? (
                        <>
                          <bdi>{p.tuition_per_year.toLocaleString()} MYR</bdi>
                          <small>تحتاج تأكيدًا</small>
                        </>
                      ) : (
                        "تحتاج تأكيدًا"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="student-actions">
                  <Link
                    className="student-button secondary"
                    to={`/programs/${p.id}?${new URLSearchParams({ return: "/explore?" + params.toString() })}`}
                  >
                    عرض التفاصيل
                  </Link>
                  <AdvisorLink
                    context={{
                      university: p.university?.name,
                      program: p.name,
                      level: p.level,
                    }}
                  >
                    استفسر عن هذا التخصص
                  </AdvisorLink>
                </div>
              </article>
            ))}
          {!catalog.loading &&
            category === "universities" &&
            universities.slice(0, shown).map((u) => (
              <article className="student-card" key={u.id}>
                <InstitutionIdentity
                  name={u.name}
                  abbr={u.abbr}
                  domain={u.domain}
                  location={u.location}
                />
                <div className="explorer-tags">
                  <span>
                    {u.abbr === 'UTMSPACE' ? 'مسار برامج تابع لـ UTM' : u.type === "public"
                      ? "جامعة حكومية"
                      : u.type === "foreign_branch"
                        ? "فرع جامعة دولية"
                        : "جامعة خاصة"}
                  </span>
                  <span>
                    {
                      catalog.programs.filter((p) => p.university_id === u.id)
                        .length
                    }{" "}
                    تخصص في الدليل
                  </span>
                </div>
                <h3 className="university-card-title">اكتشف برامج {u.abbr}</h3>
                <p className="explorer-card-copy">
                  تعرف على التخصصات والمدة والرسوم المتاحة، واختر ما يناسب خطتك.
                </p>
                <div className="student-actions">
                  <Link
                    className="student-button secondary"
                    to={`/explore?category=programs&university=${u.id}`}
                  >
                    تصفح التخصصات
                  </Link>
                  <Link to={`/universities/${u.id}`}>عن الجامعة</Link>
                  <AdvisorLink context={{ university: u.name }} />
                </div>
              </article>
            ))}
          {!catalog.loading &&
            category === "institutes" &&
            institutes.slice(0, shown).map((i) => (
              <article className="student-card" key={i.id}>
                <InstitutionIdentity
                  name={i.name}
                  abbr={i.abbr}
                  domain={i.domain}
                  location={i.location}
                />
                <p className="student-eyebrow">معهد لغة</p>
                <h3 dir="auto">{i.abbr}</h3>
                <p className="explorer-card-copy" dir="auto">
                  {i.description}
                </p>
                <p>
                  المدة والرسوم وموعد البداية والسكن: تحتاج تأكيدًا من المستشار.
                </p>
                <AdvisorLink
                  context={{ university: i.name, program: "دراسة اللغة" }}
                >
                  استفسر عن هذا المعهد
                </AdvisorLink>
              </article>
            ))}
        </div>
        {!catalog.loading && count > shown && (
          <button
            className="student-button secondary"
            onClick={() => update("shown", String(shown + 12))}
          >
            {"\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064a\u062f"}
          </button>
        )}
      </section>
      <nav
        className="student-actions student-utilities"
        aria-label="أدوات مساعدة"
      >
        <Link to="/universities">دليل الجامعات الأصلي</Link>
        <Link to="/institutes">دليل المعاهد</Link>
        <Link to="/study-plan">ساعدني أختار</Link>
        <Link to="/compare">مقارنة الجامعات</Link>
        <Link to="/costs">حاسبة الميزانية</Link>
      </nav>
    </main>
  );
}
