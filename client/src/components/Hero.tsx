import { Link } from "react-router-dom";
import { Action, useCopy } from "./public/UI";
export default function Hero() {
  const c = useCopy();
  return (
    <section className="nu-hero nu-container">
      <div className="nu-hero-copy">
        <span className="nu-eyebrow">
          {c("ابدأ من المكان المناسب لك", "Your next chapter starts here")}
        </span>
        <h1>
          {c("دراستك في ماليزيا،", "Your studies in Malaysia,")}
          <br />
          <em>{c("بخطوات أوضح.", "one clear step at a time.")}</em>
        </h1>
        <p>
          {c(
            "نساعدك تختار الجامعة والتخصص المناسبين لمؤهلاتك وميزانيتك، ونوضح لك التكاليف والخطوات من القبول حتى الوصول.",
            "Explore universities and programs for your qualifications and budget. Understand the costs and the steps from application to arrival.",
          )}
        </p>
        <div className="nu-actions">
          <Action to="/study-plan/questions">
            {c("اكتشف خياراتي الدراسية", "Explore my study options")}
          </Action>
          <Link className="nu-text-link" to="/consultation">
            {c("تحدث مع مستشار", "Talk to an advisor")}
          </Link>
        </div>
        <span className="nu-meta">
          {c(
            "استكشاف مجاني · بدون تسجيل أو رفع مستندات",
            "Free to explore · No account or documents needed",
          )}
        </span>
      </div>
      <div className="nu-hero-art">
        <span className="nu-art-label">
          MALAYSIA <span>03°08′ N · 101°41′ E</span>
        </span>
        <img
          src="/twn.png"
          alt=""
          width="560"
          height="650"
          fetchPriority="high"
        />
        <div className="nu-art-caption">
          <span>{c("مساحة لطموحك.", "Room for your ambition.")}</span>
          <small>{c("والبداية من هنا.", "Your journey starts here.")}</small>
        </div>
      </div>
      <div className="nu-ready-line">
        <span>
          {c(
            "اخترت جامعتك أو تخصصك بالفعل؟",
            "Already have a university or program in mind?",
          )}
        </span>
        <Link to="/apply">
          {c("اطلب مساعدة بالتقديم", "Request application assistance")} ↗
        </Link>
      </div>
    </section>
  );
}
