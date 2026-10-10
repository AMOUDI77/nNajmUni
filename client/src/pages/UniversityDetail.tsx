import { Link, useParams } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import {
  Action,
  Notice,
  PageIntro,
  ProgramRow,
  consultationHref,
  money,
  useCopy,
} from "../components/public/UI";
import NotFound from "./NotFound";
export default function UniversityDetail() {
  const c = useCopy();
  const { id } = useParams();
  const { universities, programs, loading } = useCatalog();
  const uni = universities.find((u) => u.id === Number(id));
  if (loading)
    return (
      <main id="main-content" className="nu-container nu-page" role="status">
        {c("جاري تحميل الجامعة…", "Loading university…")}
      </main>
    );
  if (!uni) return <NotFound />;
  const list = programs.filter((p) => p.university_id === uni.id);
  return (
    <main id="main-content" className="nu-container nu-page">
      <Link className="nu-text-link" to="/universities">
        {c("كل الجامعات", "All universities")}
      </Link>
      <PageIntro eyebrow={uni.abbr} title={uni.name}>
        {uni.location}
      </PageIntro>
      <Notice />
      <div className="nu-detail-overview">
        <div>
          <span className="nu-meta">
            {c(
              "نطاق الرسوم السنوية في الدليل",
              "Directory annual tuition range",
            )}
          </span>
          <strong dir="ltr">
            {money(uni.tuition_min)} – {money(uni.tuition_max)}
          </strong>
          <p>
            {c(
              "الرسوم تختلف حسب البرنامج، ولا تشمل كل تكاليف الدراسة.",
              "Fees vary by program and do not include all study expenses.",
            )}
          </p>
        </div>
        <Action
          to={consultationHref({
            university: uni.id,
            source: "university",
            intent: "application",
          })}
        >
          {c("اطلب مساعدة بالتقديم", "Request application assistance")}
        </Action>
      </div>
      <section className="nu-section">
        <div className="nu-section-heading">
          <h2>{c("برامج هذه الجامعة", "Programs at this university")}</h2>
          <a
            className="nu-text-link"
            href={/^https?:\/\//.test(uni.website) ? uni.website : undefined}
            target="_blank"
            rel="noreferrer"
          >
            {c("الموقع الرسمي", "Official website")} ↗
          </a>
        </div>
        {list.map((p) => (
          <ProgramRow key={p.id} program={p} />
        ))}
        {!list.length && (
          <p>
            {c(
              "لا توجد برامج مسجلة حاليًا. اطلب من المستشار مراجعة التخصص المطلوب.",
              "No programs are currently listed. Ask an advisor to review your intended field.",
            )}
          </p>
        )}
      </section>
      <section className="nu-trust-note">
        <h2>{c("قبل التقديم", "Before applying")}</h2>
        <p>
          {c(
            "شروط الشهادة، درجات المواد، اللغة ومواعيد القبول تختلف حسب البرنامج. لا تتوفر لدينا قواعد موثقة لتقييم أهليتك تلقائيًا. نراجعها معك قبل بدء التقديم الرسمي.",
            "Qualification, subject grades, language and intakes vary by program. We do not have verified rules to automatically assess eligibility. Review these before an official application.",
          )}
        </p>
      </section>
    </main>
  );
}
