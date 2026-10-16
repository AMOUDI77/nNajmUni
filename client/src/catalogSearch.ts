// Search spellings only: these never add institutions or change official catalog titles.
const institutionAliases: Record<string, string[]> = {
  UCSI: ['يو سي اس اي', 'يوسي اس اي', 'يوسي إس آي', 'يوسي', 'سيدايا'],
  MSU: ['ام اس يو', 'إم إس يو', 'الإدارة والعلوم'],
  UNIKL: ['يوني كي ال', 'يونيكل', 'كوالالمبور', 'كوالا لمبور'],
  UTEM: ['يو تيم', 'يو تي اي ام', 'التقنية ملاكا', 'ملاكا'],
  UTMSPACE: ['يو تي ام سبيس', 'يوتي ام سبيس', 'سبيس', 'utm space'],
  UTP: ['يو تي بي', 'بتروناس', 'بيتروناس'],
  XIAMEN: ['شيامن', 'شيامين', 'زيامن', 'شيا من', 'xmum'],
  KLUST: ['كلست', 'كلاست', 'كلوست', 'البنية التحتية', 'iukl', 'infrastructure university'],
  UM: ["مالايا", "ملايا", "ماليا", "مالاي", "يو ام"],
  USM: ["ساينس ماليزيا", "ساينس", "يو اس ام"],
  UPM: ["بوترا", "بوترا ماليزيا", "يو بي ام"],
  UTM: ["تكنولوجيا ماليزيا", "تكنولوجي ماليزيا", "يو تي ام"],
  UKM: ["كبانجسان", "كبانغسان", "الوطنية الماليزية", "يو كي ام"],
  UITM: ["مارا", "يو اي تي ام"],
  UNITEN: ["يونيتن", "تيناجا"],
  UMPSA: ["باهانج", "باهانغ", "السلطان عبدالله"],
  MMU: ["مالتيميديا", "ملتيميديا", "ملتميديا", "ام ام يو"],
  APU: ["اسيا باسيفيك", "آسيا باسيفيك", "اي بي يو", "أيه بي يو", "اسياباسيفيك"],
  UTAR: ["اوتار", "يو تار", "تونكو عبدالرحمن"],
  "TAYLOR'S": ["تايلور", "تايلورز", "تيلور", "تيلرز", "taylors", "taylor"],
  SUNWAY: ["صنواي", "صن واي", "سنواي", "سن واي", "سانواي", "sun way"],
  UNITAR: ["يونيتار"],
  INTI: ["انتي", "إنتي"],
  HELP: ["هيلب", "هلب"],
  LINCOLN: ["لينكولن", "لنكولن"],
  MAHSA: ["ماسا", "ماهسا", "مهسا"],
  CYBERJAYA: ["سايبرجايا", "سايبر جايا", "سيبرجايا"],
  IUKL: ["البنية التحتية", "اي يو كي ال"],
  CITY: ["سيتي"],
  NILAI: ["نيلاي", "نلاي"],
  SEGI: ["سيجي", "سيقي", "سيغي"],
  UNICAM: ["يونيكام", "الطيران"],
  GEOMATIKA: ["جيوماتيكا", "جيو ماتيكا"],
  HWU: ["هيريوت وات", "هيروت وات", "هيريوت"],
  BIGBEN: ["بيج بن", "بيق بن", "بيغ بن"],
  BRIGHT: ["برايت"],
  EMS: ["اي ام اس"],
  ELEC: ["ايلك", "إليك"],
  SHEFFIELD: ["شيفيلد", "شفيلد"],
  "BRITISH COUNCIL": ["بريتش كاونسل", "المجلس الثقافي البريطاني"],
  ELS: ["اي ال اس"],
};
const subjectAliases: [string, string[]][] = [
  ['nursing', ['تمريض']],
  ['pharmacy', ['صيدلة']],
  ['pharmaceutical', ['صيدلة', 'علوم الأدوية']],
  ['dental', ['أسنان', 'طب الأسنان']],
  ['dentistry', ['طب الأسنان', 'أسنان']],
  ['physiotherapy', ['علاج طبيعي']],
  ['psychology', ['علم النفس']],
  ['architecture', ['عمارة', 'هندسة معمارية']],
  ['civil engineering', ['هندسة مدنية']],
  ['mechanical', ['ميكانيكا', 'هندسة ميكانيكية']],
  ['electrical', ['كهرباء', 'هندسة كهربائية']],
  ['electronic', ['إلكترونيات']],
  ['chemical engineering', ['هندسة كيميائية']],
  ['petroleum', ['بترول', 'نفط']],
  ['mechatronic', ['ميكاترونكس']],
  ['data science', ['علم البيانات', 'علوم البيانات']],
  ['data analytics', ['تحليل البيانات']],
  ['information technology', ['تقنية المعلومات', 'تكنولوجيا المعلومات']],
  ['marketing', ['تسويق']],
  ['human resource', ['موارد بشرية']],
  ['logistics', ['لوجستيات', 'الخدمات اللوجستية']],
  ['supply chain', ['سلاسل الإمداد']],
  ['hospitality', ['ضيافة', 'فندقة']],
  ['tourism', ['سياحة']],
  ['education', ['تربية', 'تعليم']],
  ['law', ['قانون', 'حقوق']],
  ['communication', ['اتصال', 'إعلام']],
  ['design', ['تصميم']],
  ['animation', ['رسوم متحركة', 'أنيميشن']],
  ['biotechnology', ['تقنية حيوية', 'تكنولوجيا حيوية']],
  ['biomedical', ['طب حيوي', 'هندسة طبية']],
  ['chemistry', ['كيمياء']],
  ['physics', ['فيزياء']],
  ['mathematics', ['رياضيات']],
  ['aviation', ['طيران']],
  ['geomatic', ['جيوماتكس', 'مساحة']],
  ["software engineering", ["هندسة البرمجيات", "هندسه برمجيات"]],
  ["cyber security", ["الأمن السيبراني", "امن سيبراني"]],
  ["cybersecurity", ["الأمن السيبراني", "امن سيبراني"]],
  ["computer science", ["علوم الحاسب", "علوم الحاسوب", "علوم الكمبيوتر"]],
  ["business", ["ادارة الاعمال", "إدارة أعمال", "بزنس"]],
  ["engineering", ["هندسة"]],
  ["medicine", ["طب", "الطب"]],
  ["accounting", ["محاسبة"]],
  ["finance", ["مالية", "تمويل"]],
  ["artificial intelligence", ["ذكاء اصطناعي", "الذكاء الاصطناعي"]],
  ["language", ["معهد لغة", "لغة انجليزية"]],
  ["english", ["لغة انجليزية", "انجليزي"]],
];

const normalizedCache = new Map<string, string>();
/** Degree wording differs across universities; keep the subject and any specialism. */
export function programSearchIntent(query: string) {
  let text = searchNormalize(query).replace(/\bcyber security\b/g, 'cybersecurity');
  const level = /\b(bachelor|bsc|beng|ba)\b/.test(text) ? 'bachelor'
    : /\b(master|masters|msc|mba)\b/.test(text) ? 'master'
    : /\b(phd|doctor of philosophy)\b/.test(text) ? 'phd'
    : /\bdiploma\b/.test(text) ? 'diploma' : undefined;
  if (level) {
    text = text.replace(/\b(doctor of philosophy|bachelor|masters?|bsc|beng|msc|mba|phd|ba|diploma|honours|honors|hons|of|in|with|a|specialism|specialisation|specialization|majoring)\b/g, ' ');
    if (/cybersecurity|software engineering|artificial intelligence|data science|data analytics|game development/.test(text)) {
      text = text.replace(/\b(computer science|information technology|computing)\b/g, ' ');
    }
    text = text.replace(/\s+/g, ' ').trim().replace(/^(science|arts)\b\s*/, '').trim();
  }
  return { text: text || searchNormalize(query), level };
}

export function programSearchScore(query: string, program: { name: string; field: string; level: string }, institutionNames: string[] = []) {
  const intent = programSearchIntent(query);
  if (intent.level && intent.level !== program.level) return 0;
  const names = [...programSearchNames(program.name, program.field), ...institutionNames];
  const subjectScore = searchScore(intent.text, names.map(name => searchNormalize(name).replace(/\bcyber security\b/g, 'cybersecurity')));
  if (!subjectScore) return 0;
  return subjectScore + (searchNormalize(query) === searchNormalize(program.name) ? 1000 : 0);
}
export function searchNormalize(value: string) {
  const cached = normalizedCache.get(value);
  if (cached !== undefined) return cached;
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (normalizedCache.size > 15000) normalizedCache.clear();
  normalizedCache.set(value, normalized);
  return normalized;
}
function queryTerms(value: string) {
  const text = searchNormalize(value);
  const meaningful = text
    .split(" ")
    .filter(
      (word) => !["جامعه", "جامعات", "university", "universiti"].includes(word),
    );
  return meaningful.length ? meaningful : text.split(" ").filter(Boolean);
}
function distance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  return rows[a.length][b.length];
}
export function institutionSearchNames(name: string, abbr: string) {
  return [name, abbr, ...(institutionAliases[abbr.toUpperCase()] || [])];
}
export function programSearchNames(name: string, field: string) {
  const text = searchNormalize(name + " " + field);
  return [
    name,
    field,
    ...subjectAliases
      .filter(([en]) => text.includes(en))
      .flatMap(([, ar]) => ar),
  ];
}
/** Exact > prefix > substring > bounded typo. Short queries never use typo matching. */
export function searchScore(query: string, names: string[]) {
  const terms = queryTerms(query);
  if (!terms.length) return 1;
  const normalized = names.map(searchNormalize).filter(Boolean),
    phrase = terms.join(" ");
  if (normalized.includes(phrase)) return 1000;
  if (normalized.some((name) => name.startsWith(phrase))) return 900;
  if (normalized.some((name) => name.includes(phrase))) return 800;
  const words = normalized.flatMap((name) => name.split(" "));
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const word of words) {
      if (word === term) best = Math.max(best, 100);
      else if (word.startsWith(term)) best = Math.max(best, 85);
      else if (term.length >= 3 && word.includes(term))
        best = Math.max(best, 65);
      else if (
        term.length >= 4 &&
        Math.abs(term.length - word.length) <= (term.length >= 7 ? 2 : 1)
      ) {
        const d = distance(term, word);
        if (d <= (term.length >= 7 ? 2 : 1)) best = Math.max(best, 45 - d * 10);
      }
    }
    if (!best) return 0;
    total += best;
  }
  return Math.round(total / terms.length);
}
