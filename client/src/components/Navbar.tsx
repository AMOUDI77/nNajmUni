import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { C } from '../styles/theme';
import { usePreferences } from '../i18n';

const links = [
  { key: 'nav.universities' as const, href: '/universities' },
  { key: 'nav.institutes' as const,    href: '/institutes'    },
  { key: 'nav.programs' as const,     href: '/programs'     },
  { key: 'nav.services' as const,     href: '/#services'    },
  { key: 'nav.visa' as const,         href: '/#faq'         },
  { key: 'nav.contact' as const,      href: '/#cta'         },
];

function scrollToHash(hash: string) {
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { t, toggleLanguage } = usePreferences();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => scrollToHash(hash), 80);
      return () => clearTimeout(timer);
    }
  }, [pathname, hash]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);
    if (href.startsWith('/#')) {
      e.preventDefault();
      const section = href.slice(1);
      if (pathname === '/') scrollToHash(section);
      else navigate(`/${section}`);
      return;
    }
    if (href.startsWith('/')) {
      e.preventDefault();
      if (pathname === href) window.scrollTo({ top: 0, behavior: 'smooth' });
      else navigate(href);
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const isCompact = scrolled || pathname !== '/';
  const logoTone = 'dark';
  const linkColor = '#52525B';
  const prefButtonStyle = {
    minHeight: 36,
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid transparent',
    background: 'transparent',
    color: '#3F3F46',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  } as const;

  return (
    <>
      <nav className="site-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'transparent',
        borderBottom: '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: isCompact ? '10px 40px' : '16px 40px',
      }}>
        <div className="nav-inner" style={{
          maxWidth: 1152,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          height: 64,
          gap: 24,
          padding: '0 24px',
          borderRadius: 32,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: isCompact ? '0 18px 45px rgba(8,19,49,0.08)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}>
          <Link to="/" onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Logo height={38} tone={logoTone} />
          </Link>

          <div className="nav-links" style={{ display: 'flex', gap: 24, flex: 1, justifyContent: 'center' }}>
            {links.map(({ key, href }) => (
              <a key={key} href={href} onClick={e => handleClick(e, href)}
                style={{ fontSize: 14, fontWeight: 600, color: linkColor, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s', padding: '10px 12px', borderRadius: 12 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#111B3D'; e.currentTarget.style.background = '#F4F4F5'; }}
                onMouseLeave={e => { e.currentTarget.style.color = linkColor; e.currentTarget.style.background = 'transparent'; }}>
                {t(key)}
              </a>
            ))}
          </div>

          <div className="nav-preferences" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={toggleLanguage} style={prefButtonStyle}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.color = '#111B3D'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3F3F46'; }}>
              {t('nav.language')}
            </button>
          </div>

          <a className="nav-apply" href="/#cta" onClick={e => handleClick(e, '/#cta')}
            style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #4F6BFF 100%)', color: '#fff', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none', boxShadow: '0 14px 30px rgba(79,107,255,0.24)', transition: 'transform 0.2s, box-shadow 0.2s', display: 'inline-block' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 18px 36px rgba(79,107,255,0.32)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(79,107,255,0.24)'; }}>
            {t('nav.apply')}
          </a>

          <button className="nav-hamburger" aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setMenuOpen(o => !o)}
            style={{ display: 'none', width: 40, height: 40, borderRadius: 12, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginInlineStart: 'auto', transition: 'all 0.2s' }}>
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#3F3F46" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#3F3F46" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-drawer-overlay" style={{ position: 'fixed', top: 82, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'rgba(0,0,0,0.24)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMenuOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}
            style={{ background: C.white, borderRadius: '0 0 20px 20px', padding: '16px 20px 24px', boxShadow: '0 16px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(({ key, href }) => (
              <a key={key} href={href} onClick={e => handleClick(e, href)}
                style={{ fontSize: 15, fontWeight: 600, color: C.text, padding: '13px 12px', borderRadius: 10, textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                {t(key)}
              </a>
            ))}
            <div style={{ height: 1, background: '#F4F4F5', margin: '8px 0' }} />
            <button type="button" onClick={toggleLanguage} style={{ ...prefButtonStyle, borderRadius: 12, minHeight: 46, marginBottom: 10, background: '#F4F4F5' }}>
              {t('nav.language')}
            </button>
            <a href="/#cta" onClick={e => handleClick(e, '/#cta')}
              style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg, #7B61FF 0%, #4F6BFF 100%)', color: '#fff', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              {t('nav.apply')}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

