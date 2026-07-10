import { useState } from 'react';
import { usePreferences } from '../i18n';

const WA = 'https://wa.me/601121266613?text=Hi%20NajmUni%2C%20I%27d%20like%20to%20book%20a%20free%20consultation';

const STEPS = [
  {
    num: '01',
    week: 'Week 1–2',
    title: 'Dream',
    sub: 'Define your vision',
    color: '#4F6BFF',
    gradient: 'linear-gradient(135deg, #4F6BFF 0%, #4F6BFF 100%)',
    items: ['Define your goals, field, and budget', 'We match you with the right university', 'Free 1-on-1 counselling session'],
    icon: (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    num: '02',
    week: 'Week 3–6',
    title: 'Action',
    sub: 'We handle the paperwork',
    color: '#111B3D',
    gradient: 'linear-gradient(135deg, #111B3D 0%, #3F3F46 100%)',
    items: ['Document checklist & preparation', 'Application submitted on your behalf', 'Live status updates throughout'],
    icon: (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    num: '03',
    week: 'Week 7+',
    title: 'Success',
    sub: 'Your new life begins',
    color: '#4F6BFF',
    gradient: 'linear-gradient(135deg, #4F6BFF 0%, #7B61FF 100%)',
    items: ['Offer letter secured & confirmed', 'Visa & pre-departure checklist', 'Arrival and accommodation sorted'],
    icon: (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
];

function StepCard({ step, isLast }: { step: typeof STEPS[0]; isLast: boolean }) {
  const { t } = usePreferences();
  const [hov, setHov] = useState(false);
  return (
    <div
      className="journey-step-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        background: '#fff',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: hov ? '0 20px 48px rgba(0,0,0,0.10)' : '0 2px 16px rgba(0,0,0,0.06)',
        transform: hov ? 'translateY(-8px)' : 'none',
        transition: 'all 0.32s cubic-bezier(.22,1,.36,1)',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* gradient header */}
      <div style={{ background: step.gradient, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 10, top: -10, fontSize: 96, fontWeight: 900, color: 'rgba(255,255,255,0.07)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          {step.num}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(255,255,255,0.25)' }}>
          {step.icon}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 4 }}>{step.week}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{step.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{step.sub}</div>
      </div>

      {/* content */}
      <div style={{ padding: '20px 24px 24px' }}>
        {step.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < step.items.length - 1 ? 11 : 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${step.color}12`, border: `1.5px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke={step.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.65 }}>{item}</span>
          </div>
        ))}

        <a
          href={WA}
          target="_blank"
          rel="noopener noreferrer"
          className="step-wa-btn"
          style={{
            display: 'none', // controlled by CSS
            marginTop: 18,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#4F6BFF',
            color: '#fff',
            borderRadius: 50,
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          {t('journey.bookStep')}
        </a>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="steps-connector" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 52, flexShrink: 0, width: 44 }}>
      <svg viewBox="0 0 44 16" width={44} height={16} fill="none">
        <line x1="0" y1="8" x2="34" y2="8" stroke="#D8DEFF" strokeWidth="1.5" strokeDasharray="4 3"/>
        <path d="M30 2 L40 8 L30 14" stroke="#D8DEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function VConnector() {
  return (
    <div className="step-vconn" style={{ display: 'none', justifyContent: 'center', padding: '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 2, height: 16, background: 'linear-gradient(180deg, #D8DEFF 0%, #4F6BFF 100%)', borderRadius: 1 }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F6BFF', opacity: 0.4 }} />
        <div style={{ width: 2, height: 16, background: 'linear-gradient(180deg, #4F6BFF 0%, #D8DEFF 100%)', borderRadius: 1 }} />
      </div>
    </div>
  );
}

export default function JourneySteps() {
  const { t } = usePreferences();
  const localizedSteps = STEPS.map((step, i) => ({
    ...step,
    week: [t('journey.week1'), t('journey.week2'), t('journey.week3')][i],
    title: [t('journey.dream'), t('journey.action'), t('journey.success')][i],
    sub: [t('journey.dreamSub'), t('journey.actionSub'), t('journey.successSub')][i],
    items: [
      [t('journey.item1a'), t('journey.item1b'), t('journey.item1c')],
      [t('journey.item2a'), t('journey.item2b'), t('journey.item2c')],
      [t('journey.item3a'), t('journey.item3b'), t('journey.item3c')],
    ][i],
  }));

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .steps-grid {
            align-items: stretch !important;
            flex-direction: row !important;
            gap: 14px !important;
            margin: 0 -2px;
            overflow-x: auto !important;
            padding: 2px 2px 14px !important;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .steps-grid::-webkit-scrollbar { display: none; }
          .journey-step-card {
            flex: 0 0 min(84vw, 340px) !important;
            scroll-snap-align: start;
            transform: none !important;
          }
          .step-wa-btn,
          .step-vconn,
          .steps-connector { display: none !important; }
        }
      `}</style>

      <section className="journey-section" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)', padding: 'clamp(56px,8vw,90px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* header */}
          <div className="journey-header" style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4F6BFF', letterSpacing: '4px', textTransform: 'uppercase' }}>{t('journey.badge')}</span>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1.1, marginTop: 10, marginBottom: 14 }}>
              {t('journey.title')}
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', maxWidth: 420, margin: '0 auto', lineHeight: 1.75 }}>
              {t('journey.copy')}
            </p>
          </div>

          {/* steps */}
          <div className="steps-grid" style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {localizedSteps.map((step, i) => (
              <div key={step.num} style={{ display: 'contents' }}>
                <StepCard step={step} isLast={i === STEPS.length - 1} />
                {i < STEPS.length - 1 && (
                  <>
                    <Arrow />
                    <VConnector />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* bottom CTAs */}
          <div className="journey-cta-row" style={{ textAlign: 'center', marginTop: 48, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: '#4F6BFF', color: '#fff', borderRadius: 16,
                padding: '15px 34px', fontSize: 15, fontWeight: 700,
                border: 'none', cursor: 'pointer', letterSpacing: '-0.2px',
                textDecoration: 'none',
                boxShadow: '0 10px 26px rgba(79,107,255,0.22)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px rgba(79,107,255,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 26px rgba(79,107,255,0.22)'; }}
            >
              {t('journey.bookWa')}
            </a>
            <button
              onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: '#fff', color: '#111B3D', border: '1.5px solid #E4E4E7',
                borderRadius: 16, padding: '14px 30px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.18s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
            >
              {t('journey.bookForm')}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

