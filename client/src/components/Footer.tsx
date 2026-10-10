import { Link } from 'react-router-dom';
import Logo from './Logo';
import { C } from '../styles/theme';
import { usePreferences, type TranslationKey } from '../i18n';

const cols: Array<{ titleKey: TranslationKey; links: Array<[TranslationKey | string, string]> }> = [
  { titleKey: 'footer.services', links: [['footer.admissions', '/#services'], ['footer.visa', '/#faq'], ['footer.accommodation', '/#services'], ['footer.scholarships', '/#services']] },
  { titleKey: 'footer.universities', links: [['UM', '/universities'], ['USM', '/universities'], ['APU', '/universities'], ['MMU', '/universities'], ['UTAR', '/universities']] },
  { titleKey: 'footer.company', links: [['footer.about', '/#services'], ['footer.contact', '/#cta'], ['footer.privacy', '/#faq'], ['footer.terms', '/#faq']] },
];

export default function Footer() {
  const { t } = usePreferences();
  const label = (key: TranslationKey | string) => key.startsWith('footer.') ? t(key as TranslationKey) : key;

  return (
    <footer className="footer" style={{ background: C.dark, padding: '60px 40px 32px', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              <Logo height={36} />
            </div>
            <p style={{ lineHeight: 1.7, maxWidth: 260, color: 'rgba(255,255,255,0.5)' }}>
              {t('footer.copy')}
            </p>
          </div>
          {cols.map(col => (
            <div key={col.titleKey}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 16, fontSize: 13, letterSpacing: 1 }}>{t(col.titleKey)}</div>
              {col.links.map(([labelKey, to]) => (
                <Link key={labelKey} to={to} style={{
                  display: 'block', color: 'rgba(255,255,255,0.5)', marginBottom: 10, fontSize: 13, transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#7B61FF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                >{label(labelKey)}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13 }}>© 2026 {t('footer.rights')}</span>
          <div className="footer-social" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="https://instagram.com/najm.uni" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7B61FF')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              @najm.uni
            </a>
            <a href="https://tiktok.com/@najm.uni" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7B61FF')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
              </svg>
              @najm.uni
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

