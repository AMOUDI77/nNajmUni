import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../../i18n";
import type { Program } from "../../types";
export function useCopy() {
  const { isArabic } = usePreferences();
  return (ar: string, en: string) => (isArabic ? ar : en);
}
export function Action({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`nu-button${secondary ? " nu-button-secondary" : ""}`}
      to={to}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="nu-page-intro">
      {eyebrow && <span className="nu-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function Notice() {
  const c = useCopy();
  return (
    <p className="nu-notice">
      {c(
        "بيانات استرشادية من دليل NajmUni. الرسوم والمواعيد وشروط القبول تحتاج تأكيد الجامعة قبل التقديم.",
        "Directory information. Confirm fees, intakes and admission requirements with the university before applying.",
      )}
    </p>
  );
}
export function money(value?: number) {
  return value && Number.isFinite(value)
    ? `RM ${value.toLocaleString("en-US")}`
    : "—";
}
export function levelLabel(level: string, c: ReturnType<typeof useCopy>) {
  return (
    (
      {
        foundation: c("تأسيسي", "Foundation"),
        diploma: c("دبلوم", "Diploma"),
        bachelor: c("بكالوريوس", "Bachelor"),
        master: c("ماجستير", "Master"),
        phd: c("دكتوراه", "PhD"),
      } as Record<string, string>
    )[level] ?? level
  );
}
export function fieldLabel(field: string, c: ReturnType<typeof useCopy>) {
  return (
    (
      {
        Technology: c("التقنية", "Technology"),
        Engineering: c("الهندسة", "Engineering"),
        Business: c("إدارة الأعمال", "Business"),
        Medicine: c("العلوم الصحية", "Health sciences"),
        Science: c("العلوم", "Science"),
        Law: c("القانون", "Law"),
        "Arts & Design": c("الفنون والتصميم", "Arts & Design"),
        Hospitality: c("الضيافة", "Hospitality"),
        "Social Science": c("العلوم الاجتماعية", "Social science"),
      } as Record<string, string>
    )[field] ?? field
  );
}
export function consultationHref(
  context: Record<string, string | number | undefined> = {},
) {
  const params = new URLSearchParams();
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return `/consultation${params.size ? `?${params}` : ""}`;
}
export function ProgramRow({
  program,
  source,
}: {
  program: Program;
  source?: string;
}) {
  const c = useCopy();
  return (
    <article className="nu-program-row">
      <div>
        <span className="nu-meta">
          {levelLabel(program.level, c)} ·{" "}
          {program.university_abbr || program.university_name}
        </span>
        <h3>
          <Link
            to={`/programs/${program.id}${source ? `?source=${encodeURIComponent(source)}` : ""}`}
            dir="auto"
          >
            {program.name}
          </Link>
        </h3>
        <p>
          {program.duration_years
            ? c(
                `${program.duration_years} سنوات حسب الدليل`,
                `${program.duration_years} years in the directory`,
              )
            : c("المدة تحتاج تأكيدًا", "Duration to confirm")}
        </p>
      </div>
      <div className="nu-program-price">
        <strong dir="ltr">{money(program.tuition_per_year)}</strong>
        <small>
          {program.tuition_per_year > 0
            ? c("رسوم سنوية استرشادية", "Indicative annual tuition")
            : c("الرسوم تحتاج تأكيدًا", "Fees require confirmation")}
        </small>
        <Link
          className="nu-text-link"
          to={`/programs/${program.id}${source ? `?source=${encodeURIComponent(source)}` : ""}`}
        >
          {c("تفاصيل البرنامج", "Program details")} ↗
        </Link>
      </div>
    </article>
  );
}
