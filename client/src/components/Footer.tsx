import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useCopy } from "./public/UI";
export default function Footer() {
  const c = useCopy();
  return (
    <footer className="nu-footer">
      <div className="nu-container">
        <div className="nu-footer-top">
          <div>
            <Logo tone="dark" height={34} />
            <p>
              {c(
                "خطوة مدروسة نحو دراستك في ماليزيا.",
                "A considered next step toward studying in Malaysia.",
              )}
            </p>
          </div>
          <nav aria-label={c("روابط إضافية", "More links")}>
            <Link to="/institutes">
              {c("معاهد اللغة", "Language institutes")}
            </Link>
            <Link to="/consultation">{c("تواصل معنا", "Contact us")}</Link>
            <a
              href="https://www.instagram.com/najm.uni/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
          </nav>
        </div>
        <div className="nu-footer-bottom">
          <span>© {new Date().getFullYear()} NajmUni</span>
          <Link to="/privacy">{c("الخصوصية", "Privacy")}</Link>
          <Link to="/terms">{c("شروط الاستخدام", "Terms")}</Link>
        </div>
      </div>
    </footer>
  );
}
