import type { StudyPlanUniversity } from '../types';
import StudyPlanIcon from './StudyPlanIcon';
import UniversityLogo from './UniversityLogo';

export default function StudyPlanUniversityCard({ university, onContact }: { university: StudyPlanUniversity; onContact: () => void }) {
  return <article className="sp-university-card">
    <div className="sp-university-head"><UniversityLogo universityId={university.universityId} name={university.universityName} logoUrl={university.universityLogo}/><div><h3>{university.universityName}</h3><p>{university.location ?? 'الموقع يحتاج تأكيد'}</p></div></div>
    <div className="sp-status sp-status-review"><StudyPlanIcon name="shield" size={15}/> ملاءمة أكاديمية تحتاج مراجعة</div>
    <h4 className="sp-program-name">{university.programName}</h4>
    <dl className="sp-details">
      <div><dt>الرسوم السنوية</dt><dd>{university.annualTuitionMYR ? `RM ${university.annualTuitionMYR.toLocaleString('en-MY')}` : 'تأكيد الرسوم مطلوب'}</dd></div>
      <div><dt>الـIntake المتوفر</dt><dd>{university.intake?.date || 'التواصل مع نجم للتأكيد'}</dd></div>
      <div><dt>اللغة</dt><dd>{university.englishRequirement || 'تختلف حسب شروط البرنامج'}</dd></div>
      <div><dt>المسار</dt><dd>{university.academicRoute}</dd></div>
    </dl>
    <div className="sp-why"><b>ليش هذا الخيار ظهر لك؟</b>{university.reasonMatched.map(reason=><p key={reason}><StudyPlanIcon name="check" size={15}/>{reason}</p>)}</div>
    <div className="sp-card-actions"><button type="button" className="sp-button-ghost sp-button-small" onClick={onContact}>راجع هذا الخيار مع نجم</button></div>
  </article>;
}
