import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useCatalog } from "../hooks/useCatalog";
import { Action, PageIntro, useCopy } from "../components/public/UI";
import { trackEvent } from "../utils/analytics";
import {
  readStudyDraft,
  describeStudyDraft,
} from "../features/study-plan/studyDraft";
export default function Consultation() {
  const c = useCopy();
  const [params] = useSearchParams();
  const location = useLocation();
  const { universities, programs, loading } = useCatalog();
  const selectedProgram = programs.find(
    (p) => p.id === Number(params.get("program")),
  );
  const selectedUniversity = universities.find(
    (u) =>
      u.id ===
      (selectedProgram?.university_id ?? Number(params.get("university"))),
  );
  const application =
    location.pathname === "/apply" || params.get("intent") === "application";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [choice, setChoice] = useState(params.get("choice") || "");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const savedPlan = readStudyDraft();
  const plan =
    params.get("source") === "study-plan" && savedPlan.field ? savedPlan : null;
  const budget = params.get("budget") || "";
  const hasCatalogContext =
    !!params.get("program") || !!params.get("university");
  const invalidSelection =
    hasCatalogContext &&
    !loading &&
    (!selectedUniversity || (!!params.get("program") && !selectedProgram));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage(c("اكتب اسمك للمتابعة.", "Enter your name to continue."));
      setStatus("error");
      return;
    }
    const normalized = phone.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      setMessage(
        c(
          "اكتب رقمًا دوليًا يبدأ بـ + ورمز الدولة، مثل +60123456789.",
          "Enter an international number starting with + and country code, e.g. +60123456789.",
        ),
      );
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const profileFields = plan ? describeStudyDraft(plan) : {};
      const result = await api.leads.qualify({
        ...profileFields,
        name: name.trim(),
        phone: normalized,
        source: `web:${application ? "application" : "consultation"}:${(params.get("source") || "direct").slice(0, 35)}`,
        preferred_university: selectedUniversity
          ? `${selectedUniversity.name} [id:${selectedUniversity.id}]`
          : choice.trim(),
        specialization: selectedProgram
          ? `${selectedProgram.name} [id:${selectedProgram.id}]`
          : profileFields.specialization || "",
        financial_readiness: budget || profileFields.financial_readiness || "",
      });
      if (!result.ok) throw new Error("Not saved");
      setStatus("success");
      trackEvent("lead_submitted", {
        journey: application ? "application" : "consultation",
      });
    } catch {
      setStatus("error");
      setMessage(
        c(
          "لم نتمكن من تأكيد حفظ طلبك. بياناتك ما زالت هنا؛ حاول مجددًا بعد قليل.",
          "We could not confirm your request was saved. Your details are still here; please try again shortly.",
        ),
      );
      trackEvent("lead_submission_failed");
    }
  }
  if (status === "success")
    return (
      <main id="main-content" className="nu-container nu-page nu-narrow">
        <div className="nu-success" role="status">
          <span aria-hidden="true">✓</span>
          <h1>{c("وصل طلبك.", "Your request is saved.")}</h1>
          <p>
            {c(
              "سيستخدم فريق NajmUni رقمك لمتابعة طلبك ومراجعة التفاصيل معك. لا تحتاج إرسال مستندات الآن.",
              "The NajmUni team will use your number to follow up and review the details. No documents are needed now.",
            )}
          </p>
          <p>
            {c(
              "هذه خطوة لطلب المساعدة، وليست تأكيد قبول أو موعد محجوز.",
              "This is an assistance request, not an admission decision or a confirmed appointment.",
            )}
          </p>
          <Action to="/programs">
            {c("تابع استكشاف البرامج", "Keep exploring programs")}
          </Action>
        </div>
      </main>
    );
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        eyebrow={c(
          "مراجعة بشرية لخطوتك القادمة",
          "A human review of your next step",
        )}
        title={
          application
            ? c(
                "لنبدأ طلب المساعدة بالتقديم.",
                "Let’s start your application assistance request.",
              )
            : c("تحدث مع مستشار.", "Talk to an advisor.")
        }
      >
        {c(
          "اسمك ورقم تواصلك يكفيان للبدء. نراجع التفاصيل معك قبل أي تقديم رسمي.",
          "Your name and contact number are enough to start. We review the details before any official application.",
        )}
      </PageIntro>
      <div className="nu-consult-grid">
        <aside>
          <h2>{c("ماذا يحدث بعد الإرسال؟", "What happens next?")}</h2>
          <ol className="nu-simple-list">
            <li>
              {c(
                "يصل طلبك وخياراتك إلى فريق NajmUni.",
                "Your request and preferences reach the NajmUni team.",
              )}
            </li>
            <li>
              {c(
                "نتواصل على رقمك لمراجعة الشروط والتكاليف.",
                "We contact you to review requirements and costs.",
              )}
            </li>
            <li>
              {c(
                "عندما تقرر التقديم، نوضح طريقة جمع المستندات.",
                "When you decide to apply, we explain how to provide documents.",
              )}
            </li>
          </ol>
          <p className="nu-small">
            {c(
              "لا ترفع جواز سفر أو شهادة في هذه الخطوة.",
              "Do not upload a passport or certificate at this stage.",
            )}
          </p>
        </aside>
        <form className="nu-form" onSubmit={submit}>
          {(selectedUniversity || selectedProgram || plan || budget) && (
            <div className="nu-context">
              <strong>{c("مع طلبك", "Included in your request")}</strong>
              {selectedUniversity && (
                <p dir="auto">{selectedUniversity.name}</p>
              )}
              {selectedProgram && <p dir="auto">{selectedProgram.name}</p>}
              {plan && (
                <p>
                  {c(
                    "تفضيلات خطتك: المؤهل، بلد الشهادة، المجال، الميزانية ووقت البداية.",
                    "Your plan: qualification, education country, field, budget and preferred start.",
                  )}
                </p>
              )}
              {budget && <p dir="ltr">{budget}</p>}
            </div>
          )}
          <label htmlFor="contact-name">
            {c("اسمك", "Your name")}
            <input
              id="contact-name"
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label htmlFor="contact-phone">
            {c("رقم التواصل مع رمز الدولة", "Phone number with country code")}
            <input
              id="contact-phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="+60 12 345 6789"
              required
              maxLength={24}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-describedby="phone-help"
              aria-invalid={
                (status === "error" && message.includes("+")) || undefined
              }
            />
          </label>
          <small id="phone-help">
            {c(
              "استخدم رقمًا يمكن للفريق التواصل معك عليه.",
              "Use a number where our team can reach you.",
            )}
          </small>
          {!hasCatalogContext && (
            <label htmlFor="contact-choice">
              {c(
                "جامعة أو تخصص في بالك؟ (اختياري)",
                "University or program in mind? (optional)",
              )}
              <input
                id="contact-choice"
                maxLength={160}
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                placeholder={c("يمكنك تركه فارغًا", "You can leave this blank")}
              />
            </label>
          )}
          {hasCatalogContext && loading && (
            <p role="status">
              {c("نحمّل تفاصيل اختيارك…", "Loading your selection…")}
            </p>
          )}
          {invalidSelection && (
            <p role="alert">
              {c(
                "تعذر العثور على اختيارك. ارجع للدليل واختر البرنامج مجددًا.",
                "Your selection could not be found. Please choose it again in the directory.",
              )}
            </p>
          )}
          <label className="nu-check nu-consent">
            <input type="checkbox" required />
            <span>
              {c(
                "أوافق على استخدام بياناتي للتواصل بشأن طلبي وفق ",
                "I agree to the use of my details to contact me about this request under the ",
              )}
              <Link to="/privacy" target="_blank">
                {c("بيان الخصوصية", "privacy notice")}
              </Link>
              .
            </span>
          </label>
          {message && (
            <p className="nu-error" role="alert">
              {message}
            </p>
          )}
          <button
            className="nu-button"
            type="submit"
            disabled={
              status === "loading" ||
              (hasCatalogContext && loading) ||
              invalidSelection
            }
          >
            {status === "loading"
              ? c("جاري حفظ الطلب…", "Saving your request…")
              : c("أرسل طلب المراجعة", "Send review request")}
          </button>
          <p className="nu-small">
            {c(
              "لا يترتب على هذا الطلب قبول جامعي أو التزام بالدفع.",
              "This request does not constitute admission or a payment commitment.",
            )}
          </p>
        </form>
      </div>
    </main>
  );
}
