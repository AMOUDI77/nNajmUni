import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, gradientMid } from '../styles/theme';
import { usePreferences } from '../i18n';

function PhoneIcon({ color = '#94A3B8' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default function Hero() {
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { t } = usePreferences();

  const handleSubmit = () => {
    window.location.assign('https://www.instagram.com/najm.uni/');
  };

  return (
    <section className="hero-section" style={{
      maxWidth: 1440,
      margin: '0 auto',
      padding: '96px clamp(20px,4vw,40px) 48px',
    }}>
      <div className="hero-wrap" style={{
        position: 'relative',
        minHeight: 520,
        borderRadius: 30,
        overflow: 'hidden',
        padding: '84px clamp(32px,5vw,68px) 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'radial-gradient(circle at 78% 18%, rgba(79,107,255,0.44), transparent 34%), linear-gradient(116deg, #101216 0%, #151922 48%, #075BD7 100%)',
        boxShadow: '0 36px 90px rgba(8,19,49,0.22)',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1.5px)',
          backgroundSize: '26px 26px',
          opacity: 0.35,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          right: -160,
          top: -130,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,107,255,0.32), transparent 62%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }} />

        <div className="hero-copy-col" style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 670,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <h1 className="hero-title" style={{
            fontSize: 'clamp(46px,6vw,80px)',
            lineHeight: 1.08,
            letterSpacing: '-1.8px',
            color: '#fff',
            fontWeight: 900,
            marginBottom: 22,
          }}>
            {t('hero.titleA')}{' '}
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #4F8CFF 0%, #7B61FF 100%)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>{t('hero.titleAccent')}</span>
            <br />{t('hero.titleB')}
          </h1>

          <p className="hero-copy" style={{ fontSize: 18, lineHeight: 1.72, color: 'rgba(255,255,255,0.74)', maxWidth: 600, marginBottom: 30 }}>
            {t('hero.copy')}
          </p>

            <div className="hero-cta hero-cta-row" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: 'min(100%, 480px)',
              padding: 10,
              paddingInlineStart: 20,
              borderRadius: 22,
              background: '#fff',
              boxShadow: '0 22px 55px rgba(0,0,0,0.22)',
            }}>
              <span style={{ fontSize: 16, color: C.text, flex: 1, fontWeight: 700 }}>راسلنا على إنستغرام</span>
              <button onClick={handleSubmit} style={{
                background: gradientMid,
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 30px',
                fontSize: 15,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 14px 28px rgba(79,107,255,0.28)',
                whiteSpace: 'nowrap',
              }}>{t('hero.started')}</button>
            </div>

          <div className="hero-actions" style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 24, color: 'rgba(255,255,255,0.58)' }}>
            <button
              className="hero-secondary-btn"
              type="button"
              onClick={() => navigate('/universities')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 24px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#fff',
                background: 'rgba(255,255,255,0.04)',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              {t('hero.explore')}
              <ArrowIcon />
            </button>
            <button
              className="hero-secondary-btn"
              type="button"
              onClick={() => navigate('/study-plan')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 24px', borderRadius: 14, border: '1px solid rgba(151,165,255,0.42)',
                color: '#fff', background: 'rgba(79,107,255,0.18)', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
              }}
            >
              {t('hero.studyPlan')}
              <ArrowIcon />
            </button>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.58)', marginTop: 16 }}>{t('hero.trust')}</span>
        </div>
      </div>
    </section>
  );
}
