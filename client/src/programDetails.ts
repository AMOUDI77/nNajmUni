import type { Program } from './types';
import { PROGRAMS } from './data';

type CurriculumPreview = {
  universityId: number;
  summary: string;
  subjects: readonly [string, string, string, string];
  checkedAt: string;
  aliases?: string[];
};
const mmu = { universityId: 9, checkedAt: '2026-10-16' };

// Exact catalogue IDs: never infer a university's curriculum from its field or title.
// Arabic subject names below are concise translations of core modules; provenance is in docs/program-curriculum-sources-2026-10-16.json.
export const curriculumPreviews: Record<number, CurriculumPreview> = {
  243484946: {
    universityId: 10, checkedAt: '2026-10-16',
    aliases: ['Bachelor of Software Engineering'],
    summary: 'تتعلّم كيف تصمّم البرامج وتطوّرها وتختبرها، مع التركيز على بناء أنظمة قابلة للصيانة والتطوير.',
    subjects: ['البرمجة بلغة بايثون', 'هندسة المتطلبات', 'اختبار البرمجيات', 'معمارية البرمجيات'],
  },
  147510776: { ...mmu, summary: 'تتعلّم كيف تحوّل احتياج المستخدم إلى برنامج: من التصميم والبرمجة إلى الاختبار وضمان الجودة.', subjects: ['أساسيات البرمجة', 'هندسة متطلبات البرمجيات', 'تصميم البرمجيات', 'التحقق من البرمجيات واختبارها'] },
  211695496: { ...mmu, summary: 'يجمع المسار بين البرمجة وتصميم الألعاب، مع تطبيقات على الرسوم والألعاب ثلاثية الأبعاد.', subjects: ['أساسيات البرمجة', 'أساسيات تصميم الألعاب', 'أساسيات رسوم الحاسب', 'برمجة الألعاب ثلاثية الأبعاد'] },
  254583889: { ...mmu, summary: 'تتعلّم كيف تحلّل البيانات وتحوّلها إلى معلومات مفهومة تساعد في اتخاذ القرار.', subjects: ['أساسيات قواعد البيانات', 'أساسيات علم البيانات', 'التحليل الإحصائي للبيانات', 'عرض البيانات بصريًا'] },
  257929589: { ...mmu, summary: 'يركّز المسار على حماية البيانات والشبكات وفهم طرق اكتشاف الثغرات الأمنية.', subjects: ['أساسيات الأمن السيبراني', 'أمن الشبكات', 'التشفير وأمن البيانات', 'الاختراق الأخلاقي واختبار الاختراق'] },
  246062654: {
    ...mmu,
    summary: 'تتعرّف على البرمجة وقواعد البيانات والشبكات، وكيف تدير أنظمة الحاسب وتدعم مستخدميها.',
    subjects: ['تصميم البرامج', 'أنظمة قواعد البيانات', 'اتصالات البيانات والشبكات', 'أنظمة التشغيل'],
  },
  158060009: {
    universityId: 10,
    checkedAt: '2026-10-16',
    summary: 'تتعلّم بناء أنظمة ذكية تحلّل النصوص والصور، وتطبّق أساليب الذكاء الاصطناعي والتعلّم العميق.',
    subjects: ['البرمجة بلغة بايثون', 'أساليب الذكاء الاصطناعي', 'تحليل النصوص والمشاعر', 'التحسين والتعلّم العميق'],
  },
};

export function curriculumFor(program: Program) {
  const name = program.name.trim().toLowerCase();
  for (const [id, preview] of Object.entries(curriculumPreviews)) {
    const canonical = PROGRAMS.find(p => p.id === Number(id));
    if (canonical && preview.universityId === program.university_id && canonical.level === program.level
      && [canonical.name, ...(preview.aliases || [])].some(title => title.trim().toLowerCase() === name)) return preview;
  }
  return undefined;
}
