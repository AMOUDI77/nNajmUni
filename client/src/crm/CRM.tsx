import { useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { CRMProvider, useCRM } from "./context";
import { ErrorBanner, Icon, Skeleton } from "./components";
import Inbox from "./inbox/Inbox";
import Contacts from "./contacts/Contacts";
import Automations from "./automations/Automations";
import Analytics from "./pages/Analytics";
import Settings from "./settings/Settings";
import "./crm.css";
import "./crm-pages.css";

function Login() {
  const { login, ar } = useCRM();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="crm-login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login(email, password);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <img src="/logo.png" alt="NajmUni" />
        <span className="crm-eyebrow">NAJMUNI CRM</span>
        <h1>{ar ? "مرحباً بعودتك" : "Welcome back"}</h1>
        <p>
          {ar
            ? "كل محادثة بداية لمستقبل جديد."
            : "Every conversation is the start of a student journey."}
        </p>
        <ErrorBanner message={error} />
        <label>
          {ar ? "البريد الإلكتروني" : "Work email"}
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
        </label>
        <label>
          {ar ? "كلمة المرور" : "Password"}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </label>
        <button className="crm-primary" disabled={busy}>
          {busy ? "Signing in…" : ar ? "تسجيل الدخول" : "Sign in"}
        </button>
        <small>Private workspace · NajmUni counselors</small>
      </form>
    </main>
  );
}
function Shell() {
  const { user, loading, error, logout, ar, toggleLanguage } = useCRM();
  const location = useLocation();
  const [actionError, setActionError] = useState("");
  if (loading)
    return (
      <div className="crm">
        <Skeleton />
      </div>
    );
  if (!user)
    return (
      <div className="crm" dir={ar ? "rtl" : "ltr"}>
        <ErrorBanner message={error} />
        <Login />
      </div>
    );
  if (location.pathname === "/crm/login")
    return <Navigate to="/crm/inbox" replace />;
  const nav = [
    ["inbox", "Inbox", "المحادثات"],
    ["automations", "Automations", "الأتمتة"],
    ["contacts", "CRM", "إدارة الطلاب"],
    ["analytics", "Analytics", "التحليلات"],
    ["settings", "Settings", "الإعدادات"],
  ];
  return (
    <div className="crm crm-shell" dir={ar ? "rtl" : "ltr"}>
      <nav className="crm-rail" aria-label="CRM navigation">
        <a href="/" className="crm-brand" title="NajmUni home">
          <img src="/logo.png" alt="NajmUni" />
        </a>
        {nav.map(([path, en, arabic]) => (
          <NavLink
            key={path}
            to={"/crm/" + path}
            title={ar ? arabic : en}
            aria-label={ar ? arabic : en}
          >
            <Icon name={path} />
            <span>{ar ? arabic : en}</span>
          </NavLink>
        ))}
        <div className="crm-rail-bottom">
          <button onClick={toggleLanguage} title="Change language">
            {ar ? "EN" : "ع"}
          </button>
          <button
            title={`Sign out ${user.full_name}`}
            aria-label="Sign out"
            onClick={() => logout().catch((e) => setActionError(e.message))}
          >
            {user.full_name[0]}
          </button>
        </div>
      </nav>
      <div className="crm-workspace">
        <ErrorBanner message={actionError} />
        <Routes>
          <Route index element={<Navigate to="inbox" replace />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="inbox/:conversationId" element={<Inbox />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/:contactId" element={<Contacts />} />
          <Route path="automations" element={<Automations />} />
          <Route path="automations/:automationId" element={<Automations />} />
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="knowledge"
            element={<Navigate to="/crm/settings/knowledge" replace />}
          />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/:section" element={<Settings />} />
          <Route path="*" element={<Navigate to="/crm/inbox" replace />} />
        </Routes>
      </div>
    </div>
  );
}
export default function CRM() {
  return (
    <CRMProvider>
      <Shell />
    </CRMProvider>
  );
}
