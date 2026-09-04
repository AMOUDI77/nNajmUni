import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Apply.css';

const initial = {
  name: '', phone: '', nationality: '', study_level: '', specialization: '',
  qualification: '', grade: '', english_level: '', preferred_start: '',
  passport_ready: '', financial_readiness: '', preferred_university: '',
};

export default function Apply() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    ...initial,
    phone: params.get('phone') || '',
    specialization: params.get('specialization') || '',
    preferred_start: params.get('preferred_start') || '',
  });
  const [state, setState] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const source = useMemo(() => params.get('source') || 'contact_form', [params]);
  const set = (key: keyof typeof form) => (value: string) => setForm(old => ({ ...old, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    window.location.assign('https://www.instagram.com/najm.uni/');
  }

  if (state === 'done') return <main className="apply-page" dir="rtl"><section className="apply-success">
    <span>✓</span><h1>تواصل معنا على إنستغرام</h1>
    <p>أرسل لنا رسالتك مباشرة عبر حساب نجم على إنستغرام.</p>
    <a className="apply-primary" href="https://www.instagram.com/najm.uni/">فتح إنستغرام</a>
  </section></main>;

  return <main className="apply-page" dir="rtl">
    <section className="apply-intro"><span>طلب تواصل من مستشار</span><h1>خلّنا نعرف حالتك أولًا</h1><p>جاوب على الأسئلة المختصرة عشان نرتب الطلبات ونتواصل مع الطلاب الأقرب للبدء.</p></section>
    <form className="apply-form" onSubmit={submit}>
      <div className="apply-grid">
        <Field label="الاسم الكامل"><input required value={form.name} onChange={e=>set('name')(e.target.value)} /></Field>
        <Field label="رقم الواتساب مع مفتاح الدولة"><input required type="tel" inputMode="tel" placeholder="+966..." value={form.phone} onChange={e=>set('phone')(e.target.value)} /></Field>
        <Field label="الجنسية"><input required value={form.nationality} onChange={e=>set('nationality')(e.target.value)} /></Field>
        <Field label="المرحلة المطلوبة"><Select required value={form.study_level} onChange={set('study_level')} options={['لغة','بكالوريوس','ماجستير','دكتوراه']} /></Field>
        <Field label="التخصص المطلوب"><input required value={form.specialization} onChange={e=>set('specialization')(e.target.value)} /></Field>
        <Field label="آخر مؤهل"><Select required value={form.qualification} onChange={set('qualification')} options={['ثانوية','دبلوم','بكالوريوس','ماجستير']} /></Field>
        <Field label="المعدل (اختياري)"><input value={form.grade} onChange={e=>set('grade')(e.target.value)} placeholder="مثال: 85%" /></Field>
        <Field label="مستوى اللغة الإنجليزية"><Select required value={form.english_level} onChange={set('english_level')} options={['لدي شهادة لغة','جيد بدون شهادة','متوسط','مبتدئ']} /></Field>
        <Field label="متى تريد أن تبدأ الدراسة؟"><Select required value={form.preferred_start} onChange={set('preferred_start')} options={['في أقرب وقت ممكن','خلال 3–6 أشهر','خلال 6–12 شهرًا','غير محدد']} /></Field>
        <Field label="هل جواز السفر جاهز؟"><Select required value={form.passport_ready} onChange={set('passport_ready')} options={['نعم','قيد التجهيز','لا']} /></Field>
        <Field label="هل لديك جامعة معينة؟"><input value={form.preferred_university} onChange={e=>set('preferred_university')(e.target.value)} placeholder="اكتب اسم الجامعة، أو اتركه فارغًا" /></Field>
      </div>
      <Field label="مدى جاهزيتك لبدء الإجراءات"><div className="apply-radio-group">{['جاهز ماليًا لبدء الإجراءات','أحتاج معرفة التكاليف أولًا'].map(option=><label key={option}><input required type="radio" name="financial" checked={form.financial_readiness===option} onChange={()=>set('financial_readiness')(option)} /><span>{option}</span></label>)}</div></Field>
      {state === 'error' && <p className="apply-error">تعذّر إرسال الطلب. تأكد من رقم الجوال وحاول مرة أخرى.</p>}
      <button className="apply-primary" disabled={state==='loading'}>{state==='loading'?'جاري الإرسال…':'أرسل طلب التواصل'}</button>
      <small className="apply-note">لن يظهر رقم فريقنا مباشرة. نراجع الطلب أولًا ثم نتواصل مع الحالات المناسبة.</small>
    </form>
  </main>;
}

function Field({ label, children }: { label:string; children:React.ReactNode }) { return <label className="apply-field"><span>{label}</span>{children}</label>; }
function Select({ value, onChange, options, required=false }: { value:string; onChange:(value:string)=>void; options:string[]; required?:boolean }) { return <select required={required} value={value} onChange={e=>onChange(e.target.value)}><option value="">اختر</option>{options.map(x=><option key={x}>{x}</option>)}</select>; }
