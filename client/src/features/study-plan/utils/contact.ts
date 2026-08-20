import type { StudyPlanContactContext, StudyPlanProfile } from '../types';
import { budgetOptions, labelFor, programOptions, qualificationOptions, startOptions } from '../data/options';
import { trackStudyPlanEvent } from './analytics';

const WHATSAPP_NUMBER = '601137327607';
export function openStudyPlanWhatsApp(profile: StudyPlanProfile, context: StudyPlanContactContext) {
  const introductions: Record<string, string> = {
    review_study_plan: 'السلام عليكم، سويت خطتي الدراسية في NajmUni وأبي أراجع الخيارات اللي ظهرت لي مع نجم.',
    request_free_guide: 'السلام عليكم، سويت Study Plan في NajmUni وأبي ملف التجهيز للدراسة في ماليزيا.',
    verify_university: 'السلام عليكم، ظهر لي هذا الخيار في Study Plan وأبي أتأكد من تفاصيل القبول.',
    verify_intake: 'السلام عليكم، سويت Study Plan وأبي أتأكد من أقرب Intake مناسب لي.',
    review_english_options: 'السلام عليكم، سويت Study Plan وأبي أراجع خيارات اللغة المناسبة لي.',
  };
  const message = [introductions[context.intent] ?? 'السلام عليكم، سويت Study Plan في NajmUni وأبي أراجع خطتي مع نجم.', '',
    `الشهادة: ${labelFor(qualificationOptions, profile.qualification)}`, `المعدل: ${profile.grade ?? 'غير محدد'}%`,
    `التخصص: ${labelFor(programOptions, profile.program)}`, `الميزانية: ${labelFor(budgetOptions, profile.budget)}`,
    `البداية: ${labelFor(startOptions, profile.preferredStart)}`, context.universityId ? `رقم خيار الجامعة: ${context.universityId}` : '',
    ].filter(Boolean).join('\n');
  trackStudyPlanEvent('study_plan_whatsapp_opened', context);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}
