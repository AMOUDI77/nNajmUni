import { Component, ErrorInfo, ReactNode } from 'react';

export default class StudyPlanErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Study Plan isolated error', error, info); }
  render() {
    if (this.state.failed) return (
      <main className="sp-error" dir="rtl">
        <div className="sp-card"><span className="sp-kicker">NajmUni Study Plan</span><h1>صار خطأ بسيط</h1>
          <p>بياناتك محفوظة. حدّث الصفحة وحاول مرة ثانية.</p>
          <button className="sp-button" onClick={() => window.location.reload()}>تحديث الصفحة</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}
