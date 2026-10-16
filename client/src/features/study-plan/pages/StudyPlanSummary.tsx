import { useCopy } from '../../../copy';
import { useNavigate } from 'react-router-dom';
import StudyPlanShell from '../layouts/StudyPlanShell';
import { useStudyPlan } from '../hooks/StudyPlanContext';
import { budgetOptions, englishOptions, labelFor, programOptions, qualificationOptions, startOptions } from '../data/options';
import StudyPlanIcon from '../components/StudyPlanIcon';

export default function StudyPlanSummary() {
  const { tr, language: copyLanguage } = useCopy();
  const { profile } = useStudyPlan();
  const navigate = useNavigate();
  const rows = [
    ['الشهادة', labelFor(qualificationOptions, profile.qualification)], ['المعدل', profile.grade === null ? '—' : `${profile.grade}%`],
    ['التخصص', labelFor(programOptions, profile.program)], ['اللغة', labelFor(englishOptions, profile.english.type)],
    ['الميزانية', labelFor(budgetOptions, profile.budget)], ['وقت البداية', labelFor(startOptions, profile.preferredStart)],
  ];
  return <StudyPlanShell compact><section className="sp-summary">
    <div className="sp-summary-icon"><StudyPlanIcon name="list" size={27}/></div><span className="sp-kicker">{tr("باقي خطوة بسيطة")}</span><h1>{tr("جاهزين نبني خطتك")}</h1><p>{tr("راجع بياناتك قبل ما نرتب لك الصورة.")}</p>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{tr(label)}</dt><dd>{tr(value)}</dd></div>)}</dl>
    <div className="sp-summary-actions"><button type="button" className="sp-button-ghost" onClick={() => navigate('/study-plan/questions')}>{tr("تعديل البيانات")}</button><button type="button" className="sp-button" onClick={() => navigate('/study-plan/result')}>{tr("اعرض خطتي")}<StudyPlanIcon name="arrow" /></button></div>
    <small>{tr("النتيجة تساعدك تفهم خياراتك، والقبول النهائي تحدده الجامعة.")}</small>
  </section></StudyPlanShell>;
}
