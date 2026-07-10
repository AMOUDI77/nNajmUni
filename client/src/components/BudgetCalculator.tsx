import { useState, useEffect, useRef } from 'react';
import { C } from '../styles/theme';
import { usePreferences, type TranslationKey } from '../i18n';

const PURPLE     = '#4F6BFF';
const PURPLE_LT  = '#F3F5FF';
const BORDER     = '#E5E7EB';
const BORDER_ACT = '#D8DEFF';
const MUTED      = '#6B7280';
const TEXT       = '#111827';
const CARD       = '#FFFFFF';

type Opt = { value: string; label: string; sub: string; tuition?: number; monthly?: number };
type RawOpt = { value: string; labelKey: TranslationKey; subKey: TranslationKey; tuition?: number; monthly?: number };

const uniTypes: RawOpt[] = [
  { value: 'public',         labelKey: 'budget.public',  subKey: 'budget.publicSub',  tuition: 20000 },
  { value: 'private',        labelKey: 'budget.private', subKey: 'budget.privateSub', tuition: 35000 },
  { value: 'foreign_branch', labelKey: 'budget.branch',  subKey: 'budget.branchSub',  tuition: 50000 },
];
const accommodations: RawOpt[] = [
  { value: 'hostel', labelKey: 'budget.hostel', subKey: 'budget.hostelSub', monthly: 350 },
  { value: 'shared', labelKey: 'budget.shared', subKey: 'budget.sharedSub', monthly: 600 },
  { value: 'studio', labelKey: 'budget.studio', subKey: 'budget.studioSub', monthly: 1100 },
];
const lifestyles: RawOpt[] = [
  { value: 'frugal',   labelKey: 'budget.frugal',   subKey: 'budget.frugalSub',   monthly: 800 },
  { value: 'moderate', labelKey: 'budget.moderate', subKey: 'budget.moderateSub', monthly: 1400 },
  { value: 'lavish',   labelKey: 'budget.lavish',   subKey: 'budget.lavishSub',   monthly: 2400 },
];

function ChevDown({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function FloatSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value)!;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 7, letterSpacing: '0.2px' }}>
        {label}
      </label>

      {/* trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `1px solid ${open ? BORDER_ACT : BORDER}`,
          background: CARD, color: TEXT,
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, textAlign: 'left',
          transition: 'border-color 0.2s', outline: 'none',
          fontFamily: 'Inter, sans-serif',
          boxShadow: open ? `0 0 0 3px ${PURPLE}18` : 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.label}
        </span>
        <ChevDown open={open} />
      </button>

      {/* floating dropdown — matches Smart Comparison style */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          zIndex: 200,
          background: CARD, borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          animation: 'dropFadeIn 0.18s cubic-bezier(.22,1,.36,1)',
        }}>
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderTop: i > 0 ? `1px solid #F3F4F6` : 'none',
                  border: 'none',
                  background: isSelected ? PURPLE_LT : CARD,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  transition: 'background 0.12s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F9F5FF'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = CARD; }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? PURPLE : TEXT, lineHeight: 1.3 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: isSelected ? `${PURPLE}90` : '#9CA3AF', marginTop: 3, lineHeight: 1.4 }}>
                    {opt.sub}
                  </div>
                </div>
                {isSelected && <CheckMark />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BudgetCalculator() {
  const { t } = usePreferences();
  const localizeOptions = (options: RawOpt[]): Opt[] => options.map(opt => ({
    value: opt.value,
    label: t(opt.labelKey),
    sub: t(opt.subKey),
    tuition: opt.tuition,
    monthly: opt.monthly,
  }));
  const uniTypeOptions = localizeOptions(uniTypes);
  const accommodationOptions = localizeOptions(accommodations);
  const lifestyleOptions = localizeOptions(lifestyles);

  const [uniType, setUniType] = useState(uniTypes[1].value);
  const [accom,   setAccom]   = useState(accommodations[0].value);
  const [life,    setLife]    = useState(lifestyles[1].value);

  const tuition      = uniTypeOptions.find(u => u.value === uniType)!.tuition ?? 0;
  const accomItem    = accommodationOptions.find(a => a.value === accom)!;
  const lifeItem     = lifestyleOptions.find(l => l.value === life)!;
  const totalMonthly = (accomItem.monthly ?? 0) + (lifeItem.monthly ?? 0);
  const totalYearly  = tuition + totalMonthly * 12;

  return (
    <section style={{ padding: 'clamp(60px,8vw,80px) clamp(20px,4vw,40px)', maxWidth: 1200, margin: '0 auto' }} id="calculator">
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: TEXT, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
          {t('budget.titleA')} <span style={{ color: C.purpleMid }}>{t('budget.titleB')}</span>
        </h2>
        <p style={{ fontSize: 16, color: MUTED, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          {t('budget.copy')}
        </p>
      </div>

      <div className="budget-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 32, alignItems: 'stretch' }}>
        {/* Selectors */}
        <div className="budget-card budget-selector-card" style={{ background: CARD, borderRadius: 24, padding: 'clamp(24px,4vw,36px)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, minHeight: 442, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gap: 20, flex: 1, alignContent: 'center' }}>
            <FloatSelect label={t('budget.uniType')}  value={uniType} onChange={setUniType} options={uniTypeOptions} />
            <FloatSelect label={t('budget.accommodation')}    value={accom}   onChange={setAccom}   options={accommodationOptions} />
            <FloatSelect label={t('budget.lifestyle')}        value={life}    onChange={setLife}    options={lifestyleOptions} />
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginTop: 22 }}>
            {t('budget.note')}
          </p>
        </div>

        {/* Results */}
        <div className="budget-result-stack" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 442, height: '100%' }}>
          <div style={{ background: 'linear-gradient(135deg, #111B3D, #4F6BFF)', borderRadius: 24, padding: 'clamp(24px,4vw,36px)', boxShadow: '0 24px 60px rgba(8,19,49,0.16)', flex: '1 1 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {[
              { label: t('budget.tuition'), value: `RM ${tuition.toLocaleString()}` },
              { label: t('budget.living'), value: `RM ${totalMonthly.toLocaleString()}` },
              { label: t('budget.total'), value: `RM ${totalYearly.toLocaleString()}`, big: true },
            ].map(({ label, value, big }) => (
              <div key={label} className="budget-result-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: big ? 26 : 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="budget-card" style={{ background: CARD, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, flex: '0 0 auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 14 }}>{t('budget.included')}</div>
            {[
              { icon: '🎓', text: t('budget.includedTuition') },
              { icon: '🏠', text: `${accomItem.label} - RM ${accomItem.monthly!.toLocaleString()} / ${t('budget.perMonth')}` },
              { icon: '🍽️', text: `${lifeItem.label} ${t('budget.lifestyleLabel')} - RM ${lifeItem.monthly!.toLocaleString()} / ${t('budget.perMonth')}` },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, color: MUTED }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

