import { useState } from 'react';

export default function WhatsAppFAB() {
  const [hov, setHov] = useState(false);

  return (
    <a
      href="https://www.instagram.com/najm.uni/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا على إنستغرام"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: 'max(20px, env(safe-area-inset-right, 20px))',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: hov ? 10 : 0,
        background: 'linear-gradient(135deg,#7B61FF,#4F6BFF)',
        color: '#fff',
        borderRadius: 999,
        padding: hov ? '14px 22px 14px 18px' : '14px',
        minWidth: hov ? 190 : 54,
        minHeight: 54,
        textDecoration: 'none',
        boxShadow: hov ? '0 14px 36px rgba(79,107,255,0.32)' : '0 10px 28px rgba(79,107,255,0.26)',
        transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="white" strokeWidth="2" style={{ flexShrink: 0 }}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
      </svg>
      {hov && <span>تواصل عبر إنستغرام</span>}
    </a>
  );
}
