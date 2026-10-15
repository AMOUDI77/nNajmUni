import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { track, whatsappUrl, applicationMessage, whatsappMessageUrl } from "../discovery";
import AdvisorLink from "../components/AdvisorLink";
export default function ApplicationAssistance() {
  const [params] = useSearchParams();
  const advisor = params.get("intent") === "consultation";
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const [handoff, setHandoff] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    track(
      advisor ? "consultation_requested" : "application_assistance_started",
    );
  }, [advisor]);
  return (
    <main className="student-page student-form-page" dir="rtl">
      <header>
        <p className="student-eyebrow">خطوة أولى بسيطة</p>
        <h1>{advisor ? "اطلب تواصل مستشار" : "يلا ابدأ قبولك"}</h1>
        <p>
          أرسل بيانات التواصل وما تعرفه عن خطتك. يراجعها مستشار معك قبل أي تقديم
          رسمي أو طلب مستندات.
        </p>
      </header>
      {done ? (
        <section className="student-card" role="status">
          <h2>تم حفظ طلبك وتجهيز رسالة واتساب</h2>
          <p>
            اضغط «إرسال» داخل واتساب لإرسال التفاصيل إلى Najmuni. هذا طلب مساعدة وليس تقديمًا رسميًا للجامعة.
          </p>
          <pre style={{whiteSpace:'pre-wrap',font:'inherit',marginBlock:20}}>{message}</pre>
          <a className="student-button" href={handoff} onClick={() => track('whatsapp_handoff_clicked')}>فتح رسالة الطلب في واتساب</a>
        </section>
      ) : (
        <form
          className="student-card student-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current) return;
            const data = new FormData(e.currentTarget);
            const phone = String(data.get("phone")).replace(/[\s()-]/g, "");
            if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
              setError("أدخل رقمًا صحيحًا مع رمز الدولة.");
              return;
            }
            if (!String(data.get("name")).trim()) {
              setError("أدخل اسمك.");
              return;
            }
            lock.current = true;
            setBusy(true);
            setError("");
            const prepared = applicationMessage({
              name: String(data.get('name')).trim(), phone,
              qualification: String(data.get('qualification')).trim(),
              university: String(data.get('university')).trim(),
              program: String(data.get('program')).trim(),
              level: params.get('level') || '',
              preferredStart: String(data.get('start')).trim(),
            });
            const destination = whatsappMessageUrl(prepared);
            setMessage(prepared);
            setHandoff(destination || '');
            try {
              const result = await api.leads.qualify({
                name: String(data.get("name")).trim(),
                phone,
                qualification: String(data.get("qualification")),
                preferred_university: String(data.get("university")),
                specialization: String(data.get("program")),
                study_level: params.get("level") || "",
                preferred_start: String(data.get("start")),
                source: advisor ? "advisor-request" : "application-assistance",
              });
              if (!result.ok) throw new Error();
              setDone(true);
              track("application_assistance_submitted");
              if (destination) {
                track('whatsapp_handoff_clicked');
                window.location.assign(destination);
              }
            } catch {
              setError(
                "تعذر حفظ نسخة من الطلب في الموقع. بياناتك ما زالت هنا؛ يمكنك إرسالها مباشرة عبر واتساب أو إعادة المحاولة.",
              );
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          <label>
            الاسم الكامل
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label>
            رقم واتساب مع رمز الدولة
            <input
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="+رمز الدولة ثم الرقم"
              required
              maxLength={20}
            />
          </label>
          <label>
            المؤهل الدراسي (اختياري)
            <select name="qualification">
              <option value="">اختر مؤهلك</option>
              <option>ثانوية</option>
              <option>دبلوم</option>
              <option>بكالوريوس</option>
              <option>ماجستير</option>
              <option>غير ذلك</option>
            </select>
          </label>
          <label>
            الجامعة أو المعهد (اختياري)
            <input
              name="university"
              defaultValue={params.get("university") || ""}
              maxLength={160}
            />
          </label>
          <label>
            التخصص (اختياري)
            <input
              name="program"
              defaultValue={params.get("program") || ""}
              maxLength={160}
            />
          </label>
          <label>
            موعد البداية المفضل (اختياري)
            <input
              name="start"
              placeholder="مثلاً: بداية السنة القادمة"
              maxLength={160}
            />
          </label>
          <label className="student-consent">
            <input type="checkbox" required />
            أوافق على استخدام بياناتي للتواصل معي بخصوص هذا الطلب.
          </label>
          <p>سنحفظ طلبك ونفتح واتساب برسالة تضم بيانات النموذج. راجعها واضغط «إرسال» هناك. لا تحتاج لرفع مستندات الآن.</p>
          {error && (
            <p role="alert" className="student-notice">
              {error}
              {handoff && <a className="student-button secondary" href={handoff} onClick={() => track('whatsapp_handoff_clicked')}>متابعة الطلب عبر واتساب</a>}
            </p>
          )}
          <button disabled={busy} className="student-button">
            {busy ? "جارٍ تجهيز طلبك…" : "أرسل طلبك عبر واتساب"}
          </button>
        </form>
      )}
      <p>
        تفضل حجز موعد؟ <a href="/consultation">احجز استشارة</a>
      </p>
      {whatsappUrl() && <AdvisorLink
        context={{
          university: params.get("university") || undefined,
          program: params.get("program") || undefined,
        }}
      />}
    </main>
  );
}
