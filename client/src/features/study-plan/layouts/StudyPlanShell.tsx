import { ReactNode } from 'react';

export default function StudyPlanShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <main className={`sp-shell${compact ? ' sp-shell-compact' : ''}`} dir="rtl"><div className="sp-orb sp-orb-one" /><div className="sp-orb sp-orb-two" />{children}</main>;
}
