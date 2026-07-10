import { useState } from 'react';
import { C, gradientCTA } from '../styles/theme';
import { api } from '../api';
import { usePreferences } from '../i18n';

export default function CTASection() {
  const { t } = usePreferences();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) return;
    setLoading(true);
    try { await api.leads.submit(email, undefined, 'cta'); } catch { /* offline ok */ }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="cta-section" style={{ padding: '0 40px 100px', maxWidth: 1200, margin: '0 auto' }} id="cta">
      <div className="cta-shell" style={{
        background: gradientCTA, borderRadius: 28, padding: '72px 64px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(8,19,49,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -80,  right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, color: '#7B61FF', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
            {t('cta.badge')}
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16, maxWidth: 600, margin: '0 auto 16px' }}>
            {t('cta.title')}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.7 }}>
            {t('cta.copy')}
          </p>
          {submitted ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 50, padding: '14px 28px', color: '#fff', fontSize: 15, fontWeight: 600 }}>
              {t('hero.done')}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="cta-email-form" style={{ display: 'flex', background: 'rgba(255,255,255,0.95)', borderRadius: 50, padding: '6px 6px 6px 24px', gap: 8, alignItems: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', maxWidth: 440, width: '100%' }}>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder={t('cta.email')}
                  style={{ border: 'none', outline: 'none', fontSize: 15, color: C.purpleDeep, background: 'transparent', flex: 1 }}
                />
                <button onClick={submit} disabled={loading} style={{
                  background: `linear-gradient(135deg, ${C.purpleMid}, ${C.purpleDeep})`,
                  color: '#fff', border: 'none', borderRadius: 50,
                  padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}>{loading ? '...' : t('cta.apply')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

