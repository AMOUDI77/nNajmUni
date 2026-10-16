import { useCopy } from '../copy';
import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences, type Language } from '../i18n';

const faqs = {
  "ar": [
    {
      "q": "هل معدلي يسمح لي بالدراسة؟",
      "a": "لا يمكن تحديد أهليتك من المعدل وحده. اختر برنامجًا وراجع المؤهل والمواد المطلوبة مع المستشار؛ شروطه تحتاج تأكيدًا من الجامعة."
    },
    {
      "q": "كم تكلفة الدراسة والمعيشة؟",
      "a": "اعرض الرسوم المسجلة في صفحة التخصص واستخدم حاسبة الميزانية لتقدير المعيشة والسكن. الأرقام تحتاج تأكيدًا، وقد توجد رسوم إضافية."
    },
    {
      "q": "متى أقدر أبدأ الدراسة؟",
      "a": "راجع الفترات المسجلة في صفحة التخصص، ثم أكد الدفعة المتاحة والمهلة اللازمة للإجراءات مع المستشار."
    },
    {
      "q": "هل أحتاج آيلتس؟",
      "a": "متطلب اللغة لهذا البرنامج يحتاج تأكيدًا من الجامعة. اطلب توضيح الاختبارات المقبولة وأي بدائل قبل التقديم."
    },
    {
      "q": "كيف أبدأ طلب القبول؟",
      "a": "اختر «يلا ابدأ قبولك» وأرسل اسمك ورقم تواصلك. هذه خطوة لطلب المساعدة؛ التقديم الرسمي وتجهيز المستندات يأتيان بعد مراجعة التفاصيل معك."
    }
  ],
  "en": [
    {
      "q": "Does my grade meet the requirements?",
      "a": "A grade alone cannot establish eligibility. Confirm the qualification and subject requirements for your program with an advisor."
    },
    {
      "q": "What will study and living cost?",
      "a": "Check the recorded tuition on the program page and use the budget calculator for planning. Confirm fees and additional costs before applying."
    },
    {
      "q": "When can I start?",
      "a": "Check the listed intake periods and confirm the next available intake and processing timeline with an advisor."
    },
    {
      "q": "Do I need IELTS?",
      "a": "Confirm your programme's language requirements and accepted tests or alternatives with the university through your advisor."
    },
    {
      "q": "How do I start?",
      "a": "Request application assistance with your name and contact number. This is an inquiry, not an official university application."
    }
  ]
};

export default function FAQAccordion() {
  const { tr, language: copyLanguage } = useCopy();
  const { t, language } = usePreferences();
  const [open, setOpen] = useState<number | null>(0);
  const list = faqs[language];

  return (
    <section style={{ padding: 'clamp(52px,8vw,80px) clamp(20px,4vw,40px)', maxWidth: 900, margin: '0 auto' }} id="faq">
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, color: C.purpleMid, letterSpacing: language === 'ar' ? 0 : 2, textTransform: language === 'ar' ? 'none' : 'uppercase', marginBottom: 16, background: C.purplePale, borderRadius: 20, padding: '6px 16px' }}>
          {tr(t('faq.badge'))}
        </div>
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
          {tr(t('faq.titleA'))} <span style={{ color: C.purpleMid }}>{tr(t('faq.titleB'))}</span>
        </h2>
        <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          {tr(t('faq.copy'))}
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
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4, paddingInlineEnd: 16 }}>{tr(item.q)}</span>
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
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8, borderTop: `1px solid ${C.border}`, paddingTop: 16, margin: 0 }}>{tr(item.a)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
