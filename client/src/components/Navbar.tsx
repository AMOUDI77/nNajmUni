import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { usePreferences } from "../i18n";
import { useCopy } from "./public/UI";
import Logo from "./Logo";
export default function Navbar() {
  const c = useCopy();
  const { toggleLanguage, isArabic } = usePreferences();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  const links = [
    ["/universities", c("الجامعات", "Universities")],
    ["/programs", c("التخصصات", "Programs")],
    ["/budget", c("التكاليف", "Costs")],
  ];
  return (
    <header className="nu-header">
      <div className="nu-nav">
        <Link to="/" aria-label={c("نجم — الرئيسية", "NajmUni — Home")}>
          <Logo tone="dark" height={36} />
        </Link>
        <nav
          className="nu-desktop-nav"
          aria-label={c("التنقل الرئيسي", "Main navigation")}
        >
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nu-nav-actions">
          <button
            className="nu-language"
            onClick={toggleLanguage}
            lang={isArabic ? "en" : "ar"}
          >
            {isArabic ? "English" : "العربية"}
          </button>
          <Link className="nu-nav-apply" to="/apply">
            {c("جاهز للتقديم؟", "Ready to apply?")}
          </Link>
          <button
            className="nu-menu-toggle"
            ref={toggle}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={c(
              open ? "إغلاق القائمة" : "فتح القائمة",
              open ? "Close menu" : "Open menu",
            )}
            onClick={() => setOpen(!open)}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
        {open && (
          <nav
            className="nu-mobile-nav"
            id="mobile-navigation"
            aria-label={c("قائمة الجوال", "Mobile navigation")}
          >
            {[
              ...links,
              ["/study-plan", c("اكتشف خياراتي", "Explore my options")],
              ["/consultation", c("تحدث مع مستشار", "Talk to an advisor")],
              ["/apply", c("طلب مساعدة بالتقديم", "Application assistance")],
            ].map(([to, label]) => (
              <Link key={to} onClick={() => setOpen(false)} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
