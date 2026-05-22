import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences, type Language } from '../i18n';

type Field = {
  name: Record<Language, string>;
  tagline: Record<Language, string>;
  description: Record<Language, string>;
  courses: Record<Language, string[]>;
  icon: JSX.Element;
};

const FIELDS: Field[] = [
  {
    name: { en: 'Technology', ar: 'التقنية' },
    tagline: { en: 'Computer Science - AI - Cybersecurity', ar: 'علوم الحاسب - الذكاء الاصطناعي - الأمن السيبراني' },
    description: {
      en: 'Build the digital world. Malaysia is a growing tech hub with English-taught programmes and strong industry links.',
      ar: 'ابنِ مستقبلك في العالم الرقمي. ماليزيا مركز تقني متنامٍ ببرامج تُدرس بالإنجليزية وروابط قوية مع سوق العمل.',
    },
    courses: {
      en: ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Cybersecurity', 'Data Science'],
      ar: ['علوم الحاسب', 'هندسة البرمجيات', 'الذكاء الاصطناعي', 'الأمن السيبراني', 'علم البيانات'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>,
  },
  {
    name: { en: 'Engineering', ar: 'الهندسة' },
    tagline: { en: 'Mechanical - Civil - Electrical', ar: 'ميكانيكية - مدنية - كهربائية' },
    description: {
      en: 'Design infrastructure, machines, and systems. Malaysian engineering degrees are recognised across industry and government.',
      ar: 'صمّم البنية التحتية والأنظمة والآلات. شهادات الهندسة الماليزية معروفة في قطاعات الصناعة والحكومة.',
    },
    courses: {
      en: ['Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Chemical Engineering', 'Mechatronics'],
      ar: ['الهندسة الميكانيكية', 'الهندسة المدنية', 'الهندسة الكهربائية', 'الهندسة الكيميائية', 'الميكاترونكس'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
  {
    name: { en: 'Medicine & Health', ar: 'الطب والعلوم الصحية' },
    tagline: { en: 'MBBS - Dentistry - Pharmacy - Nursing', ar: 'طب - أسنان - صيدلة - تمريض' },
    description: {
      en: 'One of the most affordable places to study health sciences in Asia, with strong clinical training options.',
      ar: 'من أفضل الخيارات في آسيا لدراسة التخصصات الصحية بتكلفة مناسبة وفرص تدريب سريري قوية.',
    },
    courses: {
      en: ['MBBS', 'Dentistry', 'Pharmacy', 'Nursing', 'Physiotherapy'],
      ar: ['الطب البشري', 'طب الأسنان', 'الصيدلة', 'التمريض', 'العلاج الطبيعي'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  {
    name: { en: 'Business', ar: 'إدارة الأعمال' },
    tagline: { en: 'Management - Finance - Marketing', ar: 'إدارة - مالية - تسويق' },
    description: {
      en: 'Lead organisations and markets through programmes that combine theory with exposure to Asia’s growing economies.',
      ar: 'تعلّم قيادة المؤسسات والأسواق من خلال برامج تجمع بين المعرفة الأكاديمية وواقع اقتصادات آسيا المتنامية.',
    },
    courses: {
      en: ['Business Administration', 'Accounting & Finance', 'Marketing', 'International Business', 'Entrepreneurship'],
      ar: ['إدارة الأعمال', 'المحاسبة والمالية', 'التسويق', 'الأعمال الدولية', 'ريادة الأعمال'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    name: { en: 'Law', ar: 'القانون' },
    tagline: { en: 'LLB - Corporate - International Law', ar: 'قانون - شركات - قانون دولي' },
    description: {
      en: 'Study law in a system influenced by the English common law tradition and prepare for regional legal careers.',
      ar: 'ادرس القانون ضمن نظام متأثر بالتقاليد القانونية الإنجليزية واستعد لمسارات مهنية قانونية إقليمية.',
    },
    courses: {
      en: ['LLB', 'Corporate & Commercial Law', 'Islamic Finance Law', 'International Law'],
      ar: ['بكالوريوس القانون', 'قانون الشركات والتجارة', 'قانون التمويل الإسلامي', 'القانون الدولي'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><path d="M3 17l4 4 14-14"/></svg>,
  },
  {
    name: { en: 'Science', ar: 'العلوم' },
    tagline: { en: 'Biology - Biotech - Environmental', ar: 'أحياء - تقنية حيوية - بيئة' },
    description: {
      en: 'Research-driven programmes with modern labs and links in biotechnology, food science, and environmental research.',
      ar: 'برامج بحثية بمختبرات حديثة وروابط قوية في التقنية الحيوية وعلوم الغذاء والبيئة.',
    },
    courses: {
      en: ['Biology', 'Chemistry', 'Biotechnology', 'Environmental Science', 'Food Science'],
      ar: ['الأحياء', 'الكيمياء', 'التقنية الحيوية', 'علوم البيئة', 'علوم الغذاء'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4m-6 0h6"/></svg>,
  },
  {
    name: { en: 'Arts & Design', ar: 'الفنون والتصميم' },
    tagline: { en: 'Graphic Design - Architecture - Media', ar: 'تصميم جرافيك - عمارة - إعلام' },
    description: {
      en: 'Malaysia’s creative industry is growing, and design graduates are needed across digital and built environments.',
      ar: 'الصناعات الإبداعية في ماليزيا تنمو بسرعة، وخريجو التصميم مطلوبون في المجالات الرقمية والمعمارية.',
    },
    courses: {
      en: ['Graphic Design', 'Architecture', 'Interior Design', 'Animation', 'Fashion Design'],
      ar: ['التصميم الجرافيكي', 'العمارة', 'التصميم الداخلي', 'الرسوم المتحركة', 'تصميم الأزياء'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13.5V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6.5"/><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 7v6.5M22 7v6.5"/></svg>,
  },
  {
    name: { en: 'Hospitality', ar: 'الضيافة والسياحة' },
    tagline: { en: 'Hotel Management - Culinary - Tourism', ar: 'إدارة فنادق - فنون طهي - سياحة' },
    description: {
      en: 'With Kuala Lumpur among Asia’s top destinations, hospitality graduates can build careers across the region.',
      ar: 'مع مكانة كوالالمبور كوجهة آسيوية مهمة، يستطيع خريجو الضيافة بناء فرص مهنية واسعة.',
    },
    courses: {
      en: ['Hotel Management', 'Culinary Arts', 'Tourism Management', 'Event Management'],
      ar: ['إدارة الفنادق', 'فنون الطهي', 'إدارة السياحة', 'إدارة الفعاليات'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    name: { en: 'Social Science', ar: 'العلوم الاجتماعية' },
    tagline: { en: 'Psychology - Education - Communication', ar: 'علم نفس - تعليم - إعلام' },
    description: {
      en: 'Understand people, communities, and institutions, and prepare for careers in education, media, and NGOs.',
      ar: 'افهم الإنسان والمجتمع والمؤسسات، واستعد لمسارات في التعليم والإعلام والمنظمات.',
    },
    courses: {
      en: ['Psychology', 'Sociology', 'Education', 'Communication & Media', 'Political Science'],
      ar: ['علم النفس', 'علم الاجتماع', 'التربية', 'الإعلام والاتصال', 'العلوم السياسية'],
    },
    icon: <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

function FieldCard({ field, language }: { field: Field; language: Language }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1.5px solid ${hov ? C.blueDim : C.border}`,
        padding: '26px 24px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'all 0.2s ease',
        boxShadow: hov ? '0 8px 28px rgba(79,107,255,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 11,
        background: hov ? C.blue : C.bgSoft,
        color: hov ? '#fff' : C.textSub,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}>
        {field.icon}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', marginBottom: 3 }}>
          {field.name[language]}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
          {field.tagline[language]}
        </div>
      </div>

      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
        {field.description[language]}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {field.courses[language].map(course => (
          <span key={course} style={{
            fontSize: 11,
            fontWeight: 500,
            color: hov ? C.blue : C.textSub,
            background: hov ? C.bluePale : C.bgSoft,
            borderRadius: 6,
            padding: '3px 9px',
            transition: 'all 0.2s',
          }}>
            {course}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Programs() {
  const { language } = usePreferences();
  const isArabic = language === 'ar';

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <div style={{
        paddingTop: 120,
        paddingBottom: 64,
        paddingLeft: 'clamp(20px,5vw,48px)',
        paddingRight: 'clamp(20px,5vw,48px)',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.bluePale, border: `1px solid ${C.blueDim}`, borderRadius: 50, padding: '4px 14px', marginBottom: 22 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: isArabic ? 0 : 2, textTransform: isArabic ? 'none' : 'uppercase' }}>
            {isArabic ? 'مجالات الدراسة' : 'Fields of Study'}
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: C.text, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
          {isArabic ? 'ماذا تريد أن تدرس في ماليزيا؟' : <>What would you like<br />to study in Malaysia?</>}
        </h1>
        <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
          {isArabic
            ? 'استكشف برامج الجامعات الشريكة في أهم المجالات. مستشارونا يساعدونك في اختيار البرنامج والمؤسسة الأنسب.'
            : "Explore our partner universities' programmes across every major field. Our advisors will match you with the right course and institution."}
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(20px,5vw,48px) 80px' }}>
        <div className="prog-grid">
          {FIELDS.map(field => <FieldCard key={field.name.en} field={field} language={language} />)}
        </div>
      </div>

      <div style={{ background: C.text, padding: 'clamp(48px,6vw,72px) clamp(20px,5vw,48px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>
            {isArabic ? 'غير متأكد من المجال المناسب؟' : 'Not sure which field suits you?'}
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28 }}>
            {isArabic
              ? 'احجز جلسة مجانية. سنراجع خلفيتك وأهدافك ونقترح البرنامج الأنسب لك.'
              : 'Book a free 1-on-1 session. Our advisors will assess your background and goals and recommend the right programme.'}
          </p>
          <a href="/#booking-section"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 28px',
              borderRadius: 12,
              background: C.blue,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.2px',
            }}>
            {isArabic ? 'احجز استشارة مجانية' : 'Book Free Consultation'}
          </a>
        </div>
      </div>

      <style>{`
        .prog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 960px) { .prog-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .prog-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
