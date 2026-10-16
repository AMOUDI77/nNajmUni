import { useCopy } from '../copy';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCatalog, levels, applicationUrl } from '../discovery';
import { studyFields } from '../studyFields';
import { programSearchScore } from '../catalogSearch';
import { ProgramCard } from '../components/StudyCards';
import InstitutionIdentity from '../components/InstitutionIdentity';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function UniversityDetail() {
  const { tr, language: copyLanguage } = useCopy();
  const { id } = useParams();
  const [params,setParams] = useSearchParams();
  const catalog = useCatalog();
  const uni = catalog.universities.find(u => String(u.id) === id);
  const field = params.get('field') || '', level = params.get('level') || '', q = params.get('q') || '';
  const shown = Math.max(12, Number(params.get('shown')) || 12);
  const update = (key:string,value:string) => setParams(old => {const next=new URLSearchParams(old);next.delete('shown');value ? next.set(key,value) : next.delete(key);return next;}, {replace:true});
  if(catalog.loading) return <main className="student-page" role="status">{tr("جارٍ تحميل الجامعة…")}</main>;
  if(!uni) return <main className="student-page"><h1>{tr("الجامعة غير موجودة")}</h1><Link to="/universities">{tr("دليل الجامعات")}</Link></main>;
  const allPrograms = catalog.programs.filter(p => p.university_id === uni.id);
  const fields = studyFields.filter(f => allPrograms.some(p=>p.field===f.key));
  const availableLevels = ['bachelor','diploma','foundation','master','phd','certificate','postgraduate_diploma','other'].filter(l=>allPrograms.some(p=>p.level===l));
  const programs = allPrograms.filter(p => (!field || p.field===field) && (!level || p.level===level) && programSearchScore(q,p)>0);
  const fees = allPrograms.map(p=>p.tuition_per_year).filter((n): n is number=>!!n && n>0);
  const returnTo = `/universities/${uni.id}${params.size ? '?'+params.toString() : ''}`;
  return <main className="discovery-page university-profile" dir={copyLanguage === "ar" ? "rtl" : "ltr"}>
    <Link className="discovery-back" to="/universities">{tr("→ كل الجامعات")}</Link>
    <header className="university-profile-hero"><div className="university-profile-watermark" aria-hidden="true">{tr(uni.abbr)}</div><div className="university-profile-content"><span className="discovery-kicker">{tr(uni.abbr==='UTMSPACE'?'مسار برامج تابع لـ UTM':uni.type==='public'?'جامعة حكومية':uni.type==='foreign_branch'?'فرع جامعة دولية':'جامعة خاصة')} {tr("· ماليزيا")}</span><InstitutionIdentity {...uni}/><h1 dir="auto">{tr(uni.name)}</h1><p>{tr("تعرّف على المجالات والبرامج في")}{tr(uni.abbr)}{tr("، وافتح التخصص اللي يهمك لتفهم محتواه وتكلفته ومساراته.")}</p><Link className="university-compare" to={`/compare?university=${uni.id}`}>{tr("قارن هذه الجامعة ↔")}</Link></div></header>
    <div className="university-profile-facts"><div><span>{tr("برامج في الدليل")}</span><strong>{allPrograms.length}</strong></div><div><span>{tr("مجالات دراسية")}</span><strong>{fields.length}</strong></div><div><span>{tr("الموقع")}</span><strong dir="auto">{tr(uni.location)}</strong></div><div><span>{tr("رسوم سنوية تبدأ من · تقديرية")}</span><strong>{tr(fees.length ? <bdi>{Math.min(...fees).toLocaleString()} MYR</bdi> : 'تُحدّد عند المراجعة')}</strong></div></div>
    {catalog.offline && <p className="student-notice">{tr("نعرض نسخة الدليل المحفوظة.")}<button onClick={catalog.retry}>{tr("تحديث")}</button></p>}
    <div className="discovery-section-title"><div><p>{tr("خذ وقتك في الاختيار")}</p><h2>{tr("وش تبي تدرس في")}{tr(uni.abbr)}{tr("؟")}</h2></div><span>{allPrograms.length} {tr("برنامجًا")}</span></div>
    <div className="university-levels" aria-label={tr("المرحلة الدراسية")}><button aria-pressed={!level} onClick={()=>update('level','')}>{tr("كل المراحل")}</button>{availableLevels.map(l=><button key={l} aria-pressed={level===l} onClick={()=>update('level',l)}>{tr(levels[l])} <small>{allPrograms.filter(p=>p.level===l).length}</small></button>)}</div>
    <div className="discovery-workspace"><aside className="discovery-sidebar"><details open><summary>{tr("المجال الدراسي")}</summary><div className="university-fields"><button aria-pressed={!field} onClick={()=>update('field','')}>{tr("كل المجالات")}<span>{allPrograms.length}</span></button>{fields.map(f=><button key={f.key} aria-pressed={field===f.key} onClick={()=>update('field',f.key)}>{tr(f.title)}<span>{allPrograms.filter(p=>p.field===f.key).length}</span></button>)}</div></details></aside>
    <section className="discovery-results" aria-label={tr("تخصصات الجامعة")}><div className="university-program-search"><label htmlFor="university-program-query">{tr("ابحث داخل تخصصات الجامعة")}</label><input id="university-program-query" value={q} onChange={e=>update('q',e.target.value)} placeholder={tr("مثلًا: هندسة البرمجيات أو محاسبة")}/><span aria-live="polite">{programs.length} {tr("برنامجًا")}</span></div>
    {!programs.length && <div className="study-empty"><h3>{tr("ما لقينا برنامجًا بهذه الخيارات")}</h3><button onClick={()=>setParams({})}>{tr("عرض جميع تخصصات الجامعة")}</button></div>}
    <div className="study-results-grid">{programs.slice(0,shown).map(p=><ProgramCard key={p.id} program={p} returnTo={returnTo}/>)}</div>
    {programs.length>shown && <button className="discovery-load-more" onClick={()=>setParams(old=>{const next=new URLSearchParams(old);next.set('shown',String(shown+12));return next;},{replace:true})}>{tr("عرض تخصصات أكثر ↓")}</button>}
    <p className="discovery-data-note">{tr("الأسماء والرسوم والمدد من الدليل المرجعي؛ توفر البرنامج والحرم وشروط القبول تُراجع مع الجامعة.")}</p></section></div>
    <section className="university-next"><div><h2>{tr("عندك جامعة في بالك، والتخصص لسه؟")}</h2><p>{tr("اكتب لنا خطتك في طلب واحد، ونرتّب الخيارات معك.")}</p></div><Link className="student-button" to={applicationUrl({university:uni.name})}><WhatsAppIcon/>{tr("يلا ابدأ قبولك")}</Link></section>
  </main>;
}
