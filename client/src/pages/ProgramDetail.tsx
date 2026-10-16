import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { applicationUrl, levels, track, useCatalog } from '../discovery';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { studyDuration, fieldLabels } from '../catalogPresentation';
import InstitutionIdentity from '../components/InstitutionIdentity';
import { curriculumFor } from '../programDetails';
import { subjectGuide } from '../studyFields';

export default function ProgramDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const catalog = useCatalog();
  const program = catalog.programs.find(p => String(p.id) === id);
  const university = catalog.universities.find(u => u.id === program?.university_id);
  useEffect(() => {
    if (program) track('program_details_opened', { program_id: program.id });
  }, [program?.id]);
  if (catalog.loading) return <main className="student-page" role="status">جارٍ تحميل التخصص…</main>;
  if (!program) return <main className="student-page"><h1>التخصص غير موجود</h1><Link to="/explore">العودة للبحث</Link></main>;

  const preview = curriculumFor(program);
  const subject = subjectGuide(program);
  const isResearch = program.level === 'phd' || /by research|research mode/i.test(program.name);
  const context = { university: university?.name || program.university_name, program: program.name, level: program.level };
  const requestedBack = params.get('return');
  const universityPath = `/universities/${program.university_id}`;
  const back = requestedBack === universityPath || requestedBack?.startsWith(universityPath + '?') ? requestedBack
    : requestedBack?.startsWith('/explore?') || requestedBack === '/explore' ? requestedBack : '/explore';
  const fee = program.tuition_per_year && program.tuition_per_year > 0 ? program.tuition_per_year : null;

  return <main className="student-page program-detail" dir="rtl">
    <Link className="program-back" to={back}>→ {back.startsWith(universityPath) ? 'العودة لتخصصات الجامعة' : 'العودة لنتائج البحث'}</Link>
    <header className="program-heading">
      {university && <InstitutionIdentity {...university} />}
      <p className="student-eyebrow">{levels[program.level]} · {fieldLabels[program.field] || program.field}</p>
      <h1>{subject.title}</h1>
      <p className="program-full-title" dir="auto">{program.name}</p>
      <Link to={universityPath}>{university?.name || program.university_name || 'عن الجامعة'}</Link>
    </header>
    {catalog.offline && <p className="student-notice">نعرض النسخة المحفوظة من الدليل. <button onClick={catalog.retry}>تحديث البيانات</button></p>}
    <dl className="program-facts" aria-label="التخصص في لمحة">
      <div><dt>مدة الدراسة</dt><dd>{studyDuration(program.duration_years)}</dd></div>
      <div><dt>الرسوم السنوية</dt><dd>{fee ? <><bdi>{fee.toLocaleString()} MYR</bdi><small>تقديرية</small></> : 'نؤكدها لك'}</dd></div>
      <div><dt>موعد البداية</dt><dd dir="auto">{program.intake || 'نؤكده لك'}</dd></div>
    </dl>
    <section className="student-card program-overview">
      <span className="detail-section-kicker">01 · افهم اختيارك</span>
      <h2>وش يعني هذا التخصص؟</h2>
      <p>{preview?.summary || subject.about}</p>
      <div className="program-fit"><strong>ممكن يناسبك</strong><p>{subject.fit}</p></div>
      <h2 className="program-subject-title">{preview ? 'مواد من الخطة الدراسية' : isResearch ? 'المجال البحثي عن قرب' : 'وش تتعلّم في هذا المجال؟'}</h2>
      {preview ? <>
        <p className="program-caption">أربع مواد من الخطة المنشورة، بأسماء عربية مبسطة.</p>
        <ul className="program-subjects">{preview.subjects.map((subject, index) => <li key={subject}><span aria-hidden="true">0{index + 1}</span>{subject}</li>)}</ul>
      </> : <><p className="program-caption">{isResearch ? 'الموضوع البحثي والخطة يحددان مع الجامعة والمشرف. هذه محاور لفهم المجال.' : 'هذه محاور تعريفية بالمجال؛ أسماء المواد الفعلية تختلف حسب الجامعة والخطة.'}</p>{subject.topics.length > 0 && <ul className="program-subjects">{subject.topics.map((topic,index)=><li key={topic}><span aria-hidden="true">0{index+1}</span>{topic}</li>)}</ul>}</>}
    </section>
    <div className="program-insight-grid"><section className="student-card"><span className="detail-section-kicker">02 · بعد الدراسة</span><h2>وين ممكن تتجه؟</h2><ul className="program-careers">{subject.careers.map(career=><li key={career}>{career}</li>)}</ul><p className="program-caption">أمثلة لمسارات المجال، وليست ضمان توظيف. المهن المنظمة تتطلب التأهيل والترخيص في بلد العمل.</p></section>
    <section className="student-card"><span className="detail-section-kicker">03 · قبل التقديم</span><h2>وش تجهّز للمراجعة؟</h2><ul className="program-prepare"><li>{program.level === 'master' || program.level === 'phd' ? 'الشهادة الجامعية وكشف الدرجات' : 'آخر شهادة دراسية وكشف الدرجات'}</li><li>نتيجة اختبار اللغة إن وجدت</li><li>{isResearch ? 'فكرة عن الموضوع البحثي الذي يهمك' : 'موعد البداية والميزانية المناسبة لك'}</li></ul><p className="program-caption">نراجع مؤهلك مقابل شروط البرنامج ونؤكد لك متطلبات اللغة قبل التقديم.</p></section></div>
    <details className="student-card program-more" key={program.id}>
      <summary>تفاصيل الرسوم والخطة الدراسية</summary>
      <div className="program-more-content">
        <h3>القبول واللغة</h3><p>نراجع مؤهلك ونتيجة اللغة مع شروط البرنامج قبل التقديم، ونؤكد الحرم ونمط الدراسة والدفعة المتاحة.</p>
        <h3>وش تشمل الرسوم؟</h3><p>الرسوم المسجلة مرجعية وليست عرضًا نهائيًا. نؤكد الرسوم الإضافية والضرائب والتأمين والتأشيرة والودائع مع الجامعة.</p>
        <Link to="/costs">احسب ميزانية السكن والمعيشة</Link>
        {program.description && <><h3>وصف البرنامج في الدليل</h3><p dir="auto">{program.description}</p></>}
        {preview ? <p>المواد المعروضة مختارات من خطة الجامعة، وليست جميع المواد. نؤكد لك الخطة الخاصة بدفعتك عند المراجعة.</p> : <p>المحاور المعروضة تعريف بالمجال وليست قائمة مواد الجامعة. نراجع الخطة الفعلية لهذا البرنامج ضمن طلبك.</p>}
      </div>
    </details>
    <div className="program-next-step">
      <div><h2>ناسبك التخصص؟</h2><p>عبّي طلبك ونراجع تفاصيله معك على واتساب.</p></div>
      <Link className="student-button" to={applicationUrl(context)}><WhatsAppIcon />يلا ابدأ قبولك</Link>
    </div>
  </main>;
}
