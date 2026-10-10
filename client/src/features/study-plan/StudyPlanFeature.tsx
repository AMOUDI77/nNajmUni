import StudyExplorer from "./StudyExplorer";
import StudyPlanErrorBoundary from "./components/StudyPlanErrorBoundary";
export default function StudyPlanFeature() {
  return (
    <StudyPlanErrorBoundary>
      <StudyExplorer />
    </StudyPlanErrorBoundary>
  );
}
