import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences } from '../i18n';

const I = { viewBox:'0 0 24 24', width:20, height:20, fill:'none', stroke:'#111827', strokeWidth:'1.75', strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
const IS = { ...I, stroke: C.purpleMid };

const IconGrad   = <svg {...I}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
const IconFile   = <svg {...I}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IconShield = <svg {...I}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconCloud  = <svg {...IS}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;

const DOCS = [
  { label:'Academic Transcript' },
  { label:'Passport Copy' },
  { label:'English Certificate' },
  { label:'Bank Statement' },
];

const APPTS = [
  { date:'Apr 22', time:'10:00 AM', title:'UM Application Review', type:'Admissions' },
  { date:'Apr 25', time:'2:30 PM',  title:'Visa Consultation',     type:'Visa'       },
  { date:'May 3',  time:'11:00 AM', title:'APU Campus Tour',       type:'Campus'     },
];

/* ─── Text feature card ─────────────────────────────────────────────────── */
function TextCard({ icon, badge, headline, sub, cta, onCta }: { icon: React.ReactNode; badge?: string; headline: string; sub: string; cta?: string; onCta?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="feature-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'#fff', borderRadius:18, padding:32, border:`1px solid ${hov ? '#D8DEFF' : C.border}`, boxShadow: hov ? '0 8px 24px rgba(79,107,255,0.07)' : 'none', transition:'all 0.2s', cursor:'default', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#F9F5FF', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {icon}
        </div>
        {badge && <span style={{ fontSize:10, fontWeight:700, color: C.purpleMid, background: C.purplePale, borderRadius:20, padding:'3px 10px', letterSpacing:'0.3px' }}>{badge}</span>}
      </div>
      <div>
        <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', letterSpacing:'-0.5px', marginBottom:7 }}>{headline}</h3>
        <p style={{ fontSize:13, color: C.textMuted, lineHeight:1.7 }}>{sub}</p>
      </div>
      {cta && (
        <button onClick={onCta} style={{ alignSelf:'flex-start', marginTop:4, background: hov ? C.purpleMid : '#fff', color: hov ? '#fff' : C.purpleMid, border:`1px solid ${hov ? C.purpleMid : '#D8DEFF'}`, borderRadius:50, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
          {cta}
        </button>
      )}
    </div>
  );
}

/* ─── Document portal ───────────────────────────────────────────────────── */
function DocUploadCard() {
  const { t } = usePreferences();
  return (
    <div className="doc-card" style={{ background:'#fff', borderRadius:18, padding:28, border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'#F9F5FF', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>{IconFile}</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{t('features.docs')}</div>
          <div style={{ fontSize:11, color: C.textMuted }}>{t('features.docsCopy')}</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
        {DOCS.map((doc, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:10, background:'#FAFAFA', border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, fontWeight:500, color:'#374151' }}>{doc.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Appointments card ─────────────────────────────────────────────────── */
function CalendarCard() {
  const { t } = usePreferences();
  return (
    <div className="calendar-card" style={{ background:'#fff', borderRadius:18, padding:28, border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#F9F5FF', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg {...I} width={16} height={16}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{t('features.appointments')}</div>
        </div>
        <span style={{ fontSize:11, color: C.purpleMid, fontWeight:600 }}>View All</span>
      </div>
      {APPTS.map((item, i) => (
        <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 0', borderBottom: i < APPTS.length-1 ? `1px solid #F3F0FA` : 'none' }}>
          <div style={{ width:42, height:42, background:'#F9F5FF', border:`1px solid ${C.border}`, borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:8, color: C.purpleMid, fontWeight:800, letterSpacing:'0.5px' }}>{item.date.split(' ')[0].toUpperCase()}</span>
            <span style={{ fontSize:15, color:'#111827', fontWeight:800, lineHeight:1.1 }}>{item.date.split(' ')[1]}</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{item.title}</div>
            <div style={{ fontSize:11, color: C.textMuted, marginTop:2 }}>{item.time}</div>
          </div>
          <span style={{ fontSize:10, fontWeight:600, color: C.purpleMid, background: C.purplePale, borderRadius:20, padding:'3px 9px' }}>{item.type}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ─────────────────────────────────────────────────────────────── */
export default function Features() {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const { t } = usePreferences();

  return (
    <section style={{ padding:'clamp(60px,8vw,96px) clamp(20px,4vw,40px) clamp(60px,8vw,80px)', maxWidth:1200, margin:'0 auto' }}>
      <div style={{ marginBottom:40 }}>
        <h2 style={{ fontSize:'clamp(24px,3.5vw,38px)', fontWeight:800, color:'#111827', letterSpacing:'-1px', lineHeight:1.2 }}>
          {t('features.title')}
        </h2>
        <p style={{ fontSize:14, color: C.textMuted, maxWidth:480, lineHeight:1.7, marginTop:8 }}>
          {t('features.copy')}
        </p>
      </div>
      <div className="features-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <TextCard icon={IconGrad} headline={t('features.admissions')} sub={t('features.admissionsCopy')} cta={t('features.learn')} onCta={() => scrollTo('services')} />
        <DocUploadCard />
        <CalendarCard />
        <TextCard icon={IconShield} headline={t('features.visa')} sub={t('features.visaCopy')} cta={t('features.check')} onCta={() => scrollTo('booking-section')} />
      </div>
    </section>
  );
}

