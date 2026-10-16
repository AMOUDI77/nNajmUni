import { useMemo } from 'react';
import { usePreferences, type Language } from './i18n';
import english from './publicCopy.json';
import arabic from './arabicCopy.json';

const dictionary: Record<string, string> = english;
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => ({
  pattern: new RegExp('^' + key.split(/\{\d+\}/).map(escape).join('(.*?)') + '$'), value,
}));

/** Translate display copy only. Stable filter values and user-entered data stay unchanged. */
export function translateCopy<T>(text: T, language: Language): T {
  if (typeof text !== 'string') return text;
  if (language === 'ar') return ((arabic as Record<string, string>)[normalize(text)] || text) as T;
  const key = normalize(text);
  if (dictionary[key]) return dictionary[key] as T;
  for (const { pattern, value } of patterns) {
    const match = key.match(pattern);
    if (match) return value.replace(/\{(\d+)\}/g, (_, index: string) => translateCopy(match[Number(index) + 1], language)) as T;
  }
  return text;
}

export function useCopy() {
  const { language } = usePreferences();
  const tr = useMemo(() => <T,>(text: T) => translateCopy(text, language), [language]);
  return { tr, language };
}
