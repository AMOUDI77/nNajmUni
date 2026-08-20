import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import StudyPlanShell from '../layouts/StudyPlanShell';
import { trackStudyPlanEvent } from '../utils/analytics';
import StudyPlanIcon from '../components/StudyPlanIcon';

const preview = [
  ['graduation', 'فرصك الدراسية', 'نفهم وضعك الأكاديمي ونرتب لك المسارات الأقرب لحالتك.'],
  ['calendar', 'وقت البداية', 'نعطيك صورة أوضح عن بيانات الـIntake المتوفرة لوضعك.'],
  ['list', 'الخطوات القادمة', 'تعرف وش تحتاج تسوي من الآن إلى بداية الدراسة.'],
];

export default function StudyPlanLanding() {
  useEffect(() => { trackStudyPlanEvent('study_plan_viewed'); }, []);
  return <StudyPlanShell>
    <section className="sp-landing-hero">
      <div className="sp-badge">خطة شخصية • نسخة تجريبية</div>
      <h1>اعرف طريقك للدراسة<br /><span>في ماليزيا</span></h1>
      <p>جاوب على كم سؤال بسيط، ونرتب لك خطة مبدئية حسب شهادتك، معدلك، تخصصك وميزانيتك.</p>
      <Link to="/study-plan/questions" className="sp-button sp-button-large" onClick={() => trackStudyPlanEvent('study_plan_started')}>ابدأ خطتي مجانًا <StudyPlanIcon name="arrow" /></Link>
      <div className="sp-trust">مجاني <i /> يستغرق دقائق</div>
    </section>
    <section className="sp-preview" aria-labelledby="preview-title">
      <div className="sp-section-heading"><span>وش راح تستلم؟</span><h2 id="preview-title">كل اللي تحتاجه في مكان واحد</h2></div>
      <div className="sp-preview-grid sp-preview-grid-three">{preview.map(([icon, title, copy]) => <article className="sp-preview-card" key={icon}><b><StudyPlanIcon name={icon} /></b><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p className="sp-demo-note">الخطة تساعدك ترتب الصورة، والقبول النهائي يعتمد على مراجعة شروط الجامعة.</p>
    </section>
  </StudyPlanShell>;
}
