export const programOptions = [
  ['computer-science', 'علوم الحاسب'], ['cybersecurity', 'الأمن السيبراني'],
  ['software-engineering', 'هندسة البرمجيات'], ['artificial-intelligence', 'الذكاء الاصطناعي'],
  ['business', 'إدارة الأعمال'], ['engineering', 'الهندسة'], ['accounting-finance', 'المحاسبة والمالية'],
  ['medicine', 'الطب والعلوم الصحية'], ['science', 'العلوم'], ['law', 'القانون'],
  ['design', 'التصميم والفنون'], ['undecided', 'لم أحدد بعد'],
] as const;

export const qualificationOptions = [
  ['high-school', 'الثانوية'], ['american-diploma', 'American Diploma'],
  ['igcse', 'IGCSE / A-Level'], ['diploma', 'Diploma'], ['other', 'شهادة أخرى'],
] as const;

export const englishOptions = [
  ['ielts', 'عندي IELTS'], ['toefl', 'عندي TOEFL'], ['english-medium', 'درست باللغة الإنجليزية'],
  ['none', 'ما عندي اختبار لغة'], ['unsure', 'مو متأكد'],
] as const;

export const budgetOptions = [
  ['under-25', 'أقل من RM25,000'], ['25-35', 'RM25,000–35,000'], ['35-45', 'RM35,000–45,000'],
  ['45-60', 'RM45,000–60,000'], ['over-60', 'أكثر من RM60,000'], ['unsure', 'مو متأكد'],
] as const;

export const startOptions = [
  ['nearest', 'أقرب وقت ممكن'], ['late-2026', 'نهاية 2026'], ['early-2027', 'بداية 2027'], ['flexible', 'مو مستعجل'],
] as const;

export const preferenceOptions = [
  ['cost', 'أقل تكلفة'], ['university', 'جامعة قوية'], ['program', 'تخصص قوي'], ['early-intake', 'بداية قريبة'],
  ['location', 'موقع الجامعة'], ['english', 'خيارات لغة مرنة'], ['housing', 'سكن مناسب'],
] as const;

export const labelFor = (options: readonly (readonly [string, string])[], value: string) =>
  options.find(([id]) => id === value)?.[1] ?? '—';
