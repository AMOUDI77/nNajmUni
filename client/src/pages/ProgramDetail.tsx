import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import {
  Action,
  Notice,
  PageIntro,
  consultationHref,
  levelLabel,
  money,
  useCopy,
} from "../components/public/UI";
import NotFound from "./NotFound";
export default function ProgramDetail() {
  const c = useCopy();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { programs, universities, loading } = useCatalog();
  const p = programs.find((p) => p.id === Number(id));
  if (loading)
    return (
      <main id="main-content" className="nu-container nu-page" role="status">
        {c("جاري تحميل البرنامج…", "Loading program…")}
      </main>
    );
  if (!p) return <NotFound />;
  const u = universities.find((u) => u.id === p.university_id);
  const rows = [
    [c("المرحلة", "Level"), levelLabel(p.level, c)],
    [
      c("المدة حسب الدليل", "Directory duration"),
      p.duration_years
        ? c(`${p.duration_years} سنوات`, `${p.duration_years} years`)
        : c("تحتاج تأكيدًا", "Requires confirmation"),
    ],
    [
      c("الرسوم السنوية الاسترشادية", "Indicative annual tuition"),
      p.tuition_per_year > 0
        ? money(p.tuition_per_year)
        : c("تحتاج تأكيدًا", "Requires confirmation"),
    ],
    [
      c(
        "مواعيد مسجلة — تحتاج تأكيد التوفر",
        "Listed intakes — availability unconfirmed",
      ),
      p.intake || c("تحتاج تأكيدًا", "Requires confirmation"),
    ],
    [
      c("شروط القبول الأكاديمية", "Academic requirements"),
      c(
        "تحتاج مراجعة مؤهلك مع الجامعة",
        "Your qualification requires university review",
      ),
    ],
    [
      c("متطلبات اللغة", "Language requirements"),
      c(
        "تحتاج تأكيدًا لهذا البرنامج",
        "Requires confirmation for this program",
      ),
    ],
  ];
  return (
    <main id="main-content" className="nu-container nu-page">
      <Link className="nu-text-link" to="/programs">
        {c("كل البرامج", "All programs")}
      </Link>
      <PageIntro eyebrow={u?.name || p.university_name} title={p.name}>
        {u?.location}
      </PageIntro>
      <Notice />
      <div className="nu-detail-grid">
        <dl className="nu-facts">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd dir="auto">{value}</dd>
            </div>
          ))}
        </dl>
        <aside className="nu-review-panel">
          <span className="nu-eyebrow">
            {c("خطوتك القادمة", "Your next step")}
          </span>
          <h2>
            {c("هل يناسبك هذا البرنامج؟", "Is this program right for you?")}
          </h2>
          <p>
            {c(
              "أرسل طلب مراجعة بسيطًا. سيصل اسم البرنامج والجامعة للمستشار مع طلبك.",
              "Send a simple review request. Your advisor receives the selected program and university.",
            )}
          </p>
          <Action
            to={consultationHref({
              university: p.university_id,
              program: p.id,
              source:
                params.get("source") === "study-plan"
                  ? "study-plan"
                  : "program",
              intent: "application",
            })}
          >
            {c("اطلب مراجعة هذا البرنامج", "Request a program review")}
          </Action>
          <small>
            {c(
              "طلب مساعدة مبدئي، وليس طلب قبول رسميًا.",
              "Preliminary assistance, not an official university application.",
            )}
          </small>
        </aside>
      </div>
      <Link className="nu-text-link" to={`/universities/${p.university_id}`}>
        {c("المزيد عن الجامعة", "More about the university")} ↗
      </Link>
    </main>
  );
}
