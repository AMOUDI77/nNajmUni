import type { University } from '../types';
import { UNIVERSITIES } from '../data';

export interface ComparisonScore {
  overall: number;
  tuition: number;
  ranking: number;
  scale: number;
}

export interface MatchResult {
  university: University;
  rank: 1 | 2 | 3;
  reasons: string[];
}

const FIELD_MAP: Record<string, string> = {
  'Medicine & Healthcare': 'Medicine',
  'Engineering':           'Engineering',
  'Business & Finance':    'Business',
  'Technology & AI':       'Technology',
  'Law':                   'Law',
  'Architecture':          'Engineering',
  'Aviation':              'Engineering',
  'Pharmacy':              'Medicine',
  'Psychology':            'Social Science',
  'Culinary Arts':         'Hospitality',
};

export function scoreUniversity(u: University): ComparisonScore {
  const tuition  = Math.round(100 - ((u.tuition_min - 8000) / (60000 - 8000)) * 60);
  const ranking  = u.qs_ranking ? Math.round(100 - ((u.qs_ranking - 60) / (400 - 60)) * 70) : 45;
  const scale    = Math.min(100, Math.round((u.students_count / 30000) * 100));
  const overall  = Math.round(tuition * 0.4 + ranking * 0.45 + scale * 0.15);
  return {
    overall: Math.max(40, Math.min(98, overall)),
    tuition: Math.max(30, Math.min(99, tuition)),
    ranking: Math.max(30, Math.min(99, ranking)),
    scale:   Math.max(30, Math.min(99, scale)),
  };
}

export function matchUniversities(careerGoal: string): MatchResult[] {
  const field   = FIELD_MAP[careerGoal] ?? 'Technology';
  const candidates = UNIVERSITIES.filter(u => u.type !== 'public');

  const scored = candidates.map(u => {
    const base  = scoreUniversity(u);
    const bonus = u.tuition_min < 30000 ? 8 : 0;
    return { u, score: base.overall + bonus + (Math.random() * 6) };
  });

  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3);

  return top3.map((item, i) => ({
    university: item.u,
    rank:       (i + 1) as 1 | 2 | 3,
    reasons: [
      `Strong ${field} faculty`,
      `Tuition from ${formatRM(item.u.tuition_min)}/yr`,
      item.u.qs_ranking ? `QS Ranked #${item.u.qs_ranking}` : 'MQA Accredited',
    ],
  }));
}

export function filterUniversities(
  unis: University[],
  query: string,
  type: string,
): University[] {
  let list = [...unis];
  if (type)  list = list.filter(u => u.type === type);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.abbr.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => (a.qs_ranking ?? 9999) - (b.qs_ranking ?? 9999));
}

export function formatRM(n: number): string {
  return `RM ${(n / 1000).toFixed(0)}k`;
}
