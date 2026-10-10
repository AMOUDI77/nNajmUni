import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Action,
  Notice,
  PageIntro,
  ProgramRow,
  consultationHref,
  fieldLabel,
  useCopy,
} from "../../components/public/UI";
import { useCatalog } from "../../hooks/useCatalog";
import { trackEvent } from "../../utils/analytics";
import { type StudyDraft, KEY, blank, readStudyDraft } from "./studyDraft";
const qualifications = [
  ["high-school", "ثانوية أو ما يعادلها", "High school or equivalent"],
  ["diploma", "دبلوم", "Diploma"],
  ["bachelor", "بكالوريوس", "Bachelor degree"],
  ["other", "مؤهل آخر / غير متأكد", "Other / not sure"],
];
const fields = [
  "Technology",
  "Business",
  "Engineering",
  "Medicine",
  "Science",
  "Law",
  "Arts & Design",
];
const budgets = [
  ["under-25", "أقل من RM 25,000", "Under RM 25,000"],
  ["25-45", "RM 25,000–45,000", "RM 25,000–45,000"],
  ["45-60", "RM 45,000–60,000", "RM 45,000–60,000"],
  ["over-60", "أكثر من RM 60,000", "Over RM 60,000"],
  ["unsure", "لم أحدد بعد", "Not sure yet"],
];
const starts = [
  ["soon", "أقرب وقت ممكن", "As soon as possible"],
  ["3-6", "خلال 3–6 أشهر", "In 3–6 months"],
  ["6-12", "خلال 6–12 شهرًا", "In 6–12 months"],
  ["flexible", "مرن / غير متأكد", "Flexible / not sure"],
];
export default function StudyExplorer() {
  const c = useCopy();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StudyDraft>(readStudyDraft);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const { programs, loading, offline } = useCatalog();
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* Exploration still works when storage is disabled. */
    }
  }, [draft]);
  useEffect(() => {
    heading.current?.focus();
  }, [step, pathname]);
  const update = (patch: Partial<StudyDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };
  const complete = !!(
    draft.qualification &&
    draft.country.trim() &&
    draft.field &&
    draft.budget &&
    draft.start
  );
  const choose = (key: "field" | "budget" | "start", options: string[][]) => (
    <div className="nu-options">
      {options.map(([id, ar, en]) => (
        <button
          key={id}
          type="button"
          aria-pressed={draft[key] === id}
          className={draft[key] === id ? "selected" : ""}
          onClick={() => update({ [key]: id })}
        >
          <span>{c(ar, en)}</span>
          <span aria-hidden="true">{draft[key] === id ? "✓" : "○"}</span>
        </button>
      ))}
    </div>
  );
  const next = () => {
    if (step === 0) {
      const max =
        draft.grading === "gpa4" ? 4 : draft.grading === "gpa5" ? 5 : 100;
      if (!draft.qualification || !draft.country.trim()) {
        setError(
          c(
            "اختر المؤهل وحدد بلد الشهادة، أو اكتب غير متأكد.",
            "Choose your qualification and education country, or enter not sure.",
          ),
        );
        return;
      }
      if (
        draft.grade &&
        (Number(draft.grade) < 0 ||
          Number(draft.grade) > max ||
          !Number.isFinite(Number(draft.grade)))
      ) {
        setError(
          c(
            `أدخل معدلًا بين 0 و${max}، أو اتركه للمراجعة لاحقًا.`,
            `Enter a grade from 0 to ${max}, or leave it for later review.`,
          ),
        );
        return;
      }
    } else if (
      !draft[(["qualification", "field", "budget", "start"] as const)[step]]
    ) {
      setError(c("اختر إجابة للمتابعة.", "Choose an answer to continue."));
      return;
    }
    trackEvent("study_plan_step_completed", { step: step + 1 });
    if (step === 3) {
      trackEvent("study_plan_completed");
      navigate("/study-plan/result");
    } else setStep(step + 1);
  };
  const reset = () => {
    setDraft({ ...blank });
    setStep(0);
    navigate("/study-plan/questions");
  };
  const label = (rows: string[][], id: string) => {
    const row = rows.find((r) => r[0] === id);
    return row ? c(row[1], row[2]) : id;
  };
  if (pathname.endsWith("/summary"))
    return (
      <Navigate
        to={complete ? "/study-plan/result" : "/study-plan/questions"}
        replace
      />
    );
  if (pathname.endsWith("/result")) {
    if (!complete) return <Navigate to="/study-plan/questions" replace />;
    const list = programs
      .filter(
        (p) =>
          (draft.field === "undecided" || p.field === draft.field) &&
          (draft.qualification === "bachelor"
            ? ["master", "phd"].includes(p.level)
            : ["foundation", "diploma", "bachelor"].includes(p.level)),
      )
      .slice(0, 6);
    const withFees = list.filter((p) => p.tuition_per_year > 0);
    const min = withFees.length
      ? Math.min(...withFees.map((p) => p.tuition_per_year))
      : null;
    const max = withFees.length
      ? Math.max(...withFees.map((p) => p.tuition_per_year))
      : null;
    return (
      <main id="main-content" className="nu-container nu-page">
        <PageIntro
          eyebrow={c("خطتك المبدئية", "Your preliminary plan")}
          title={c("الصورة أصبحت أوضح.", "A clearer picture of your options.")}
        >
          {c(
            "هذه برامج للاستكشاف حسب المجال والمرحلة، وليست توصية قبول أو تقييم أهلية.",
            "These are programs to explore by field and level, not an admission recommendation or eligibility assessment.",
          )}
        </PageIntro>
        <div className="nu-plan-summary">
          <span>{label(qualifications, draft.qualification)}</span>
          <span>{draft.country}</span>
          <span>
            {draft.field === "undecided"
              ? c("المجال لم يحدد", "Field undecided")
              : fieldLabel(draft.field, c)}
          </span>
          <span>{label(budgets, draft.budget)}</span>
          <Link to="/study-plan/questions">{c("تعديل", "Edit")}</Link>
        </div>
        <Notice />
        {offline && (
          <p className="nu-notice">
            {c(
              "نعرض نسخة محفوظة من الدليل. لم نتحقق من حداثة هذه البرامج والرسوم.",
              "Showing a saved directory. Program and fee freshness has not been verified.",
            )}
          </p>
        )}
        <div className="nu-plan-review">
          <h2>{c("ما الذي يحتاج مراجعة؟", "What needs review?")}</h2>
          <p>
            {c(
              "مؤهلك وبلد شهادتك والمعدل يساعدون المستشار على المراجعة؛ لا نملك قواعد موثقة للحكم على القبول تلقائيًا. ميزانيتك ووقت البداية تفضيلات للمراجعة وليسا تأكيدًا لتوفر برنامج مناسب.",
              "Your qualification, education country and grade help an advisor review your case. We do not have verified rules to assess admission automatically. Budget and start time are review preferences, not confirmation of a suitable available program.",
            )}
          </p>
          <p>
            <strong>{c("وقت البداية المطلوب: ", "Preferred start: ")}</strong>
            {label(starts, draft.start)} —{" "}
            {c(
              "المواعيد المتاحة تحتاج تأكيد الجامعة.",
              "Available intakes require university confirmation.",
            )}
          </p>
        </div>
        <section className="nu-section">
          <h2>
            {c("برامج يمكنك البدء بمراجعتها", "Programs to start exploring")}
          </h2>
          {loading ? (
            <p role="status">{c("جاري تحميل البرامج…", "Loading programs…")}</p>
          ) : list.length ? (
            list.map((p) => (
              <ProgramRow program={p} key={p.id} source="study-plan" />
            ))
          ) : (
            <p className="nu-empty">
              {c(
                "لا توجد برامج كافية في دليلنا لهذا الاختيار. يمكن للمستشار مراجعة خيارات إضافية.",
                "The directory has insufficient programs for this selection. An advisor can review additional options.",
              )}
            </p>
          )}
        </section>
        <section className="nu-trust-note">
          <h2>{c("التكلفة، بالصورة الكاملة.", "Build the full budget")}</h2>
          <p>
            {min !== null
              ? c(
                  `رسوم البرامج المعروضة تتراوح في الدليل بين RM ${min.toLocaleString("en-US")} وRM ${max?.toLocaleString("en-US")} سنويًا. أضف السكن والمعيشة، ثم تحقق من التأشيرة والتأمين والرسوم الإضافية.`,
                  `Listed tuition for these programs ranges from RM ${min.toLocaleString("en-US")} to RM ${max?.toLocaleString("en-US")} per year. Add housing and living, then confirm visa, insurance and additional charges.`,
                )
              : c(
                  "لا توجد رسوم كافية لحساب نطاق موثوق. راجع التفاصيل مع المستشار.",
                  "There are not enough fee records to calculate a range. Review details with an advisor.",
                )}
          </p>
          <Link className="nu-text-link" to="/budget">
            {c("افتح حاسبة الميزانية", "Open the budget calculator")} ↗
          </Link>
        </section>
        <section className="nu-final">
          <div>
            <h2>{c("نراجع التفاصيل معك؟", "Ready to review the details?")}</h2>
            <p>
              {c(
                "ارسل خطتك للمستشار مع اسمك ورقمك فقط.",
                "Share your plan with an advisor using just your name and number.",
              )}
            </p>
          </div>
          <Action to={consultationHref({ source: "study-plan" })}>
            {c("راجع خطتي مع مستشار", "Review my plan with an advisor")}
          </Action>
        </section>
        <button className="nu-text-link" onClick={reset}>
          {c("مسح الخطة والبدء من جديد", "Clear plan and start again")}
        </button>
      </main>
    );
  }
  if (!pathname.endsWith("/questions"))
    return (
      <main id="main-content" className="nu-container nu-page nu-narrow">
        <PageIntro
          eyebrow={c("استكشاف مجاني", "Free exploration")}
          title={c("ابدأ بما تعرفه عن نفسك.", "Start with what you know.")}
        >
          {c(
            "أربع خطوات قصيرة لمراجعة مؤهلك ومجالك وميزانيتك ووقت البداية. شاهد خيارات من الدليل قبل مشاركة بيانات التواصل.",
            "Four short steps covering your qualification, field, budget and start time. See directory options before sharing contact details.",
          )}
        </PageIntro>
        <Action to="/study-plan/questions">
          {c("اكتشف خياراتي الدراسية", "Explore my study options")}
        </Action>
        <p className="nu-small">
          {c(
            "بدون مستندات أو حساب. تظل مسودة الخطة في متصفحك حتى تطلب مراجعتها.",
            "No documents or account. Your draft stays in your browser until you request a review.",
          )}
        </p>
      </main>
    );
  const titles = [
    c("ما مؤهلك الحالي؟", "What is your current qualification?"),
    c("أي مجال يهمك؟", "Which field interests you?"),
    c("ما ميزانيتك السنوية؟", "What is your annual budget?"),
    c("متى تفضل البداية؟", "When would you like to start?"),
  ];
  return (
    <main id="main-content" className="nu-container nu-page nu-wizard">
      <div className="nu-wizard-top">
        <button
          className="nu-text-link"
          onClick={() => {
            setError("");
            step ? setStep(step - 1) : navigate("/study-plan");
          }}
        >
          {c("رجوع", "Back")}
        </button>
        <span>{c(`الخطوة ${step + 1} من 4`, `Step ${step + 1} of 4`)}</span>
      </div>
      <progress
        value={step + 1}
        max={4}
        aria-label={c("تقدم الخطة", "Plan progress")}
      />
      <h1 ref={heading} tabIndex={-1}>
        {titles[step]}
      </h1>
      <p>
        {
          [
            c(
              "نحتاج بلد الشهادة لفهم النظام الدراسي. يمكنك ترك المعدل للمراجعة لاحقًا.",
              "Your education country helps identify the school system. You can leave your grade for later review.",
            ),
            c(
              "اختر مجالًا للاستكشاف، ويمكنك تغييره لاحقًا.",
              "Choose a field to explore. You can change it later.",
            ),
            c(
              "بالرينجت الماليزي، للدراسة والسكن والمعيشة معًا.",
              "In Malaysian ringgit, including tuition, housing and living.",
            ),
            c(
              "هذا تفضيلك؛ سنتحقق من المواعيد المتاحة لاحقًا.",
              "This is your preference; available intakes need confirmation.",
            ),
          ][step]
        }
      </p>
      {step === 0 ? (
        <div className="nu-form-fields">
          <label>
            {c("المؤهل", "Qualification")}
            <select
              value={draft.qualification}
              onChange={(e) => update({ qualification: e.target.value })}
            >
              <option value="">
                {c("اختر المؤهل", "Select qualification")}
              </option>
              {qualifications.map(([id, ar, en]) => (
                <option value={id} key={id}>
                  {c(ar, en)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c(
              "بلد الحصول على الشهادة أو النظام التعليمي",
              "Education country or school system",
            )}
            <input
              value={draft.country}
              maxLength={100}
              onChange={(e) => update({ country: e.target.value })}
              placeholder={c(
                "مثل السعودية، مصر، أو غير متأكد",
                "E.g. Saudi Arabia, Egypt, or not sure",
              )}
            />
          </label>
          <details className="nu-grade-details">
            <summary>
              {c(
                "إضافة المعدل للمراجعة (اختياري)",
                "Add grade for review (optional)",
              )}
            </summary>
            <div className="nu-filters">
              <label>
                {c("نظام المعدل", "Grading system")}
                <select
                  value={draft.grading}
                  onChange={(e) =>
                    update({ grading: e.target.value, grade: "" })
                  }
                >
                  <option value="percentage">
                    {c("من 100", "Out of 100")}
                  </option>
                  <option value="gpa4">{c("من 4", "Out of 4")}</option>
                  <option value="gpa5">{c("من 5", "Out of 5")}</option>
                  <option value="other">
                    {c("نظام آخر — أراجعه لاحقًا", "Other — review later")}
                  </option>
                </select>
              </label>
              {draft.grading !== "other" && (
                <label>
                  {c("المعدل", "Grade")}
                  <input
                    type="number"
                    min="0"
                    max={
                      draft.grading === "gpa4"
                        ? 4
                        : draft.grading === "gpa5"
                          ? 5
                          : 100
                    }
                    step="0.01"
                    value={draft.grade}
                    onChange={(e) => update({ grade: e.target.value })}
                  />
                </label>
              )}
            </div>
          </details>
        </div>
      ) : step === 1 ? (
        choose("field", [
          ...fields.map((f) => [f, fieldLabel(f, (a) => a), f]),
          ["undecided", "لم أحدد بعد", "Not sure yet"],
        ])
      ) : step === 2 ? (
        choose("budget", budgets)
      ) : (
        choose("start", starts)
      )}
      {error && (
        <p className="nu-error" role="alert">
          {error}
        </p>
      )}
      <button className="nu-button nu-next" onClick={next}>
        {step === 3
          ? c("اعرض خياراتي", "Show my options")
          : c("التالي", "Continue")}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <small className="nu-small">
        {c(
          "لا نطلب رقمك أو مستنداتك لاستكشاف الخيارات.",
          "No phone number or documents needed to explore.",
        )}
      </small>
    </main>
  );
}
