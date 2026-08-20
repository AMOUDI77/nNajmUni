import { api } from '../../../api';
import type { Program, University } from '../../../types';
import { demoFlowResult } from '../data/demoResult';
import type { StudyPlanProfile, StudyPlanResult, StudyPlanUniversity } from '../types';
import { getUniversityLogo } from '../components/UniversityLogo';

const categoryFields: Record<string, string[]> = {
  'computer-science': ['Technology'], cybersecurity: ['Technology'], 'software-engineering': ['Technology'],
  'artificial-intelligence': ['Technology'], business: ['Business'], engineering: ['Engineering'],
  'accounting-finance': ['Business'], medicine: ['Medicine'], science: ['Science'], law: ['Law'],
  design: ['Arts & Design'], undecided: [],
};

export function mapUniversityToStudyPlanCard(university: University, program: Program): StudyPlanUniversity {
  return {
    universityId: String(university.id), programId: String(program.id), universityName: university.name,
    universityLogo: getUniversityLogo(String(university.id), university.domain), programName: program.name,
    academicRoute: program.level === 'foundation' ? 'Foundation' : program.level === 'bachelor' ? 'Bachelor مباشر' : program.level,
    eligibilityStatus: 'review-required', annualTuitionMYR: program.tuition_per_year || undefined,
    intake: { date: program.intake || undefined, timingStatus: 'needs-verification' },
    englishRequirement: undefined, location: university.location,
    reasonMatched: ['يقدم مجالًا قريبًا من اختيارك', 'لديه برنامج ومسار دراسي مرتبط باختيارك'],
    source: { sourceName: 'قاعدة بيانات NajmUni', sourceUrl: university.website, verificationStatus: 'needs-verification' },
  };
}

export async function getStudyPlanUniversities(profile: StudyPlanProfile): Promise<StudyPlanUniversity[]> {
  const [universitiesResponse, programsResponse] = await Promise.all([api.universities.list(), api.programs.list()]);
  const fields = categoryFields[profile.program] ?? [];
  const candidates = programsResponse.data.filter(program => program.level === 'bachelor' && (!fields.length || fields.includes(program.field)));
  const universities = new Map(universitiesResponse.data.map(university => [university.id, university]));
  return candidates.map(program => universities.get(program.university_id) && mapUniversityToStudyPlanCard(universities.get(program.university_id)!, program)).filter((item): item is StudyPlanUniversity => Boolean(item)).slice(0, 6);
}

export async function getStudyPlanPrograms() { return (await api.programs.list()).data; }

export async function getStudyPlanResult(profile: StudyPlanProfile): Promise<StudyPlanResult> {
  const universities = await getStudyPlanUniversities(profile);
  const tuitionValues = universities.flatMap(item => item.annualTuitionMYR ? [item.annualTuitionMYR] : []);
  const tuitionMin = tuitionValues.length ? Math.min(...tuitionValues) : 18000;
  const tuitionMax = tuitionValues.length ? Math.max(...tuitionValues) : 35000;
  const intakeByPreference: Record<string, { title: string; date: string }> = {
    nearest: { title: 'أقرب بداية مناسبة', date: '1 فبراير 2027' },
    'late-2026': { title: 'بداية نهاية 2026', date: '1 أكتوبر 2026' },
    'early-2027': { title: 'بداية 2027', date: '1 فبراير 2027' },
    flexible: { title: 'موعد مرن مقترح', date: '1 سبتمبر 2027' },
  };
  const intake = intakeByPreference[profile.preferredStart] ?? intakeByPreference.nearest;
  const englishReady = profile.english.type === 'english-medium' || (profile.english.type === 'ielts' && (profile.english.score ?? 0) >= 6);
  const academicValue = profile.grade === null ? 'المعدل غير مكتمل' : profile.grade >= 80 ? 'جيد جدًا للبدء' : profile.grade >= 65 ? 'مناسب مبدئيًا' : 'قد يحتاج مسارًا تأسيسيًا';
  const englishValue = englishReady ? 'جاهز مبدئيًا' : profile.english.type === 'ielts' ? 'قد يحتاج رفع الدرجة' : 'يحتاج تجهيز اللغة';
  const yearlyMin = tuitionMin + 9600 + 12000 + 3000;
  const yearlyMax = tuitionMax + 18000 + 18000 + 5000;
  const budgetLimits: Record<string, number | undefined> = { 'under-25': 25000, '25-35': 35000, '35-45': 45000, '45-60': 60000, 'over-60': 75000, unsure: undefined };
  const enteredBudget = budgetLimits[profile.budget];
  const budgetStatus = enteredBudget === undefined ? 'unknown' : enteredBudget >= yearlyMin ? 'within' : 'tight';
  const budgetValue = budgetStatus === 'within' ? 'ضمن النطاق المتوقع' : budgetStatus === 'tight' ? 'تحتاج زيادة أو خيارًا أوفر' : 'حدد ميزانيتك للمقارنة';
  const readinessPoints = (profile.grade !== null && profile.grade >= 65 ? 1 : 0) + (englishReady ? 1 : 0) + (budgetStatus === 'within' ? 1 : 0);
  return {
    ...demoFlowResult,
    readiness: {
      status: 'review-required',
      title: readinessPoints >= 3 ? 'جاهز للانتقال إلى مراجعة الخيارات' : readinessPoints >= 2 ? 'جاهز مبدئيًا مع نقاط تحتاج تجهيز' : 'تحتاج تجهيز بعض المتطلبات أولًا',
      note: `بناءً على معدلك (${profile.grade ?? 'غير محدد'}%)، وضع اللغة، ميزانيتك وموعد البداية اخترنا لك أقرب صورة عملية.`,
      breakdown: [
        { label: 'الوضع الأكاديمي', value: academicValue, tone: profile.grade !== null && profile.grade >= 65 ? 'positive' : 'attention', icon: 'graduation' },
        { label: 'اللغة', value: englishValue, tone: englishReady ? 'positive' : 'attention', icon: 'language' },
        { label: 'الميزانية', value: budgetValue, tone: budgetStatus === 'within' ? 'positive' : 'attention', icon: 'wallet' },
        { label: 'التوقيت', value: intake.date, tone: 'positive', icon: 'calendar' },
      ],
    },
    recommendedIntake: { title: intake.title, date: intake.date, note: 'هذا موعد مقترح حسب وقت البداية الذي اخترته. يجب تأكيد توفر البرنامج وآخر موعد للتقديم مع الجامعة.', status: 'needs-verification' },
    studyPaths: [{ id: 'direct', title: 'Bachelor مباشر', description: 'هذه برامج في المجال المختار، وليست تأكيدًا بأن ملفك مستوفٍ لشروط القبول.', universities }],
    budget: [
      { label: 'الرسوم الدراسية', amountMYR: tuitionMin, maxAmountMYR: tuitionMax, note: 'نطاق رسوم البرامج المقترحة لسنة دراسية.', status: 'needs-verification' },
      { label: 'السكن', amountMYR: 9600, maxAmountMYR: 18000, note: 'نحو RM 800–1,500 شهريًا حسب المدينة ونوع السكن.', status: 'needs-verification' },
      { label: 'المعيشة والمواصلات', amountMYR: 12000, maxAmountMYR: 18000, note: 'نحو RM 1,000–1,500 شهريًا حسب نمط المعيشة.', status: 'needs-verification' },
      { label: 'التأشيرة والإجراءات', amountMYR: 3000, maxAmountMYR: 5000, note: 'تقدير للسنة الأولى ويحتاج تأكيدًا عند التقديم.', status: 'needs-verification' },
    ],
    budgetSummary: {
      minMYR: yearlyMin, maxMYR: yearlyMax, status: budgetStatus,
      note: budgetStatus === 'within' ? 'ميزانيتك المختارة قريبة من الحد الأدنى المتوقع.' : budgetStatus === 'tight' ? 'ميزانيتك الحالية أقل من الحد الأدنى المتوقع؛ جرّب جامعة أو مدينة أقل تكلفة.' : 'اختر نطاق ميزانية حتى نقارنها بالتكلفة المتوقعة.',
    },
  };
}
