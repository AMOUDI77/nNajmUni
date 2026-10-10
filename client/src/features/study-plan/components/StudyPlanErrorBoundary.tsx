import { Component, ErrorInfo, ReactNode } from "react";
import { useCopy } from "../../../components/public/UI";

function ErrorView() {
  const c = useCopy();
  return (
    <main id="main-content" className="nu-container nu-page">
      <h1>{c("تعذر عرض الخطة", "Unable to display the plan")}</h1>
      <p>
        {c(
          "حاول تحديث الصفحة أو تواصل معنا لمراجعة خياراتك.",
          "Try refreshing the page or contact us to review your options.",
        )}
      </p>
      <button className="nu-button" onClick={() => window.location.reload()}>
        {c("تحديث الصفحة", "Reload page")}
      </button>
    </main>
  );
}

export default class StudyPlanErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Study Plan isolated error", error, info);
  }
  render() {
    if (this.state.failed) return <ErrorView />;
    return this.props.children;
  }
}
