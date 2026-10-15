export const fieldLabels: Record<string, string> = {
  'Computer Science & IT': 'الحاسب وتقنية المعلومات',
  'Business & Management': 'الأعمال والإدارة',
  'Engineering & Applied Sciences': 'الهندسة والعلوم التطبيقية',
  'Health & Medicine': 'الطب والعلوم الصحية',
  'Natural Sciences': 'العلوم الطبيعية',
  'Social Sciences & Humanities': 'العلوم الإنسانية والاجتماعية',
  'Education & Teaching': 'التربية والتعليم',
  'Law & Legal Studies': 'القانون',
  'Art & Design': 'الفنون والتصميم',
  'Communication & Media': 'الإعلام والاتصال',
  'Interdisciplinary Studies': 'دراسات متعددة التخصصات',
  Other: 'مجالات أخرى', Science: 'العلوم', 'Islamic Studies': 'الدراسات الإسلامية',
};
export function studyDuration(years: number | null) {
  if (!years) return 'تحتاج تأكيدًا';
  if (years === 1) return 'سنة واحدة';
  if (years === 1.5) return 'سنة ونصف';
  if (years === 2) return 'سنتان';
  if (years === 2.5) return 'سنتان ونصف';
  return `${Math.floor(years)} سنوات${years % 1 ? ' ونصف' : ''}`;
}
