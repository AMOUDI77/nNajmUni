import { useState } from "react";
import { Action, consultationHref, money, useCopy } from "./public/UI";
export default function BudgetCalculator() {
  const c = useCopy();
  const [tuition, setTuition] = useState(20000);
  const [housing, setHousing] = useState(600);
  const [living, setLiving] = useState(1400);
  const total = tuition + (housing + living) * 12;
  return (
    <div className="nu-calculator" id="budget">
      <div>
        <span className="nu-eyebrow">
          {c("خطط بوضوح", "Plan with clarity")}
        </span>
        <h2>
          {c("كم أجهز للسنة الأولى؟", "What should I budget for year one?")}
        </h2>
        <p>
          {c(
            "ابدأ بافتراضات قابلة للتعديل. الأرقام للتخطيط وليست عرض رسوم من جامعة.",
            "Start with editable assumptions. These are planning figures, not a university fee quote.",
          )}
        </p>
        <div className="nu-budget-inputs">
          <label>
            {c("الرسوم الدراسية / سنة (RM)", "Annual tuition (RM)")}
            <input
              type="number"
              min="0"
              max="1000000"
              step="100"
              value={tuition}
              onChange={(e) =>
                setTuition(
                  Math.max(0, Math.min(1000000, Number(e.target.value))),
                )
              }
            />
          </label>
          <label>
            {c("السكن / شهر", "Housing / month")}
            <select
              value={housing}
              onChange={(e) => setHousing(Number(e.target.value))}
            >
              <option value={350}>
                {c("سكن جامعي — RM 350", "Student housing — RM 350")}
              </option>
              <option value={600}>
                {c("سكن مشترك — RM 600", "Shared housing — RM 600")}
              </option>
              <option value={1100}>
                {c("استوديو — RM 1,100", "Studio — RM 1,100")}
              </option>
            </select>
          </label>
          <label>
            {c("المعيشة والمواصلات / شهر", "Living and transport / month")}
            <select
              value={living}
              onChange={(e) => setLiving(Number(e.target.value))}
            >
              <option value={800}>
                {c("اقتصادي — RM 800", "Basic — RM 800")}
              </option>
              <option value={1400}>
                {c("متوسط — RM 1,400", "Moderate — RM 1,400")}
              </option>
              <option value={2400}>
                {c("أعلى — RM 2,400", "Higher — RM 2,400")}
              </option>
            </select>
          </label>
        </div>
      </div>
      <div className="nu-budget-result">
        <span>
          {c("المجموع السنوي الجزئي التقديري", "Estimated annual subtotal")}
        </span>
        <output aria-live="polite" dir="ltr">
          {money(total)}
        </output>
        <dl className="nu-breakdown">
          <div>
            <dt>{c("الدراسة / سنة", "Tuition / year")}</dt>
            <dd dir="ltr">{money(tuition)}</dd>
          </div>
          <div>
            <dt>{c("السكن × 12 شهرًا", "Housing × 12 months")}</dt>
            <dd dir="ltr">{money(housing * 12)}</dd>
          </div>
          <div>
            <dt>{c("المعيشة × 12 شهرًا", "Living × 12 months")}</dt>
            <dd dir="ltr">{money(living * 12)}</dd>
          </div>
        </dl>
        <p className="nu-small">
          {c(
            "غير مشمول: التأشيرة وإجراءاتها، التأمين، رسوم التقديم والتأمينات والتذاكر. تحتاج هذه البنود تأكيدًا، وقد تكون سنوية أو لمرة واحدة.",
            "Excluded: visa and processing, insurance, application charges, deposits and flights. Confirm these separately, including whether annual or one-off.",
          )}
        </p>
        <p className="nu-small">
          {c(
            "الافتراضات من الحاسبة الحالية وغير موثقة بتاريخ تحديث؛ تختلف حسب المدينة والجامعة والسكن.",
            "Assumptions retained from the existing calculator, without a verification date. Actual costs vary by city, university and housing.",
          )}
        </p>
        <Action
          secondary
          to={consultationHref({
            source: "budget",
            budget: `Tuition RM ${tuition}/year; housing RM ${housing}/month; living RM ${living}/month; subtotal RM ${total}/year; excludes visa, insurance, one-offs`,
          })}
        >
          {c("راجع ميزانيتي مع مستشار", "Review my budget")}
        </Action>
      </div>
    </div>
  );
}
