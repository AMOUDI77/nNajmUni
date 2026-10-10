import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences, type Language } from '../i18n';

const faqs: Record<Language, { q: string; a: string }[]> = {
  en: [
    {
      q: 'How much does it cost to study in Malaysia?',
      a: 'Tuition fees range from RM 8,000-55,000/year depending on the university type and programme. Living costs average RM 1,200-2,500/month.',
    },
    {
      q: 'What are the academic requirements for international students?',
      a: 'Most bachelor programmes require completion of secondary school or an equivalent qualification. English requirements vary by institution and programme.',
    },
    {
      q: 'How long does the application process take?',
      a: 'From consultation to offer letter usually takes 2-6 weeks. The student visa can take another 4-8 weeks after documents are submitted.',
    },
    {
      q: 'Can international students work while studying in Malaysia?',
      a: 'Yes. International students on a valid Student Pass can work part-time under Malaysian immigration rules and approved conditions.',
    },
    {
      q: 'Is English used as the medium of instruction?',
      a: 'Yes. Most private universities and many public university programmes are taught in English, but the language should be confirmed for each programme.',
    },
    {
      q: 'Are Malaysian degrees recognised internationally?',
      a: 'Many MQA-accredited Malaysian degrees are recognised across Asia, the Middle East, and beyond. Foreign branch campuses award degrees linked to their home university.',
    },
    {
      q: 'How long does it take to get a student visa?',
      a: 'The Malaysian Student Pass is processed through the university and immigration authorities. It typically takes 4-8 weeks.',
    },
  ],
  ar: [
    {
      q: 'كم تكلفة الدراسة في ماليزيا؟',
      a: 'تتراوح الرسوم غالبًا بين 8,000 و55,000 رنجت ماليزي سنويًا حسب نوع الجامعة والبرنامج. وتكون تكاليف المعيشة عادة بين 1,200 و2,500 رنجت شهريًا.',
    },
    {
      q: 'ما شروط القبول للطلاب الدوليين؟',
      a: 'تحتاج أغلب برامج البكالوريوس إلى إتمام المرحلة الثانوية أو ما يعادلها. متطلبات اللغة الإنجليزية تختلف حسب الجامعة والبرنامج.',
    },
    {
      q: 'كم يستغرق التقديم؟',
      a: 'عادة يستغرق الحصول على خطاب القبول من أسبوعين إلى ستة أسابيع، ثم قد تستغرق الفيزا من أربعة إلى ثمانية أسابيع بعد تقديم المستندات.',
    },
    {
      q: 'هل يستطيع الطالب الدولي العمل أثناء الدراسة؟',
      a: 'نعم، يمكن للطلاب الدوليين العمل بدوام جزئي ضمن شروط فيزا الطالب والقطاعات المسموحة في ماليزيا.',
    },
    {
      q: 'هل الدراسة باللغة الإنجليزية؟',
      a: 'نعم، أغلب الجامعات الخاصة وكثير من البرامج في الجامعات الحكومية تُدرس باللغة الإنجليزية، لكن يجب التأكد من لغة كل برنامج قبل التقديم.',
    },
    {
      q: 'هل الشهادات الماليزية معترف بها دوليًا؟',
      a: 'نعم، كثير من الشهادات الماليزية المعتمدة من MQA معترف بها في آسيا والشرق الأوسط ودول أخرى، كما أن فروع الجامعات الأجنبية تمنح شهادة مرتبطة بالجامعة الأم.',
    },
    {
      q: 'كم تستغرق فيزا الطالب؟',
      a: 'تُعالج فيزا الطالب عبر الجامعة والجهات المختصة في ماليزيا، وغالبًا تستغرق من أربعة إلى ثمانية أسابيع.',
    },
  ],
};

export default function FAQAccordion() {
  const { t, language } = usePreferences();
  const [open, setOpen] = useState<number | null>(0);
  const list = faqs[language];

  return (
    <section style={{ padding: 'clamp(52px,8vw,80px) clamp(20px,4vw,40px)', maxWidth: 900, margin: '0 auto' }} id="faq">
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, color: C.purpleMid, letterSpacing: language === 'ar' ? 0 : 2, textTransform: language === 'ar' ? 'none' : 'uppercase', marginBottom: 16, background: C.purplePale, borderRadius: 20, padding: '6px 16px' }}>
          {t('faq.badge')}
        </div>
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
          {t('faq.titleA')} <span style={{ color: C.purpleMid }}>{t('faq.titleB')}</span>
        </h2>
        <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          {t('faq.copy')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="faq-item" style={{
              background: '#fff',
              borderRadius: 16,
              border: isOpen ? `1px solid ${C.purpleMid}` : `1px solid ${C.border}`,
              overflow: 'hidden',
              transition: 'border 0.2s',
              boxShadow: isOpen ? `0 8px 24px ${C.purpleMid}18` : 'none',
            }}>
              <button className="faq-btn" onClick={() => setOpen(isOpen ? null : i)} style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: language === 'ar' ? 'right' : 'left',
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4, paddingInlineEnd: 16 }}>{item.q}</span>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isOpen ? C.purpleMid : C.purplePale,
                  color: isOpen ? '#fff' : C.purpleMid,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  transform: isOpen ? 'rotate(45deg)' : 'none',
                }}>+</div>
              </button>
              {isOpen && (
                <div style={{ padding: '0 24px 24px' }}>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8, borderTop: `1px solid ${C.border}`, paddingTop: 16, margin: 0 }}>{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
