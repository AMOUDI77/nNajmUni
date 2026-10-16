import { useEffect, useState } from "react";
import { apiUrl } from "./config";
import { UNIVERSITIES, PROGRAMS, INSTITUTES } from "./data";
import type { University, Program, Institute } from "./types";
import { translateCopy } from './copy';
import type { Language } from './i18n';

export const levels: Record<string, string> = {
  certificate: 'شهادة',
  postgraduate_diploma: 'دبلوم دراسات عليا',
  other: 'برامج مهنية ومسارات أخرى',
  foundation: "تأسيسي",
  diploma: "دبلوم",
  bachelor: "بكالوريوس",
  master: "ماجستير",
  phd: "دكتوراه",
};
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}
// Translation aliases describe subjects, never create additional catalog records.
const aliases: Record<string, string> = {
  "الأمن السيبراني": "cyber security",
  "هندسة البرمجيات": "software engineering",
  "علوم الحاسب": "computer science",
  "إدارة الأعمال": "business",
  هندسة: "engineering",
  طب: "medicine",
  "معهد لغة": "language",
  "لغة إنجليزية": "english",
};
export function matches(query: string, text: string) {
  const q = normalize(query),
    haystack = normalize(text);
  return (
    !q ||
    haystack.includes(q) ||
    Object.entries(aliases).some(
      ([ar, en]) => normalize(ar) === q && haystack.includes(en),
    )
  );
}
export function track(
  event: string,
  context: {
    program_id?: number;
    category?: string;
    result_count?: number;
  } = {},
) {
  // Provider-neutral boundary; deliberately excludes query text and contact data.
  window.dispatchEvent(
    new CustomEvent("najmuni:analytics", { detail: { event, ...context } }),
  );
}
export type Inquiry = { university?: string; program?: string; level?: string };
// Resolved from the owner-supplied https://wa.me/message/SKH6EMIXDIDMG1 (Najmuni).
export const BUSINESS_WHATSAPP_NUMBER = '601137327607';
export type ApplicationInquiry = Inquiry & { name: string; phone: string; qualification?: string; preferredStart?: string };
export function applicationMessage(context: ApplicationInquiry, language: Language = 'ar') {
  return [
    'مرحبًا فريق NajmUni، أرغب بالمساعدة في تقديم طلب قبولي.',
    `الاسم: ${context.name}`, `رقم التواصل: ${context.phone}`,
    context.qualification && `المؤهل الدراسي: ${context.qualification}`,
    context.university && `الجامعة / المعهد: ${context.university}`,
    context.program && `التخصص: ${context.program}`,
    context.level && `الدرجة المطلوبة: ${levels[context.level] || context.level}`,
    context.preferredStart && `موعد البداية المفضل: ${context.preferredStart}`,
    'أرجو مراجعة خياراتي وتوضيح شروط القبول والرسوم والخطوات التالية. شكرًا لكم.',
  ].filter(Boolean).map(line => translateCopy(line, language)).join('\n');
}
export function whatsappMessageUrl(message: string) {
  const number = String(import.meta.env.VITE_WHATSAPP_NUMBER || BUSINESS_WHATSAPP_NUMBER).replace(/[\s+()-]/g, '');
  return /^[1-9]\d{7,14}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
export function applicationUrl(context: Inquiry = {}, advisor = false) {
  return (
    "/apply?" +
    new URLSearchParams({
      ...context,
      intent: advisor ? "consultation" : "application",
    })
  );
}
export function whatsappUrl(context: Inquiry = {}) {
  const message = [
    "مرحبًا فريق NajmUni، أرغب بالاستفسار عن الدراسة في ماليزيا.",
    context.university && `الجامعة / المعهد: ${context.university}`,
    context.program && `التخصص: ${context.program}`,
    context.level && `الدرجة: ${levels[context.level] || context.level}`,
    "أحتاج معرفة شروط القبول والرسوم ومواعيد البدء.",
  ]
    .filter(Boolean)
    .join("\n");
  return whatsappMessageUrl(message);
}
export function useCatalog() {
  const [state, setState] = useState<{
    universities: University[];
    programs: Program[];
    institutes: Institute[];
    loading: boolean;
    offline: boolean;
  }>({
    universities: [],
    programs: [],
    institutes: [],
    loading: true,
    offline: false,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all(
      ["universities?limit=1000", "programs", "institutes"].map(
        async (path) => {
          const response = await fetch(apiUrl("/api/" + path), {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Catalog unavailable");
          const body = await response.json();
          if (!Array.isArray(body.data)) throw new Error("Invalid catalog");
          return body.data;
        },
      ),
    )
      .then(([universities, programs, institutes]) => {
        if (active)
          setState({
            universities,
            programs,
            institutes,
            loading: false,
            offline: false,
          });
      })
      .catch(() => {
        if (active)
          setState({
            universities: UNIVERSITIES,
            programs: PROGRAMS,
            institutes: INSTITUTES,
            loading: false,
            offline: true,
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
