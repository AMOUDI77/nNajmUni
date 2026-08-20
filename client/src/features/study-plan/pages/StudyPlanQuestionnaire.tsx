import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudyPlanShell from '../layouts/StudyPlanShell';
import { useStudyPlan } from '../hooks/StudyPlanContext';
import { budgetOptions, englishOptions, preferenceOptions, programOptions, qualificationOptions, startOptions } from '../data/options';
import { trackStudyPlanEvent } from '../utils/analytics';
import StudyPlanIcon from '../components/StudyPlanIcon';

const steps = [
  { title: 'اختر التخصص المطلوب', hint: 'اختر المجال الأقرب للتخصص الذي تريد دراسته، ويمكنك تعديله لاحقًا.', field: 'program', options: programOptions },
  { title: 'وش شهادتك الحالية؟', hint: 'اختر نوع الشهادة التي حصلت عليها أو تدرسها حاليًا.', field: 'qualification', options: qualificationOptions },
  { title: 'كم معدلك؟', hint: 'مو لازم يكون معدلك عالي جدًا — الخيارات تختلف حسب الجامعة والتخصص.', field: 'grade', options: [] },
  { title: 'كيف وضعك مع الإنجليزي؟', hint: 'اختر الوصف الأقرب لوضعك الحالي.', field: 'english', options: englishOptions },
  { title: 'كم ميزانيتك تقريبًا بالسنة؟', hint: 'بالرينجت الماليزي، وتشمل الرسوم الدراسية بشكل مبدئي.', field: 'budget', options: budgetOptions },
  { title: 'متى ودك تبدأ؟', hint: 'هذه خيارات مؤقتة إلى أن ترتبط الخطة بمواعيد القبول.', field: 'preferredStart', options: startOptions },
  { title: 'وش يهمك أكثر؟', hint: 'اختر إلى 3 أشياء عشان نرتب خطتك حول أولوياتك.', field: 'preferences', options: preferenceOptions },
] as const;

export default function StudyPlanQuestionnaire() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const { profile, updateProfile } = useStudyPlan();
  const navigate = useNavigate();
  const current = steps[step];
  const value = current.field === 'english' ? profile.english.type : profile[current.field as keyof typeof profile];
  const valid = current.field === 'grade' ? profile.grade !== null && profile.grade >= 0 && profile.grade <= 100 : current.field === 'preferences' ? profile.preferences.length > 0 : Boolean(value);

  const choose = (id: string) => {
    setError('');
    if (current.field === 'english') updateProfile({ english: { type: id } });
    else if (current.field === 'preferences') {
      const selected = profile.preferences.includes(id);
      if (!selected && profile.preferences.length === 3) { setError('تقدر تختار 3 أولويات كحد أقصى.'); return; }
      updateProfile({ preferences: selected ? profile.preferences.filter(item => item !== id) : [...profile.preferences, id] });
    } else updateProfile({ [current.field]: id });
  };

  const next = () => {
    if (!valid) { setError('اختر إجابة عشان نكمل خطتك.'); return; }
    trackStudyPlanEvent('study_plan_step_completed', { step: step + 1, field: current.field });
    if (step === steps.length - 1) { trackStudyPlanEvent('study_plan_completed'); navigate('/study-plan/summary'); }
    else { setStep(step + 1); setError(''); }
  };

  return <StudyPlanShell compact>
    <section className="sp-wizard" aria-live="polite">
      <div className="sp-progress-meta"><button type="button" onClick={() => step ? setStep(step - 1) : navigate('/study-plan')} aria-label="رجوع"><StudyPlanIcon name="arrow" /></button><span>الخطوة {step + 1} من {steps.length}</span></div>
      <div className="sp-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <div className="sp-question" key={step}>
        <span className="sp-kicker">خطتك الشخصية</span><h1>{current.title}</h1><p>{current.hint}</p>
        {current.field === 'grade' ? <label className="sp-grade-label"><span>المعدل بالنسبة المئوية</span><div><input autoFocus type="number" inputMode="decimal" min="0" max="100" value={profile.grade ?? ''} onChange={e => updateProfile({ grade: e.target.value === '' ? null : Number(e.target.value) })} aria-describedby="grade-help" /><b>%</b></div><small id="grade-help">مثال: 76%</small></label> :
          <div className="sp-options">{current.options.map(([id, label]) => { const selected = current.field === 'preferences' ? profile.preferences.includes(id) : value === id; return <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected} key={id} onClick={() => choose(id)}><span>{label}</span><i>{selected && <StudyPlanIcon name="check" size={14}/>}</i></button>; })}</div>}
        {current.field === 'english' && profile.english.type === 'ielts' && <label className="sp-inline-input"><span>درجة IELTS (اختياري)</span><input type="number" step="0.5" min="0" max="9" value={profile.english.score ?? ''} onChange={e => updateProfile({ english: { ...profile.english, score: e.target.value ? Number(e.target.value) : undefined } })} /></label>}
        {error && <p className="sp-error-text" role="alert">{error}</p>}
        <button type="button" className="sp-button sp-next" onClick={next}>{step === steps.length - 1 ? 'راجع بياناتي' : 'التالي'} <StudyPlanIcon name="arrow" /></button>
      </div>
    </section>
  </StudyPlanShell>;
}
