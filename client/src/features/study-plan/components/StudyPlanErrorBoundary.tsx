import { Component, ErrorInfo, ReactNode } from 'react';
import { useCopy } from '../../../copy';

function ErrorMessage() {
  const { tr, language } = useCopy();
  return <main className="sp-error" dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <div className="sp-card"><span className="sp-kicker">{tr('NajmUni Study Plan')}</span><h1>{tr('صار خطأ بسيط')}</h1>
      <p>{tr('بياناتك محفوظة. حدّث الصفحة وحاول مرة ثانية.')}</p>
      <button className="sp-button" onClick={() => window.location.reload()}>{tr('تحديث الصفحة')}</button>
    </div>
  </main>;
}

export default class StudyPlanErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Study Plan isolated error', error, info); }
  render() {
    if (this.state.failed) return <ErrorMessage />;
    return this.props.children;
  }
}
