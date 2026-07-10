import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { UNIVERSITIES } from '../data';
import type { University, Program } from '../types';
import { C, gradientMid, gradientHero } from '../styles/theme';
import { usePreferences } from '../i18n';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  public: 'Public University',
  private: 'Private University',
  foreign_branch: 'Foreign Branch Campus',
};

const TYPE_COLORS: Record<string, string> = {
  public:         '#006633',
  private:        '#4F6BFF',
  foreign_branch: '#7B1FA2',
};

const OFFICIAL_LOGOS: Record<string, string> = {
  USM: '/official-logos/usm.jpg',
  HWU: '/official-logos/heriot-watt.png',
  LINCOLN: '/official-logos/lincoln.png',
  SUNWAY: '/official-logos/sunway.avif',
  "TAYLOR'S": '/official-logos/taylors.jpg',
  UNICAM: '/official-logos/unicam.png',
  CYBERJAYA: '/official-logos/cyberjaya.jpg',
};

const LEVEL_ORDER = ['foundation','diploma','bachelor','master','phd'];

function fmt(n: number) { return 'RM ' + n.toLocaleString(); }

type IconName = 'award' | 'graduation' | 'building' | 'calendar' | 'users' | 'wallet' | 'chart' | 'location' | 'home' | 'scale';

function ThemedIcon({ name, color = C.purpleMid, size = 22 }: { name: IconName; color?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, JSX.Element> = {
    award: <><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5" /></>,
    graduation: <><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12.5V16c3.5 2 8.5 2 12 0v-3.5" /><path d="M22 10v5" /></>,
    building: <><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M9 21v-6h6v6" /><path d="M9 10h.01M12 10h.01M15 10h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15V7" /><path d="M16 14h4" /></>,
    chart: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="4" width="3" height="13" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 10v11h14V10" /><path d="M9 21v-6h6v6" /></>,
    scale: <><path d="M12 3v18" /><path d="M5 6h14" /><path d="m6 6-3 7h6L6 6Z" /><path d="m18 6-3 7h6l-3-7Z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function IconBox({ icon, color, size = 52 }: { icon: IconName; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 14, background: `${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <ThemedIcon name={icon} color={color} size={size >= 48 ? 23 : 20} />
    </div>
  );
}

/* ─── Logo img with fallback ────────────────────────────────────────────────── */
function UniLogo({ uni, size = 72 }: { uni: University; size?: number }) {
  const [failed, setFailed] = useState(false);
  const officialLogo = OFFICIAL_LOGOS[uni.abbr];
  if (!uni.domain || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: `${uni.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0, border: `2px solid ${uni.color}30` }}>
        <span style={{ fontSize: size * 0.32, fontWeight: 900, color: uni.color }}>{uni.abbr.slice(0,2)}</span>
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 16, background: '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: 8 }}>
      <img src={officialLogo ?? `https://www.google.com/s2/favicons?domain=${uni.domain}&sz=128`} alt={uni.abbr}
        loading="lazy"
        decoding="async"
        onError={e => {
          if (officialLogo && uni.domain) {
            e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${uni.domain}&sz=128`;
            e.currentTarget.onerror = () => setFailed(true);
            return;
          }
          setFailed(true);
        }}
        style={{ width: size * 0.65, height: size * 0.65, objectFit: 'contain' }} />
    </div>
  );
}

/* ─── Highlight card ──────────────────────────────────────────────────────── */
function HighlightCard({ icon, title, items, color }: { icon: IconName; title: string; items: string[]; color: string }) {
  return (
    <div className="detail-card" style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <IconBox icon={icon} color={color} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14, letterSpacing: '-0.3px' }}>{title}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 9 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap: 8, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Program pill ────────────────────────────────────────────────────────── */
function ProgramRow({ prog, color }: { prog: Program; color: string }) {
  const { t } = usePreferences();
  const LEVEL_COLORS: Record<string, string> = { foundation:'#F59E0B', diploma:'#10B981', bachelor:'#3B82F6', master:'#8B5CF6', phd:'#EF4444' };
  const lc = LEVEL_COLORS[prog.level] ?? color;
  return (
    <div className="program-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background: C.bg, borderRadius: 14, border:`1px solid ${C.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{prog.name}</div>
        <div style={{ display:'flex', gap: 8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: lc, background: `${lc}15`, borderRadius: 20, padding:'2px 10px', textTransform:'capitalize' }}>{prog.level}</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>{prog.duration_years} yrs</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>·</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>{prog.field}</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>·</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>Intake: {prog.intake}</span>
        </div>
      </div>
      <div style={{ textAlign:'right', paddingLeft: 16, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color }}>{fmt(prog.tuition_per_year)}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>{t('detail.perYear')}</div>
      </div>
    </div>
  );
}

/* ─── Logo Slider ─────────────────────────────────────────────────────────── */
function LogoSliderItem({ uni: u, index, active, onEnter, onLeave }: {
  uni: University;
  index: number;
  active: boolean;
  onEnter: (i: number) => void;
  onLeave: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const officialLogo = OFFICIAL_LOGOS[u.abbr];
  return (
    <Link to={`/universities/${u.id}`}
      onMouseEnter={() => onEnter(index)}
      onMouseLeave={onLeave}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'12px 40px', textDecoration:'none', flexShrink:0,
        transition:'transform 0.25s', transform: active ? 'translateY(-4px) scale(1.05)' : 'none',
        filter: active ? 'none' : 'grayscale(0.5)', opacity: active ? 1 : 0.75 }}
    >
      <div style={{ width: 60, height: 60, background:'#fff', borderRadius: 14, display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: active ? `0 8px 24px ${u.color}30` : '0 2px 8px rgba(0,0,0,0.07)', transition:'box-shadow 0.25s', padding: 8 }}>
        {(officialLogo || u.domain) && !imgFailed
          ? <img src={officialLogo ?? `https://www.google.com/s2/favicons?domain=${u.domain}&sz=64`} alt={u.abbr}
              loading="lazy"
              decoding="async"
              onError={e => {
                if (officialLogo && u.domain) {
                  e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${u.domain}&sz=64`;
                  e.currentTarget.onerror = () => setImgFailed(true);
                  return;
                }
                setImgFailed(true);
              }}
              style={{ width: 40, height: 40, objectFit:'contain' }} />
          : <span style={{ fontSize: 14, fontWeight: 900, color: u.color }}>{u.abbr.slice(0,2)}</span>
        }
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: active ? u.color : C.textMuted, maxWidth: 80, textAlign:'center', lineHeight:1.3, transition:'color 0.25s' }}>{u.abbr}</span>
    </Link>
  );
}

function LogoSlider({ exclude }: { exclude: number }) {
  const { t } = usePreferences();
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const others = UNIVERSITIES.filter(u => u.id !== exclude);
  const items = [...others, ...others];

  return (
    <section className="logo-slider-section" style={{ padding: '72px 0', background: '#FAFAFA', borderTop: `1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', marginBottom: 36, textAlign:'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: C.textMuted, textTransform:'uppercase', marginBottom: 10 }}>{t('detail.partners')}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing:'-1px' }}>{t('detail.best')}</div>
      </div>

      <div style={{ position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:160, background:'linear-gradient(to right, #FAFAFA, transparent)', zIndex:2, pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:160, background:'linear-gradient(to left, #FAFAFA, transparent)', zIndex:2, pointerEvents:'none' }} />

        <div className="marquee-track" style={{ display:'flex', alignItems:'center' }}>
          {items.map((u, i) => (
            <LogoSliderItem
              key={`${u.id}-${i}`}
              uni={u}
              index={i}
              active={hovIdx === i}
              onEnter={i => setHovIdx(i)}
              onLeave={() => setHovIdx(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Stat box ────────────────────────────────────────────────────────────── */
function StatBox({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="detail-card" style={{ background:'#fff', borderRadius: 16, padding:'20px 22px', border:`1px solid ${C.border}`, textAlign:'center' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom: 8 }}><ThemedIcon name={icon} /></div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing:'-0.5px', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ─── Info section card ───────────────────────────────────────────────────── */
function InfoSection({ icon, title, desc, points, color }: { icon: IconName; title: string; desc: string; points: string[]; color: string }) {
  return (
    <div className="detail-card" style={{ background:'#fff', borderRadius: 22, padding:'32px 28px', border:`1px solid ${C.border}`, boxShadow:'0 4px 24px rgba(0,0,0,0.05)' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 16 }}>
        <IconBox icon={icon} color={color} size={48} />
        <div style={{ fontSize:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>{title}</div>
      </div>
      <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.75, marginBottom:18 }}>{desc}</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {points.map((p,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:C.text }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Compare button ──────────────────────────────────────────────────────── */
function CompareButton() {
  const { t } = usePreferences();
  const [hov, setHov] = useState(false);
  return (
    <Link to="/universities"
      className="compare-floating"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position:'fixed', right: 24, bottom: 32, zIndex: 100, display:'flex', alignItems:'center', gap: 8,
        background: hov ? C.purpleDeep : gradientMid,
        color:'#fff', borderRadius:50, padding:'13px 20px', textDecoration:'none',
        boxShadow: hov ? `0 12px 32px ${C.purpleDeep}60` : '0 8px 24px rgba(79,107,255,0.24)',
        fontSize:13, fontWeight:700, transition:'all 0.25s', letterSpacing:'-0.2px' }}>
      <ThemedIcon name="scale" color="#fff" size={16} />
      {t('detail.compare')}
    </Link>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────────────────────── */
export default function UniversityDetail() {
  const { t } = usePreferences();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uni, setUni] = useState<University | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.universities.get(parseInt(id)).then(data => {
      setUni(data);
      setPrograms(data.programs ?? []);
      setLoading(false);
    }).catch(() => { navigate('/universities'); });
  }, [id]);

  if (loading) {
    return (
      <div style={{ paddingTop: 68, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background: C.bg }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48, height:48, border:`3px solid ${C.purpleLight}`, borderTopColor: C.purpleDeep, borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }} />
          <div style={{ color: C.textMuted, fontSize:14 }}>{t('detail.loading')}</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!uni) return null;

  const typeColor = TYPE_COLORS[uni.type] ?? C.purpleMid;
  const fields = ['all', ...new Set(programs.map(p => p.field))];
  const visibleProgs = activeTab === 'all' ? programs : programs.filter(p => p.field === activeTab);
  const sortedProgs = [...visibleProgs].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const goToApplication = () => navigate('/#booking-section');

  /* ── Highlight card data ── */
  const highlights = [
    {
      icon: 'award' as IconName,
      title: 'Rankings & Accreditation',
      color: '#F59E0B',
      items: [
        uni.qs_ranking ? `QS World Ranking: #${uni.qs_ranking}` : 'Nationally Accredited',
        'MQA (Malaysian Qualifications Agency) Certified',
        TYPE_LABELS[uni.type],
        `Established ${uni.established}`,
        uni.students_count >= 10000 ? `${(uni.students_count/1000).toFixed(0)}k+ Students Enrolled` : `${uni.students_count.toLocaleString()}+ Students`,
      ],
    },
    {
      icon: 'graduation' as IconName,
      title: 'Top Programmes',
      color: C.purpleMid,
      items: programs.length > 0
        ? programs.slice(0, 5).map(p => `${p.name.replace('Bachelor of ','').replace('Master of ','')} (${p.level})`)
        : ['Wide range of undergraduate programmes', 'Postgraduate & research degrees', 'Foundation and diploma pathways', 'Professional short courses', 'Online & blended learning'],
    },
    {
      icon: 'building' as IconName,
      title: 'Campus & Facilities',
      color: '#10B981',
      items: [
        'Modern lecture theatres & labs',
        'High-speed Wi-Fi campus-wide',
        'Student lounge & recreation areas',
        'Library with 24/7 digital access',
        uni.type === 'private' ? 'On-campus student accommodation' : 'Sports complex & health centre',
      ],
    },
  ];

  return (
    <div className="university-detail-page" style={{ background: C.bg, minHeight:'100vh', paddingTop: 68 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .marquee-track { display:flex; animation:marquee 35s linear infinite; width:max-content; }
        .marquee-track:hover { animation-play-state:paused; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', overflow:'hidden', minHeight: 420 }}>
        {/* background pattern */}
        <div style={{ position:'absolute', inset:0, background: `linear-gradient(135deg, #081331 0%, ${C.purpleDeep} 52%, ${uni.color} 100%)` }} />
        <div style={{ position:'absolute', inset:0, opacity:0.07,
          backgroundImage:`radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)` }} />
        {/* floating circles */}
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:350, height:350, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <div style={{ position:'absolute', bottom:'-40px', left:'10%', width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        <div className="detail-hero-content" style={{ position:'relative', zIndex:2, maxWidth:1200, margin:'0 auto', padding:'64px 40px 80px', display:'flex', alignItems:'center', gap:40, flexWrap:'wrap' }}>
          <UniLogo uni={uni} size={90} />

          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff', background: typeColor, borderRadius:20, padding:'5px 14px', letterSpacing:'0.3px' }}>
                {TYPE_LABELS[uni.type]}
              </span>
              {uni.qs_ranking && (
                <span style={{ fontSize:12, fontWeight:700, color:C.purpleDeep, background:'#fff', borderRadius:20, padding:'5px 14px' }}>
                  QS #{uni.qs_ranking}
                </span>
              )}
              <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.75)', background:'rgba(255,255,255,0.12)', borderRadius:20, padding:'5px 14px' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <ThemedIcon name="location" color="rgba(255,255,255,0.75)" size={14} />
                  {uni.location}
                </span>
              </span>
            </div>

            <h1 style={{ fontSize:'clamp(26px,4vw,46px)', fontWeight:900, color:'#fff', letterSpacing:'-2px', lineHeight:1.1, marginBottom:12 }}>{uni.name}</h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.75)', lineHeight:1.75, maxWidth:600, marginBottom:28 }}>{uni.description}</p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button onClick={goToApplication} style={{ padding:'13px 28px', borderRadius:50, background:'#fff', border:'none', color:C.purpleDeep, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
                {t('detail.apply')}
              </button>
            </div>
          </div>

          {/* quick stats column */}
          <div className="detail-quick-stats" style={{ display:'flex', flexDirection:'column', gap:12, minWidth:180 }}>
            {[
              { icon:'calendar' as IconName, label:'Est.', value: String(uni.established) },
              { icon:'users' as IconName, label:'Students', value: uni.students_count >= 1000 ? `${(uni.students_count/1000).toFixed(0)}k+` : `${uni.students_count}+` },
              { icon:'wallet' as IconName, label:'Min Tuition/yr', value: `RM ${(uni.tuition_min/1000).toFixed(0)}k` },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:16, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                <ThemedIcon name={s.icon} color="#fff" size={20} />
                <div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>{s.label}</div>
                  <div style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BREADCRUMB ─────────────────────────────────────────────────────────── */}
      <div className="detail-breadcrumb" style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'12px 40px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', gap:8, alignItems:'center', fontSize:13, color:C.textMuted }}>
          <Link to="/" style={{ color:C.textMuted, textDecoration:'none' }}>{t('detail.home')}</Link>
          <span>›</span>
          <Link to="/universities" style={{ color:C.textMuted, textDecoration:'none' }}>{t('detail.universities')}</Link>
          <span>›</span>
          <span style={{ color:C.text, fontWeight:600 }}>{uni.abbr}</span>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div className="detail-body" style={{ maxWidth:1200, margin:'0 auto', padding:'56px 40px' }}>

        {/* Highlights grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>{t('detail.why')}</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:C.text, letterSpacing:'-1px', marginBottom:32 }}>{t('detail.highlights')}</h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:20, marginBottom:56 }}>
          {highlights.map(h => <HighlightCard key={h.title} {...h} />)}
        </div>

        {/* Quick Facts */}
        <div className="detail-card" style={{ background:`linear-gradient(135deg, ${C.purpleDeep}08 0%, ${uni.color}08 100%)`, borderRadius:24, padding:'36px 40px', border:`1px solid ${C.border}`, marginBottom:56 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:C.text, letterSpacing:'-0.5px', marginBottom:24 }}>{t('detail.quickFacts')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
            {[
              { label:'Minimum Tuition', value: fmt(uni.tuition_min) + '/yr', icon:'wallet' as IconName },
              { label:'Maximum Tuition', value: fmt(uni.tuition_max) + '/yr', icon:'chart' as IconName },
              { label:'University Type', value: TYPE_LABELS[uni.type], icon:'building' as IconName },
              { label:'Location', value: uni.location, icon:'location' as IconName },
              { label:'Year Founded', value: String(uni.established), icon:'calendar' as IconName },
              { label:'Student Body', value: uni.students_count.toLocaleString() + '+', icon:'users' as IconName },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <IconBox icon={f.icon} color={C.purpleMid} size={42} />
                <div>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:500, marginBottom:1 }}>{f.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{f.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Programmes */}
        {programs.length > 0 && (
          <div style={{ marginBottom:56 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>{t('detail.academic')}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:16 }}>
              <h2 style={{ fontSize:28, fontWeight:900, color:C.text, letterSpacing:'-1px' }}>{t('detail.available')}</h2>
              <div className="detail-program-tabs" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {fields.map(f => (
                  <button key={f} onClick={() => setActiveTab(f)} style={{
                    padding:'8px 16px', borderRadius:50, border:`1px solid ${activeTab===f ? uni.color : C.border}`,
                    background: activeTab===f ? `${uni.color}15` : '#fff',
                    color: activeTab===f ? uni.color : C.textMuted,
                    fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize',
                  }}>{f === 'all' ? `${t('detail.all')} (${programs.length})` : f}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {sortedProgs.map(p => <ProgramRow key={p.id} prog={p} color={uni.color} />)}
            </div>
          </div>
        )}

        {/* Private-university extra sections */}
        {uni.type !== 'public' && (
          <div style={{ marginBottom:56 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Student Life</div>
            <h2 style={{ fontSize:28, fontWeight:900, color:C.text, letterSpacing:'-1px', marginBottom:32 }}>Life at {uni.abbr}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
              <InfoSection
                icon="graduation"
                title="Scholarships for International Students"
                color="#F59E0B"
                desc="Merit-based and need-based scholarships available for outstanding international applicants. Najmuni students receive priority consideration."
                points={[
                  'Up to 50% tuition waiver for top scorers',
                  'Government-linked education financing (PTPTN)',
                  'University Excellence Awards for GPA ≥ 3.5',
                  'Need-based financial assistance packages',
                  'NajmUni partner scholarship for applicants via our platform',
                ]}
              />
              <InfoSection
                icon="home"
                title="Modern Student Accommodation"
                color="#10B981"
                desc="Purpose-built student housing within or adjacent to campus, designed for comfort, safety, and community living."
                points={[
                  'Fully furnished single and twin rooms',
                  '24/7 security with CCTV surveillance',
                  'High-speed internet in all residential blocks',
                  'Common areas: study lounges, pantry, laundry',
                  'Shuttle bus to campus & nearby transit hubs',
                ]}
              />
            </div>
          </div>
        )}

        {/* CTA banner */}
        <div className="detail-cta-banner" style={{ borderRadius:28, padding:'52px 48px', background:`linear-gradient(135deg, #081331 0%, ${C.purpleDeep} 55%, ${uni.color} 100%)`, marginBottom:56, position:'relative', overflow:'hidden', textAlign:'center' }}>
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
          <div style={{ position:'absolute', bottom:'-30px', left:'5%', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:3, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', marginBottom:12 }}>{t('detail.ready')}</div>
            <h2 style={{ fontSize:30, fontWeight:900, color:'#fff', letterSpacing:'-1px', marginBottom:12 }}>{t('detail.applyTo')} {uni.abbr} {t('detail.applyVia')}</h2>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.7)', marginBottom:28, maxWidth:500, margin:'0 auto 28px' }}>
              {t('detail.ctaCopy')}
            </p>
            <div className="detail-cta-actions" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={goToApplication} style={{ padding:'14px 32px', borderRadius:50, background:'#fff', border:'none', color:C.purpleDeep, fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'-0.2px' }}>
                {t('detail.start')}
              </button>
              <Link to="/universities" style={{ padding:'14px 32px', borderRadius:50, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', fontSize:14, fontWeight:600, textDecoration:'none', letterSpacing:'-0.2px' }}>
                {t('detail.browse')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── LOGO SLIDER ──────────────────────────────────────────────────────── */}
      <LogoSlider exclude={uni.id} />

      {/* ── COMPARE FLOATING BUTTON ─────────────────────────────────────────── */}
    </div>
  );
}

