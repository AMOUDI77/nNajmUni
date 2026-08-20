type Props = { name: string; size?: number; className?: string };
export default function StudyPlanIcon({ name, size = 20, className }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true };
  const paths: Record<string, JSX.Element> = {
    route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/></>,
    graduation: <><path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 11h6v4h-6a2 2 0 0 1 0-4z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 .7.7L6 5.4M4 12l.7.7L6 11.4M4 18l.7.7L6 17.4"/></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6"/></>,
    language: <><path d="M4 5h7M7.5 3v2c0 4-2 7-5 9M5 10c1 2 3 4 6 5M13 19l4-10 4 10M14.5 16h5"/></>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 2-5a7 7 0 1 1 16-2z"/></>,
    university: <><path d="m3 10 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>, arrow: <path d="M19 12H5m6-6-6 6 6 6"/>,
  };
  return <svg {...common}>{paths[name] ?? paths.file}</svg>;
}
