import { useCopy } from '../copy';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { applicationUrl, levels, track, useCatalog } from '../discovery';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { studyDuration, fieldLabels } from '../catalogPresentation';
import InstitutionIdentity from '../components/InstitutionIdentity';
import { curriculumFor } from '../programDetails';
import { subjectGuide } from '../studyFields';

export default function ProgramDetail() {
  const { tr, language: copyLanguage } = useCopy();
  const { id } = useParams();
  const [params] = useSearchParams();
  const catalog = useCatalog();
  const program = catalog.programs.find(p => String(p.id) === id);
  const university = catalog.universities.find(u => u.id === program?.university_id);
  useEffect(() => {
    if (program) track('program_details_opened', { program_id: program.id });
  }, [program?.id]);
  if (catalog.loading) return <main className="student-page" role="status">{tr("جارٍ تحميل التخصص…")}</main>;
  if (!program) return <main className="student-page"><h1>{tr("التخصص غير موجود")}</h1><Link to="/explore">{tr("العودة للبحث")}</Link></main>;

  const preview = curriculumFor(program);
  const subject = subjectGuide(program);
  const isResearch = program.level === 'phd' || /by research|research mode/i.test(program.name);
  const context = { university: university?.name || program.university_name, program: program.name, level: program.level };
  const requestedBack = params.get('return');
  const universityPath = `/universities/${program.university_id}`;
  const back = requestedBack === universityPath || requestedBack?.startsWith(universityPath + '?') ? requestedBack
    : requestedBack?.startsWith('/explore?') || requestedBack === '/explore' ? requestedBack : '/explore';
  const fee = program.tuition_per_year && program.tuition_per_year > 0 ? program.tuition_per_year : null;

  return <main className="student-page program-detail" dir={copyLanguage === "ar" ? "rtl" : "ltr"}>
    <Link className="program-back" to={back}>→ {tr(back.startsWith(universityPath) ? 'العودة لتخصصات الجامعة' : 'العودة لنتائج البحث')}</Link>
    <header className="program-heading">
      {university && <InstitutionIdentity {...university} />}
      <p className="student-eyebrow">{tr(levels[program.level])} · {tr(fieldLabels[program.field] || program.field)}</p>
      <h1>{tr(subject.title)}</h1>
      <p className="program-full-title" dir="auto">{tr(program.name)}</p>
      <Link to={universityPath}>{tr(university?.name || program.university_name || 'عن الجامعة')}</Link>
    </header>
    {catalog.offline && <p className="student-notice">{tr("نعرض النسخة المحفوظة من الدليل.")}<button onClick={catalog.retry}>{tr("تحديث البيانات")}</button></p>}
    <dl className="program-facts" aria-label={tr("التخصص في لمحة")}>
      <div><dt>{tr("مدة الدراسة")}</dt><dd>{tr(studyDuration(program.duration_years))}</dd></div>
      <div><dt>{tr("الرسوم السنوية")}</dt><dd>{tr(fee ? <><bdi>{fee.toLocaleString()} MYR</bdi><small>{tr("تقديرية")}</small></> : 'نؤكدها لك')}</dd></div>
      <div><dt>{tr("موعد البداية")}</dt><dd dir="auto">{tr(program.intake || 'نؤكده لك')}</dd></div>
    </dl>
    <section className="student-card program-overview">
      <span className="detail-section-kicker">{tr("01 · افهم اختيارك")}</span>
      <h2>{tr("وش يعني هذا التخصص؟")}</h2>
      <p>{tr(preview?.summary || subject.about)}</p>
      <div className="program-fit"><strong>{tr("ممكن يناسبك")}</strong><p>{tr(subject.fit)}</p></div>
      <h2 className="program-subject-title">{tr(preview ? 'مواد من الخطة الدراسية' : isResearch ? 'المجال البحثي عن قرب' : 'وش تتعلّم في هذا المجال؟')}</h2>
      {preview ? <>
        <p className="program-caption">{tr("أربع مواد من الخطة المنشورة، بأسماء عربية مبسطة.")}</p>
        <ul className="program-subjects">{preview.subjects.map((subject, index) => <li key={subject}><span aria-hidden="true">0{index + 1}</span>{tr(subject)}</li>)}</ul>
      </> : <><p className="program-caption">{tr(isResearch ? 'الموضوع البحثي والخطة يحددان مع الجامعة والمشرف. هذه محاور لفهم المجال.' : 'هذه محاور تعريفية بالمجال؛ أسماء المواد الفعلية تختلف حسب الجامعة والخطة.')}</p>{subject.topics.length > 0 && <ul className="program-subjects">{subject.topics.map((topic,index)=><li key={topic}><span aria-hidden="true">0{index+1}</span>{tr(topic)}</li>)}</ul>}</>}
    </section>
    <div className="program-insight-grid"><section className="student-card"><span className="detail-section-kicker">{tr("02 · بعد الدراسة")}</span><h2>{tr("وين ممكن تتجه؟")}</h2><ul className="program-careers">{subject.careers.map(career=><li key={career}>{tr(career)}</li>)}</ul><p className="program-caption">{tr("أمثلة لمسارات المجال، وليست ضمان توظيف. المهن المنظمة تتطلب التأهيل والترخيص في بلد العمل.")}</p></section>
    <section className="student-card"><span className="detail-section-kicker">{tr("03 · قبل التقديم")}</span><h2>{tr("وش تجهّز للمراجعة؟")}</h2><ul className="program-prepare"><li>{tr(program.level === 'master' || program.level === 'phd' ? 'الشهادة الجامعية وكشف الدرجات' : 'آخر شهادة دراسية وكشف الدرجات')}</li><li>{tr("نتيجة اختبار اللغة إن وجدت")}</li><li>{tr(isResearch ? 'فكرة عن الموضوع البحثي الذي يهمك' : 'موعد البداية والميزانية المناسبة لك')}</li></ul><p className="program-caption">{tr("نراجع مؤهلك مقابل شروط البرنامج ونؤكد لك متطلبات اللغة قبل التقديم.")}</p></section></div>
    <details className="student-card program-more" key={program.id}>
      <summary>{tr("تفاصيل الرسوم والخطة الدراسية")}</summary>
      <div className="program-more-content">
        <h3>{tr("القبول واللغة")}</h3><p>{tr("نراجع مؤهلك ونتيجة اللغة مع شروط البرنامج قبل التقديم، ونؤكد الحرم ونمط الدراسة والدفعة المتاحة.")}</p>
        <h3>{tr("وش تشمل الرسوم؟")}</h3><p>{tr("الرسوم المسجلة مرجعية وليست عرضًا نهائيًا. نؤكد الرسوم الإضافية والضرائب والتأمين والتأشيرة والودائع مع الجامعة.")}</p>
        <Link to="/costs">{tr("احسب ميزانية السكن والمعيشة")}</Link>
        {tr(program.description && <><h3>{tr("وصف البرنامج في الدليل")}</h3><p dir="auto">{program.description}</p></>)}
        {preview ? <p>{tr("المواد المعروضة مختارات من خطة الجامعة، وليست جميع المواد. نؤكد لك الخطة الخاصة بدفعتك عند المراجعة.")}</p> : <p>{tr("المحاور المعروضة تعريف بالمجال وليست قائمة مواد الجامعة. نراجع الخطة الفعلية لهذا البرنامج ضمن طلبك.")}</p>}
      </div>
    </details>
    <div className="program-next-step">
      <div><h2>{tr("ناسبك التخصص؟")}</h2><p>{tr("عبّي طلبك ونراجع تفاصيله معك على واتساب.")}</p></div>
      <Link className="student-button" to={applicationUrl(context)}><WhatsAppIcon />{tr("يلا ابدأ قبولك")}</Link>
    </div>
  </main>;
}
