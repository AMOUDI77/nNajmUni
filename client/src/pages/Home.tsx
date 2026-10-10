import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import BudgetCalculator from "../components/BudgetCalculator";
import { Action, useCopy } from "../components/public/UI";
import { useCatalog } from "../hooks/useCatalog";
export default function Home() {
  const c = useCopy();
  const { universities } = useCatalog();
  const selected = universities
    .filter((u) => ["APU", "MMU", "UM", "UTAR"].includes(u.abbr))
    .slice(0, 4);
  const faq = [
    [
      c(
        "هل الخطة تعني أن قبولي مضمون؟",
        "Does a study plan guarantee admission?",
      ),
      c(
        "لا. تعرض الخطة برامج مرتبطة بمجالك. شهادتك ومتطلبات البرنامج تحتاج مراجعة، والقرار النهائي للجامعة.",
        "No. The plan shows programs in your field. Your qualification and requirements need review; the university makes the admission decision.",
      ),
    ],
    [
      c("هل أحتاج جواز سفر للبدء؟", "Do I need a passport to start?"),
      c(
        "استكشف الخيارات واطلب المساعدة دون مستندات. عند بدء التقديم الفعلي، يوضح المستشار المستندات وطريقة إرسالها.",
        "Explore and request assistance without documents. When you proceed, an advisor explains what is needed and how to submit it.",
      ),
    ],
    [
      c("ماذا تشمل التكاليف؟", "What do costs include?"),
      c(
        "نفصل الرسوم والسكن والمعيشة. التأشيرة والتأمين والرسوم الأخرى تحتاج عرضًا مؤكدًا حسب حالتك.",
        "We separate tuition, housing and living. Visa, insurance and other charges need confirmation for your circumstances.",
      ),
    ],
    [
      c("هل توجد رسوم لخدماتكم؟", "Are there fees for your services?"),
      c(
        "استكشاف الدليل والخطة على الموقع مجاني. اطلب توضيح أي رسوم للخدمات وإجراءات الجامعة قبل الموافقة أو الدفع.",
        "The directory and plan are free to explore. Confirm any service and university processing fees before agreeing or paying.",
      ),
    ],
  ];
  return (
    <main id="main-content">
      <Hero />
      <section className="nu-container nu-section">
        <div className="nu-section-heading">
          <div>
            <span className="nu-eyebrow">
              {c("خيارات تستحق الاستكشاف", "Start exploring")}
            </span>
            <h2>
              {c("ابدأ بالمجال الذي يهمك.", "Find a field that interests you.")}
            </h2>
          </div>
          <Link className="nu-text-link" to="/programs">
            {c("كل البرامج", "All programs")} ↗
          </Link>
        </div>
        <div className="nu-fields">
          {[
            ["Technology", c("التقنية والحاسب", "Technology")],
            ["Business", c("إدارة الأعمال", "Business")],
            ["Engineering", c("الهندسة", "Engineering")],
            ["Medicine", c("العلوم الصحية", "Health sciences")],
          ].map(([field, label], i) => (
            <Link to={`/programs?field=${field}`} key={field}>
              <span className="nu-meta">0{i + 1}</span>
              <h3>{label}</h3>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
        <div className="nu-university-strip">
          <span>{c("من الجامعات في دليلنا", "From our directory")}</span>
          {selected.map((u) => (
            <Link key={u.id} to={`/universities/${u.id}`} title={u.name}>
              {u.abbr}
            </Link>
          ))}
          <Link className="nu-text-link" to="/universities">
            {c("استكشف الجامعات", "Explore universities")} ↗
          </Link>
        </div>
      </section>
      <section className="nu-budget-band">
        <div className="nu-container">
          <BudgetCalculator />
        </div>
      </section>
      <section className="nu-container nu-section" id="services">
        <span className="nu-eyebrow">
          {c("دعم بشري، في الوقت المناسب", "Human support, when it matters")}
        </span>
        <h2>
          {c(
            "من أول سؤال، إلى الخطوة التالية.",
            "From your first question to your next step.",
          )}
        </h2>
        <ol className="nu-steps">
          {[
            [
              c("نفهم خياراتك", "Explore your options"),
              c(
                "مؤهلك واهتماماتك وميزانيتك نقطة البداية.",
                "Start with your qualifications, interests and budget.",
              ),
            ],
            [
              c("نراجع التفاصيل معك", "Review the details"),
              c(
                "نتحقق من الشروط والرسوم والمواعيد قبل التقديم.",
                "Review requirements, fees and dates before applying.",
              ),
            ],
            [
              c(
                "نرتب خطوات التقديم والوصول",
                "Plan your application and arrival",
              ),
              c(
                "إرشاد للمستندات، ثم التأشيرة والسكن بحسب احتياجك.",
                "Guidance on documents, visa and housing for your needs.",
              ),
            ],
          ].map(([title, copy], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
        <div className="nu-trust-note">
          <strong>
            {c("وضوح قبل أي التزام.", "Clarity before commitment.")}
          </strong>
          <p>
            {c(
              "نوضح لك ما يحتاج تأكيدًا. طلب المساعدة ليس طلب قبول رسميًا، والجامعة هي من تتخذ قرار القبول.",
              "We make clear what requires confirmation. An assistance request is not an official application; admission decisions belong to universities.",
            )}
          </p>
          <Link className="nu-text-link" to="/privacy">
            {c("كيف نستخدم بياناتك", "How we use your data")} ↗
          </Link>
        </div>
      </section>
      <section className="nu-container nu-section nu-faq" id="faq">
        <div>
          <span className="nu-eyebrow">
            {c("قبل أن تبدأ", "Before you begin")}
          </span>
          <h2>{c("أسئلة في بالك؟", "Questions on your mind?")}</h2>
        </div>
        <div>
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="nu-container nu-final" id="cta">
        <div>
          <h2>{c("لنرتب خطوتك القادمة.", "Let’s plan your next step.")}</h2>
          <p>
            {c(
              "شاركنا ما تحتاجه، ونراجع الخيارات معك.",
              "Tell us what you need and we’ll review your options with you.",
            )}
          </p>
        </div>
        <Action to="/consultation">
          {c("اطلب مراجعة مستشار", "Request an advisor review")}
        </Action>
      </section>
    </main>
  );
}
