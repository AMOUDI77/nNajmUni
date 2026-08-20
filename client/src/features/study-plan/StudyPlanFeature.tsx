import { Navigate, Route, Routes } from 'react-router-dom';
import StudyPlanErrorBoundary from './components/StudyPlanErrorBoundary';
import { StudyPlanProvider } from './hooks/StudyPlanContext';
import StudyPlanLanding from './pages/StudyPlanLanding';
import StudyPlanQuestionnaire from './pages/StudyPlanQuestionnaire';
import StudyPlanSummary from './pages/StudyPlanSummary';
import StudyPlanResultPage from './pages/StudyPlanResultPage';
import './study-plan.css';

export default function StudyPlanFeature() {
  return <StudyPlanErrorBoundary><StudyPlanProvider><Routes>
    <Route index element={<StudyPlanLanding />} />
    <Route path="questions" element={<StudyPlanQuestionnaire />} />
    <Route path="summary" element={<StudyPlanSummary />} />
    <Route path="result" element={<StudyPlanResultPage />} />
    <Route path="*" element={<Navigate to="/study-plan" replace />} />
  </Routes></StudyPlanProvider></StudyPlanErrorBoundary>;
}
