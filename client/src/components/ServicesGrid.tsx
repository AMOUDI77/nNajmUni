import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences, type TranslationKey } from '../i18n';

const I = { viewBox:'0 0 24 24', width:20, height:20, fill:'none', stroke:'#111827', strokeWidth:'1.75', strokeLinecap:'round' as const, strokeLinejoin:'round' as const };

const icons = {
  Home:    <svg {...I}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Plane:   <svg {...I}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8"/><path d="M7 20h10"/><line x1="12" y1="2" x2="12" y2="22"/></svg>,
  Card:    <svg {...I}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Book:    <svg {...I}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Award:   <svg {...I}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Message: <svg {...I}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const SERVICES: Array<{ icon: React.ReactNode; titleKey: TranslationKey; descKey: TranslationKey }> = [
  { icon: icons.Home,    titleKey:'services.accommodation', descKey:'services.accommodationCopy' },
  { icon: icons.Plane,   titleKey:'services.arrival',       descKey:'services.arrivalCopy' },
  { icon: icons.Card,    titleKey:'services.banking',       descKey:'services.bankingCopy' },
  { icon: icons.Book,    titleKey:'services.programme',     descKey:'services.programmeCopy' },
  { icon: icons.Award,   titleKey:'services.scholarships',  descKey:'services.scholarshipsCopy' },
  { icon: icons.Message, titleKey:'services.support',       descKey:'services.supportCopy' },
];

function ServiceCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="service-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'#fff', borderRadius:16, padding:'26px 24px', border:`1px solid ${hov ? '#D8DEFF' : '#f0f0f0'}`, boxShadow: hov ? '0 8px 24px rgba(79,107,255,0.06)' : '0 1px 8px rgba(15,23,42,0.04)', transition:'all 0.2s', cursor:'default' }}>
      <div style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        {icon}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:7 }}>{title}</div>
      <div style={{ fontSize:13, color: C.textMuted, lineHeight:1.65 }}>{desc}</div>
    </div>
  );
}

export default function ServicesGrid() {
  const { t } = usePreferences();

  return (
    <section className="section-pad" style={{ maxWidth:1200, margin:'0 auto' }} id="services">
      <div style={{ marginBottom:32 }}>
        <span style={{ fontSize:10, fontWeight:700, color: C.purpleMid, letterSpacing:'3px', textTransform:'uppercase' }}>{t('services.badge')}</span>
        <h2 style={{ fontSize:'clamp(22px,3.5vw,38px)', fontWeight:800, color:'#111827', letterSpacing:'-1px', lineHeight:1.2, marginTop:8 }}>
          {t('services.title')}
        </h2>
        <p style={{ fontSize:14, color: C.textMuted, maxWidth:480, lineHeight:1.7, marginTop:8 }}>
          {t('services.copy')}
        </p>
      </div>
      <div className="services-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {SERVICES.map((s, i) => <ServiceCard key={i} icon={s.icon} title={t(s.titleKey)} desc={t(s.descKey)} />)}
      </div>
    </section>
  );
}

