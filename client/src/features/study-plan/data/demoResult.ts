import type { StudyPlanResult } from '../types';

// DEMO FLOW DATA ONLY. No university facts, prices, admissions claims, or dates live here.
// Replace readiness and action-plan copy with the Study Plan API when the eligibility engine exists.
export const demoFlowResult: Omit<StudyPlanResult, 'studyPaths' | 'recommendedIntake'> = {
  readiness: {
    status: 'review-required', title: 'صورة مبدئية مكتملة',
    note: 'رتبنا مؤشرات ملفك الحالية، وتبقى مراجعة شروط البرامج المناسبة مع نجم.',
    breakdown: [
      { label: 'الوضع الأكاديمي', value: 'يحتاج مراجعة', tone: 'neutral', icon: 'graduation' },
      { label: 'اللغة', value: 'حسب بياناتك', tone: 'attention', icon: 'language' },
      { label: 'الميزانية', value: 'تقدير مبدئي', tone: 'neutral', icon: 'wallet' },
      { label: 'التوقيت', value: 'يحتاج تأكيد', tone: 'attention', icon: 'calendar' },
    ],
  },
  budget: [
    { label: 'الرسوم الدراسية', note: 'تُعرض من سجل البرنامج عند توفره.', status: 'needs-verification' },
    { label: 'التأشيرة والإجراءات', note: 'تحتاج تأكيد من مصدر رسمي.', status: 'unavailable' },
    { label: 'السكن', note: 'يعتمد على المدينة ونوع السكن.', status: 'unavailable' },
    { label: 'المصروف الشخصي', note: 'يعتمد على نمط المعيشة.', status: 'unavailable' },
  ],
  actionPlan: [
    { when: 'الخطوة 1', action: 'راجع أفضل الخيارات الظاهرة في خطتك.', icon: 'university' },
    { when: 'الخطوة 2', action: 'جهز جواز السفر والشهادة وكشف الدرجات.', icon: 'file' },
    { when: 'الخطوة 3', action: 'أكد متطلبات القبول واللغة من الجامعة.', icon: 'check' },
    { when: 'الخطوة 4', action: 'اختر الجامعة الأنسب لملفك وميزانيتك.', icon: 'graduation' },
    { when: 'الخطوة 5', action: 'ابدأ تجهيز طلب القبول.', icon: 'list' },
    { when: 'الخطوة 6', action: 'بعد القبول، ابدأ إجراءات Student Pass.', icon: 'shield' },
  ],
};
