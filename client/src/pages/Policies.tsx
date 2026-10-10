import { Link, useLocation } from "react-router-dom";
import { PageIntro, useCopy } from "../components/public/UI";
export default function Policies() {
  const c = useCopy();
  const privacy = useLocation().pathname === "/privacy";
  const rows = privacy
    ? [
        [
          c("البيانات التي ترسلها", "Information you submit"),
          c(
            "يتلقى نموذج طلب المساعدة اسمك ورقم هاتفك واختيارات الجامعة أو البرنامج، وتفضيلات خطتك أو ميزانيتك عند إرفاقها بالطلب. لا يطلب النموذج مستندات أو بيانات دفع.",
            "The assistance form receives your name, phone number, chosen university or program, and plan or budget preferences included with the request. It does not ask for documents or payment details.",
          ),
        ],
        [
          c("الغرض من استخدامها", "How it is used"),
          c(
            "تُحفظ الطلبات في نظام NajmUni ليتمكن الفريق من متابعة استفسارك ومراجعة خياراتك. قد تُرسل إشعارات بالطلب إلى الفريق عبر خدمة البريد عند تفعيلها.",
            "Requests are saved in NajmUni’s system so the team can follow up and review your options. Request notifications may be sent to the team through the email service when enabled.",
          ),
        ],
        [
          c("البيانات في متصفحك", "Data in your browser"),
          c(
            "نحفظ اختيار اللغة ومسودة الخطة الدراسية في متصفحك لاستكمالها. يمكنك مسح المسودة من صفحة الخطة أو حذف بيانات الموقع من إعدادات المتصفح. لا ترسل الخطة ضمن طلب تواصل إلا عند طلب مراجعتها.",
            "Your language and study-plan draft are saved in your browser. Clear the draft on the study-plan page or remove site data in your browser settings. Your plan is included in a contact request only when you request a review.",
          ),
        ],
        [
          c(
            "الاستفسار أو التصحيح أو الحذف",
            "Questions, corrections or deletion",
          ),
          c(
            "تواصل مع فريق NajmUni لطلب معلومات عن بياناتك أو تصحيحها أو حذفها. لا ترسل مستندات حساسة ضمن الاستفسار.",
            "Contact the NajmUni team to ask about your data or request correction or deletion. Do not include sensitive documents in the inquiry.",
          ),
        ],
      ]
    : [
        [
          c("طبيعة المعلومات", "Nature of the information"),
          c(
            "الدليل والخطة والحاسبة أدوات استرشادية. البيانات التي لا تحمل تحققًا حديثًا تحتاج مراجعة الجامعة. الخطة لا تصدر قرار أهلية أو تضمن قبولًا أو تأشيرة.",
            "The directory, plan and calculator are guidance tools. Information without recent verification requires university confirmation. The plan does not determine eligibility or guarantee admission or a visa.",
          ),
        ],
        [
          c(
            "طلب المساعدة والتقديم الرسمي",
            "Assistance and official applications",
          ),
          c(
            "إرسال نموذج التواصل يطلب متابعة من الفريق فقط. التقديم الرسمي وجمع المستندات يأتيان بعد مراجعة المتطلبات والرسوم وطريقة الإرسال معك.",
            "Submitting a contact form requests follow-up only. Official applications and document collection follow a review of requirements, fees and submission arrangements.",
          ),
        ],
        [
          c("الرسوم والمواعيد", "Fees and dates"),
          c(
            "الأرقام الاسترشادية قد لا تشمل التأمين والتأشيرة والتأمينات والرسوم الإضافية. اطلب تأكيدًا مكتوبًا للتكاليف والمواعيد قبل الالتزام.",
            "Planning figures may exclude insurance, visa, deposits and additional charges. Ask for written confirmation of costs and dates before committing.",
          ),
        ],
      ];
  return (
    <main id="main-content" className="nu-container nu-page nu-narrow">
      <PageIntro
        title={
          privacy
            ? c("بيان الخصوصية", "Privacy notice")
            : c("شروط استخدام الموقع", "Website terms")
        }
      />
      {rows.map(([title, copy]) => (
        <section className="nu-policy" key={title}>
          <h2>{title}</h2>
          <p>{copy}</p>
        </section>
      ))}
      <a
        className="nu-text-link"
        href="https://www.instagram.com/najm.uni/"
        target="_blank"
        rel="noreferrer"
      >
        {c(
          "تواصل مع فريق NajmUni عبر إنستغرام",
          "Contact the NajmUni team on Instagram",
        )}{" "}
        ↗
      </a>
      <p className="nu-small">
        <Link to="/">{c("العودة للرئيسية", "Back to home")}</Link>
      </p>
    </main>
  );
}
