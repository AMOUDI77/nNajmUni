import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppFAB from './components/WhatsAppFAB';
import Home from './pages/Home';

const Universities    = lazy(() => import('./pages/Universities'));
const UniversityDetail = lazy(() => import('./pages/UniversityDetail'));
const Institutes      = lazy(() => import('./pages/Institutes'));
const Programs        = lazy(() => import('./pages/Programs'));
const Admin           = lazy(() => import('./pages/Admin'));
const Students        = lazy(() => import('./pages/Students'));
const CRM             = lazy(() => import('./crm/CRM'));
const StudyPlan       = lazy(() => import('./features/study-plan/StudyPlanFeature'));

function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #F3F5FF', borderTopColor: '#4F6BFF', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function RouteScroller() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname === '/students' || pathname === '/student' || pathname === '/crm' || pathname.startsWith('/crm/');

  return (
    <>
      <RouteScroller />
      {!isAdmin && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                 element={<Home />} />
          <Route path="/universities"     element={<Universities />} />
          <Route path="/universities/:id" element={<UniversityDetail />} />
          <Route path="/institutes"       element={<Institutes />} />
          <Route path="/programs"         element={<Programs />} />
          <Route path="/study-plan/*"     element={<StudyPlan />} />
          <Route path="/admin"            element={<Admin />} />
          <Route path="/student"          element={<Navigate to="/students" replace />} />
          <Route path="/students"         element={<Students />} />
          <Route path="/crm/*"            element={<CRM />} />
        </Routes>
      </Suspense>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppFAB />}
    </>
  );
}

