import { memo } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { usePreferences } from '../i18n';

const BRAND = '#4F6BFF';

const stats = [
  {
    val: '12,400+', labelKey: 'stats.students' as const,
    icon: <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={BRAND} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    val: '98%', labelKey: 'stats.success' as const,
    icon: <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={BRAND} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  },
  {
    val: '40+', labelKey: 'stats.partners' as const,
    icon: <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={BRAND} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    val: '15+', labelKey: 'stats.countries' as const,
    icon: <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={BRAND} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  },
];

const StatItem = memo(function StatItem({ val, label, icon, delay }: { val: string; label: string; icon: React.ReactNode; delay: number }) {
  const ref = useScrollReveal({ delay, direction: 'up' });
  return (
    <div ref={ref} className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 32px', borderRight: '1px solid #F3F4F6' }}>
      <div className="stat-icon" style={{ width: 52, height: 52, borderRadius: 14, background: `${BRAND}10`, border: `1px solid ${BRAND}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div className="stat-value" style={{ fontSize: 32, fontWeight: 900, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1 }}>{val}</div>
        <div className="stat-label" style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginTop: 5, lineHeight: 1.4 }}>{label}</div>
      </div>
    </div>
  );
});

export default function StatsBar() {
  const { t } = usePreferences();

  return (
    <section className="section-pad" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="stats-inner" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '36px 0' }}>
        {stats.map((s, i) => (
          <StatItem key={i} val={s.val} icon={s.icon} label={t(s.labelKey)} delay={i * 80} />
        ))}
      </div>
    </section>
  );
}

