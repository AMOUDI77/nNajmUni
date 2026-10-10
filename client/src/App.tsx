import { Suspense, lazy, useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import { PageIntro, useCopy } from "./components/public/UI";
import BudgetCalculator from "./components/BudgetCalculator";
import { trackEvent } from "./utils/analytics";

const Universities = lazy(() => import("./pages/Universities"));
const UniversityDetail = lazy(() => import("./pages/UniversityDetail"));
const Institutes = lazy(() => import("./pages/Institutes"));
const Programs = lazy(() => import("./pages/Programs"));
const Admin = lazy(() => import("./pages/Admin"));
const Students = lazy(() => import("./pages/Students"));
const CRM = lazy(() => import("./crm/CRM"));
const StudyPlan = lazy(() => import("./features/study-plan/StudyPlanFeature"));
const Consultation = lazy(() => import("./pages/Consultation"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const Policies = lazy(() => import("./pages/Policies"));
const NotFound = lazy(() => import("./pages/NotFound"));

function BudgetPage() {
  const c = useCopy();
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        title={c(
          "ميزانية أوضح، قرار أسهل.",
          "A clearer budget. An easier decision.",
        )}
      />
      <BudgetCalculator />
    </main>
  );
}

function PageLoader() {
  const c = useCopy();
  return (
    <div
      role="status"
      aria-label={c("جاري التحميل", "Loading")}
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "3px solid #F3F5FF",
          borderTopColor: "#4F6BFF",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function RouteScroller() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = window.setTimeout(() => {
        let target = hash.slice(1);
        try {
          target = decodeURIComponent(target);
        } catch {
          /* Invalid encoded fragments have no target. */
        }
        document.getElementById(target)?.scrollIntoView({ block: "start" });
      }, 100);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  const c = useCopy();
  const { pathname } = useLocation();
  const isAdmin =
    pathname === "/admin" ||
    pathname === "/students" ||
    pathname === "/student" ||
    pathname === "/crm" ||
    pathname.startsWith("/crm/");
  useEffect(() => {
    if (!isAdmin) trackEvent("page_view", { path: pathname });
  }, [pathname, isAdmin]);

  return (
    <div className={isAdmin ? undefined : "nu-site"}>
      <RouteScroller />
      {!isAdmin && (
        <a className="nu-skip" href="#main-content">
          {c("انتقل للمحتوى", "Skip to content")}
        </a>
      )}
      {!isAdmin && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/universities" element={<Universities />} />
          <Route path="/universities/:id" element={<UniversityDetail />} />
          <Route path="/institutes" element={<Institutes />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:id" element={<ProgramDetail />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/apply" element={<Consultation />} />
          <Route path="/privacy" element={<Policies />} />
          <Route path="/terms" element={<Policies />} />
          <Route path="/study-plan/*" element={<StudyPlan />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/student"
            element={<Navigate to="/students" replace />}
          />
          <Route path="/students" element={<Students />} />
          <Route path="/crm/*" element={<CRM />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isAdmin && <Footer />}
    </div>
  );
}
