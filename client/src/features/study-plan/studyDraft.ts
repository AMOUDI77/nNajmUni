export type StudyDraft = {
  qualification: string;
  country: string;
  grading: string;
  grade: string;
  field: string;
  budget: string;
  start: string;
};
export const KEY = "najmuni_explorer_v2";
export const blank: StudyDraft = {
  qualification: "",
  country: "",
  grading: "percentage",
  grade: "",
  field: "",
  budget: "",
  start: "",
};
export function readStudyDraft(): StudyDraft {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...blank };
    return Object.fromEntries(
      Object.keys(blank).map((k) => [
        k,
        typeof raw[k] === "string"
          ? raw[k]
          : (blank as Record<string, string>)[k],
      ]),
    ) as StudyDraft;
  } catch {
    return { ...blank };
  }
}
export function describeStudyDraft(p: StudyDraft): Record<string, string> {
  return {
    qualification: p.qualification,
    nationality: `Education country: ${p.country}`,
    grade: p.grade ? `${p.grade} (${p.grading})` : "Not provided",
    specialization: p.field,
    financial_readiness: `Annual total budget: ${p.budget}`,
    preferred_start: p.start,
  };
}
