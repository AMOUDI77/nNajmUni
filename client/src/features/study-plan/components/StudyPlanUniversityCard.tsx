import { useCopy } from '../../../copy';
import type { StudyPlanUniversity } from '../types';
import StudyPlanIcon from './StudyPlanIcon';
import UniversityLogo from './UniversityLogo';

export default function StudyPlanUniversityCard({ university, onContact }: { university: StudyPlanUniversity; onContact: () => void }) {
  const { tr, language: copyLanguage } = useCopy();
  return <article className="sp-university-card">
    <div className="sp-university-head"><UniversityLogo universityId={university.universityId} name={university.universityName} logoUrl={university.universityLogo}/><div><h3>{tr(university.universityName)}</h3><p>{tr(university.location ?? 'الموقع يحتاج تأكيد')}</p></div></div>
    <div className="sp-status sp-status-review"><StudyPlanIcon name="shield" size={15}/> {tr("ملاءمة أكاديمية تحتاج مراجعة")}</div>
    <h4 className="sp-program-name">{tr(university.programName)}</h4>
    <dl className="sp-details">
      <div><dt>{tr("الرسوم السنوية")}</dt><dd>{tr(university.annualTuitionMYR ? `RM ${university.annualTuitionMYR.toLocaleString('en-MY')}` : 'تأكيد الرسوم مطلوب')}</dd></div>
      <div><dt>{tr("الـIntake المتوفر")}</dt><dd>{tr(university.intake?.date || 'التواصل مع نجم للتأكيد')}</dd></div>
      <div><dt>{tr("اللغة")}</dt><dd>{tr(university.englishRequirement || 'تختلف حسب شروط البرنامج')}</dd></div>
      <div><dt>{tr("المسار")}</dt><dd>{tr(university.academicRoute)}</dd></div>
    </dl>
    <div className="sp-why"><b>{tr("ليش هذا الخيار ظهر لك؟")}</b>{university.reasonMatched.map(reason=><p key={reason}><StudyPlanIcon name="check" size={15}/>{tr(reason)}</p>)}</div>
    <div className="sp-card-actions"><button type="button" className="sp-button-ghost sp-button-small" onClick={onContact}>{tr("راجع هذا الخيار مع نجم")}</button></div>
  </article>;
}
