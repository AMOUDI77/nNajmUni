import { useCopy } from '../../../copy';
import { ReactNode } from 'react';

export default function StudyPlanShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { tr, language: copyLanguage } = useCopy();
  return <main className={`sp-shell${compact ? ' sp-shell-compact' : ''}`} dir={copyLanguage === "ar" ? "rtl" : "ltr"}><div className="sp-orb sp-orb-one" /><div className="sp-orb sp-orb-two" />{tr(children)}</main>;
}
