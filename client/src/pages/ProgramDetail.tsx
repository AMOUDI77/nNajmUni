import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { applicationUrl, levels, track, useCatalog } from "../discovery";
import AdvisorLink from "../components/AdvisorLink";
import { studyDuration, fieldLabels } from '../catalogPresentation';
import InstitutionIdentity from '../components/InstitutionIdentity';
export default function ProgramDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const catalog = useCatalog();
  const program = catalog.programs.find((p) => String(p.id) === id);
  const university = catalog.universities.find(
    (u) => u.id === program?.university_id,
  );
  useEffect(() => {
    if (program) track("program_details_opened", { program_id: program.id });
  }, [program?.id]);
  const back = params.get("return") || "/explore";
  if (catalog.loading)
    return (
      <main className="student-page" role="status">
        جارٍ تحميل التخصص…
      </main>
    );
  if (!program)
    return (
      <main className="student-page">
        <h1>التخصص غير موجود</h1>
        <Link to="/explore">العودة للبحث</Link>
      </main>
    );
  const context = {
    university: university?.name,
    program: program.name,
    level: program.level,
  };
  return (
    <main className="student-page" dir="rtl">
      <Link
        to={
          back.startsWith("/explore?") || back === "/explore"
            ? back
            : "/explore"
        }
      >
        ← العودة لنتائج البحث
      </Link>
      <header>
        {university && <InstitutionIdentity {...university} />}
        <p className="student-eyebrow">
          {levels[program.level]} · {university?.abbr}
        </p>
        <h1 dir="auto">{program.name}</h1>
        <Link to={`/universities/${program.university_id}`}>
          {university?.name}
        </Link>
        <p>
          {university?.location} · المدة المسجلة: {studyDuration(program.duration_years)}
        </p>
      </header>
      {catalog.offline && (
        <p className="student-notice">
          هذه نسخة الدليل المحفوظة؛ تعذر تحميل التحديثات.{" "}
          <button onClick={catalog.retry}>إعادة المحاولة</button>
        </p>
      )}
      <section className="student-card">
        <h2>عن التخصص</h2>
        <p dir="auto">{program.description || fieldLabels[program.field] || program.field}</p>
        {program.source_url && <p className="catalog-source">اسم البرنامج والرسوم من <a href={program.source_url} target="_blank" rel="noreferrer">{program.source_name}</a> · تاريخ الاطلاع: <bdi>{program.source_checked_at}</bdi>. نؤكد التوفر والحرم ونمط الدراسة مع الجامعة قبل تقديم طلبك.</p>}
        {university && <a href={university.website} target="_blank" rel="noreferrer">موقع الجامعة الرسمي ↗</a>}
      </section>
      <section className="student-card">
        <h2>الرسوم والتكاليف</h2>
        <p>
          {program.tuition_per_year
            ? `${program.tuition_per_year.toLocaleString()} رنجت ماليزي (MYR) سنويًا — تحتاج تأكيدًا`
            : "الرسوم غير متاحة؛ تحتاج تأكيدًا من المستشار."}
        </p>
        <p>
          المبلغ من دليل مرجعي، ولم يُؤكد بعرض رسمي من الجامعة. ليس عرض سعر نهائيًا.
          الضرائب والتأمين والتأشيرة والودائع والرسوم الإضافية غير موثقة لهذا
          البرنامج.
        </p>
        <Link to="/costs">قدّر ميزانية المعيشة والسكن باستخدام الحاسبة</Link>
      </section>
      <section className="student-card">
        <h2>شروط القبول واللغة</h2>
        <p>
          شروط المؤهل والمعدل ومتطلبات اللغة لهذا البرنامج غير موثقة في الدليل.
          تحتاج تأكيدًا من المستشار قبل تحديد أهليتك.
        </p>
        <h2>متى أقدر أبدأ؟</h2>
        <p>
          {program.intake ? `الفترات المسجلة: ${program.intake}. ` : ""}تحتاج
          تأكيدًا للدفعة القادمة وتوفر المقاعد؛ لا تمثل موعدًا نهائيًا للتقديم.
        </p>
      </section>
      <div className="student-actions">
        <AdvisorLink context={context}>استفسر عن هذا التخصص</AdvisorLink>
        <Link className="student-button" to={applicationUrl(context)}>
          ابدأ طلب التقديم
        </Link>
      </div>
    </main>
  );
}
