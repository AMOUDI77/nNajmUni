import { Link } from 'react-router-dom';
import type { Program, University } from '../types';
import InstitutionIdentity from './InstitutionIdentity';
import { studyDuration } from '../catalogPresentation';
import { levels } from '../discovery';
import { studyFields, subjectGuide } from '../studyFields';

export function ProgramCard({ program, university, returnTo }: { program: Program; university?: University; returnTo: string }) {
  const subject = subjectGuide(program);
  const field = studyFields.find(f => f.key === program.field);
  return <article className="study-program-card" style={{ '--field-color': field?.color || '#6256db' } as React.CSSProperties}>
    <div className="study-card-top"><span className="study-level">{levels[program.level]}</span><span className="study-field-label">{field?.title || program.field}</span></div>
    {university && <InstitutionIdentity {...university} />}
    <h3>{subject.title}</h3><p className="study-original-name" dir="auto">{program.name}</p>
    <p className="study-card-description">{subject.about}</p>
    <dl className="study-card-facts"><div><dt>مدة الدراسة</dt><dd>{studyDuration(program.duration_years)}</dd></div><div><dt>رسوم سنوية تقديرية</dt><dd>{program.tuition_per_year && program.tuition_per_year > 0 ? <bdi>{program.tuition_per_year.toLocaleString()} <small>MYR</small></bdi> : 'تُحدّد عند المراجعة'}</dd></div></dl>
    <Link className="study-card-link" to={`/programs/${program.id}?${new URLSearchParams({ return: returnTo })}`}>اكتشف التخصص <span aria-hidden="true">←</span></Link>
  </article>;
}

export function UniversityCard({ university, programs }: { university: University; programs: Program[] }) {
  const fields = studyFields.filter(f => programs.some(p => p.field === f.key));
  const fees = programs.map(p => p.tuition_per_year).filter((n): n is number => !!n && n > 0);
  return <article className="study-university-card">
    <div className="study-university-cover" style={{ '--uni-color': university.color || '#4f6bff' } as React.CSSProperties}><span>{university.abbr}</span><small>{university.abbr === 'UTMSPACE' ? 'مسار تابع لـ UTM' : university.type === 'public' ? 'جامعة حكومية' : university.type === 'foreign_branch' ? 'فرع جامعة دولية' : 'جامعة خاصة'}</small></div>
    <div className="study-university-body"><InstitutionIdentity {...university} />
      <div className="study-field-tags">{fields.slice(0, 3).map(f => <span key={f.key}>{f.title}</span>)}{fields.length > 3 && <span>+{fields.length - 3} مجالات</span>}</div>
      <dl className="study-card-facts"><div><dt>برامج في الدليل</dt><dd>{programs.length} برنامجًا</dd></div><div><dt>الرسوم السنوية تبدأ من</dt><dd>{fees.length ? <bdi>{Math.min(...fees).toLocaleString()} <small>MYR</small></bdi> : 'تُحدّد عند المراجعة'}</dd></div></dl>
      <Link className="study-card-link" to={`/universities/${university.id}`}>اكتشف الجامعة والتخصصات <span aria-hidden="true">←</span></Link>
    </div>
  </article>;
}
