import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UNIVERSITIES } from '../data';
import { useComparison } from '../hooks/useComparison';
import { matchUniversities, formatRM, type MatchResult } from '../services/universityService';
import { usePreferences } from '../i18n';

/* ─── design tokens ──────────────────────────────────────────────────────────*/
const HEADER_BG  = '#150628';
const CARD       = '#FFFFFF';
const BG         = '#F9FAFB';
const BORDER     = '#E5E7EB';
const BORDER_ACT = '#D8DEFF';
const TEXT       = '#111827';
const MUTED      = '#6B7280';
const PURPLE     = '#4F6BFF';
const PURPLE_LT  = '#F3F5FF';

/* ─── icons ──────────────────────────────────────────────────────────────────*/
const I  = { viewBox:'0 0 24 24', width:16, height:16, fill:'none', stroke:TEXT,   strokeWidth:'1.75', strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
const IP = { ...I, stroke: PURPLE };

const IconBars    = () => <svg {...IP}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconSearch  = () => <svg {...IP}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconChevron = () => <svg {...I} width={13} height={13}><polyline points="9 18 15 12 9 6"/></svg>;
const IconStar    = () => <svg {...I} width={12} height={12} fill={PURPLE} stroke={PURPLE}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconChevDown = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ─── logo chip (dark bg) ────────────────────────────────────────────────────*/
function LogoChip({ uni, size = 48 }: { uni: typeof UNIVERSITIES[0]; size?: number }) {
  const [failed, setFailed] = useState(!uni.domain);
  return (
    <Link to={`/universities/${uni.id}`} style={{ textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ width:size, height:size, borderRadius:13, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', transition:'all 0.22s' }}
        onMouseEnter={e => { const d=e.currentTarget as HTMLElement; d.style.background='rgba(255,255,255,0.13)'; d.style.borderColor='rgba(255,255,255,0.22)'; d.style.transform='translateY(-3px)'; }}
        onMouseLeave={e => { const d=e.currentTarget as HTMLElement; d.style.background='rgba(255,255,255,0.07)'; d.style.borderColor='rgba(255,255,255,0.12)'; d.style.transform='none'; }}>
        {uni.domain && !failed
          ? <img src={`https://www.google.com/s2/favicons?domain=${uni.domain}&sz=64`} alt={uni.abbr} loading="lazy" decoding="async" onError={() => setFailed(true)}
              style={{ width:size*0.58, height:size*0.58, objectFit:'contain' }} />
          : <span style={{ fontSize:size*0.25, fontWeight:800, color:'rgba(255,255,255,0.65)' }}>{uni.abbr.slice(0,2)}</span>}
      </div>
      <span style={{ fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.35)' }}>{uni.abbr}</span>
    </Link>
  );
}

/* ─── score ring ─────────────────────────────────────────────────────────────*/
function ScoreRing({ value, label, active }: { value: number; label: string; active: boolean }) {
  const r=28, c=36, sw=5, circ=2*Math.PI*r;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={c} cy={c} r={r} fill="none" stroke={BORDER} strokeWidth={sw}/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={active ? PURPLE : '#D1D5DB'} strokeWidth={sw}
          strokeDasharray={`${(value/100)*circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition:'stroke-dasharray 0.8s cubic-bezier(.22,1,.36,1), stroke 0.3s' }}/>
        <text x={c} y={c+5} textAnchor="middle" fill={TEXT} fontSize="13" fontWeight="700">{value}</text>
      </svg>
      <span style={{ fontSize:11, fontWeight:600, color: active ? TEXT : MUTED }}>{label}</span>
    </div>
  );
}

/* ─── reusable custom dropdown ───────────────────────────────────────────────*/
function Dropdown<T extends string | number>({
  options, value, onChange, placeholder, renderLabel,
}: {
  options: T[];
  value: T | '';
  onChange: (v: T) => void;
  placeholder?: string;
  renderLabel?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = (v: T) => renderLabel ? renderLabel(v) : String(v);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', flex:1 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', padding:'10px 14px', borderRadius:12,
        border:`1px solid ${open || value !== '' ? BORDER_ACT : BORDER}`,
        background:CARD, color: value !== '' ? TEXT : MUTED,
        fontSize:13, fontWeight: value !== '' ? 600 : 400,
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:8, textAlign:'left', transition:'border-color 0.2s', outline:'none',
        fontFamily:'Inter, sans-serif',
      }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {value !== '' ? label(value as T) : (placeholder ?? 'Select...')}
        </span>
        <IconChevDown open={open} />
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:60,
          background:CARD, borderRadius:14, border:`1px solid ${BORDER}`,
          boxShadow:'0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          maxHeight:240, overflowY:'auto',
          animation:'dropFadeIn 0.18s cubic-bezier(.22,1,.36,1)',
        }}>
          {options.map((o, i) => (
            <button key={String(o)} onClick={() => { onChange(o); setOpen(false); }}
              style={{
                width:'100%', padding:'10px 16px',
                borderTop: i > 0 ? `1px solid #F3F4F6` : 'none',
                border:'none',
                background: o === value ? PURPLE_LT : CARD,
                color: o === value ? PURPLE : TEXT,
                fontSize:13, fontWeight: o === value ? 600 : 400,
                cursor:'pointer', textAlign:'left',
                transition:'background 0.12s',
                fontFamily:'Inter, sans-serif',
              }}
              onMouseEnter={e => { if (o !== value) (e.currentTarget as HTMLElement).style.background = '#F9F5FF'; }}
              onMouseLeave={e => { if (o !== value) (e.currentTarget as HTMLElement).style.background = CARD; }}>
              {label(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── comparison panel ───────────────────────────────────────────────────────*/
export function ComparisonPanel() {
  const { t } = usePreferences();
  const { uniA, uniB, scoreA, scoreB, setUniA, setUniB, privateUnis } = useComparison();
  const [animKey, setAnimKey] = useState(0);

  function handleA(id: number) { setUniA(id); setAnimKey(k => k+1); }
  function handleB(id: number) { setUniB(id); setAnimKey(k => k+1); }

  const rows = [
    { label:t('compare.minTuition'), a:formatRM(uniA.tuition_min),  b:formatRM(uniB.tuition_min),  aWins:uniA.tuition_min <= uniB.tuition_min },
    { label:t('compare.maxTuition'), a:formatRM(uniA.tuition_max),  b:formatRM(uniB.tuition_max),  aWins:uniA.tuition_max <= uniB.tuition_max },
    { label:t('compare.ranking'),    a:uniA.qs_ranking ? `#${uniA.qs_ranking}` : '-', b:uniB.qs_ranking ? `#${uniB.qs_ranking}` : '-', aWins:(uniA.qs_ranking??9999) <= (uniB.qs_ranking??9999) },
    { label:t('compare.students'),   a:`${(uniA.students_count/1000).toFixed(0)}k+`, b:`${(uniB.students_count/1000).toFixed(0)}k+`, aWins:uniA.students_count >= uniB.students_count },
    { label:t('compare.est'),        a:String(uniA.established), b:String(uniB.established), aWins:uniA.established <= uniB.established },
  ];

  const uniIds  = privateUnis.map(u => u.id);
  const uniName = (id: number) => privateUnis.find(u => u.id === id)?.name ?? '';
  const winner  = scoreA.overall >= scoreB.overall ? uniA : uniB;

  return (
    <div className="discovery-card" style={{ height:'100%', background:CARD, borderRadius:20, border:`1px solid ${BORDER}`, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
      {/* header */}
      <div className="discovery-card-header" style={{ padding:'20px 24px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:PURPLE_LT, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconBars /></div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:TEXT }}>{t('compare.title')}</div>
          <div style={{ fontSize:12, color:MUTED }}>{t('compare.copy')}</div>
        </div>
      </div>

      <div className="discovery-card-body" style={{ padding:'22px 24px', flex:1, display:'flex', flexDirection:'column', gap:18 }}>
        {/* dropdowns */}
        <div className="compare-select-row" style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Dropdown options={uniIds} value={uniA.id} onChange={handleA} renderLabel={uniName} />
          <span style={{ fontSize:11, fontWeight:700, color:MUTED, flexShrink:0 }}>vs</span>
          <Dropdown options={uniIds} value={uniB.id} onChange={handleB} renderLabel={uniName} />
        </div>

        {/* score rings */}
        <div className="compare-score-panel" style={{ display:'flex', alignItems:'center', gap:16, background:BG, borderRadius:14, padding:'16px 20px', border:`1px solid ${BORDER}` }}>
          <ScoreRing value={scoreA.overall} label={uniA.abbr} active={scoreA.overall >= scoreB.overall} />
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, color:MUTED, letterSpacing:'2px', textTransform:'uppercase', marginBottom:5 }}>{t('compare.score')}</div>
            <div style={{ fontSize:12, fontWeight:700, color:PURPLE }}>{winner.abbr} {t('compare.leads')}</div>
          </div>
          <ScoreRing value={scoreB.overall} label={uniB.abbr} active={scoreB.overall > scoreA.overall} />
        </div>

        {/* data rows */}
        <div key={animKey} style={{ display:'flex', flexDirection:'column' }}>
          {rows.map((row, i) => (
            <div key={i} className="compare-data-row" style={{
              display:'grid', gridTemplateColumns:'1fr 110px 1fr', alignItems:'center',
              padding:'10px 0', borderBottom: i < rows.length-1 ? `1px solid ${BORDER}` : 'none',
              animation:'rowSlideIn 0.32s cubic-bezier(.22,1,.36,1) both',
              animationDelay:`${i*50}ms`,
            }}>
              <span style={{ fontSize:13, fontWeight:row.aWins ? 700 : 400, color:row.aWins ? TEXT : MUTED, textAlign:'right', paddingRight:10 }}>{row.a}</span>
              <span style={{ fontSize:10, color:MUTED, textAlign:'center', fontWeight:500 }}>{row.label}</span>
              <span style={{ fontSize:13, fontWeight:!row.aWins ? 700 : 400, color:!row.aWins ? TEXT : MUTED, paddingLeft:10 }}>{row.b}</span>
            </div>
          ))}
        </div>

        {/* detail links */}
        <div className="compare-detail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:'auto' }}>
          {[uniA, uniB].map(u => (
            <Link key={u.id} to={`/universities/${u.id}`}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px', borderRadius:12, border:`1px solid ${BORDER}`, background:CARD, color:MUTED, fontSize:12, fontWeight:600, textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER_ACT; el.style.color=PURPLE; el.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.color=MUTED; el.style.transform='none'; }}>
              {u.abbr} <IconChevron />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── AI match panel ─────────────────────────────────────────────────────────*/
const CAREER_OPTIONS = [
  'Medicine & Healthcare', 'Engineering', 'Business & Finance',
  'Technology & AI', 'Law', 'Architecture', 'Aviation',
  'Pharmacy', 'Psychology', 'Culinary Arts',
];

function AIMatchPanel() {
  const { t } = usePreferences();
  const [career,   setCareer]   = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results,  setResults]  = useState<MatchResult[]>([]);
  const [visible,  setVisible]  = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function runScan() {
    if (!career || scanning) return;
    setScanning(true); setResults([]); setVisible(false); setProgress(0);
    let p = 0;
    timer.current = setInterval(() => {
      p += Math.random() * 12 + 7;
      if (p >= 100) {
        clearInterval(timer.current!);
        setScanning(false); setProgress(100);
        const res = matchUniversities(career);
        setResults(res);
        requestAnimationFrame(() => setVisible(true));
        return;
      }
      setProgress(Math.min(p, 100));
    }, 90);
  }

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function handleCareer(v: string) { setCareer(v); setResults([]); setVisible(false); }

  return (
    <div className="discovery-card" style={{ height:'100%', background:CARD, borderRadius:20, border:`1px solid ${BORDER}`, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
      {/* header */}
      <div className="discovery-card-header" style={{ padding:'20px 24px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:PURPLE_LT, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconSearch /></div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:TEXT }}>{t('match.title')}</div>
          <div style={{ fontSize:12, color:MUTED }}>{t('match.copy')}</div>
        </div>
      </div>

      <div className="discovery-card-body" style={{ padding:'22px 24px', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
        {/* field selector */}
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:MUTED, marginBottom:8, letterSpacing:'0.5px', textTransform:'uppercase' }}>
            {t('match.field')}
          </label>
          <Dropdown options={CAREER_OPTIONS} value={career} onChange={handleCareer} placeholder={t('match.placeholder')} />
        </div>

        {/* progress bar */}
        <div style={{ height:3, background:'#F3F4F6', borderRadius:3, overflow:'hidden', opacity:scanning || progress===100 ? 1 : 0, transition:'opacity 0.3s' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg, ${PURPLE}, #A78BFA)`, borderRadius:3, transition:'width 0.08s linear' }}/>
        </div>

        {/* scan button */}
        <button onClick={runScan} disabled={!career || scanning} style={{
          padding:'13px', borderRadius:12, border:'none',
          background: career && !scanning ? PURPLE : '#F3F4F6',
          color: career && !scanning ? '#fff' : '#9CA3AF',
          fontSize:13, fontWeight:700,
          cursor: career && !scanning ? 'pointer' : 'default',
          transition:'all 0.2s', letterSpacing:'-0.2px',
          boxShadow: career && !scanning ? '0 4px 16px rgba(79,107,255,0.24)' : 'none',
          fontFamily:'Inter, sans-serif',
        }}
          onMouseEnter={e => { if (career && !scanning) { const el=e.currentTarget as HTMLElement; el.style.transform='translateY(-1px)'; el.style.boxShadow='0 8px 24px rgba(79,107,255,0.32)'; } }}
          onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.transform='none'; el.style.boxShadow = career && !scanning ? '0 4px 16px rgba(79,107,255,0.24)' : 'none'; }}>
          {scanning ? `${t('match.scanning')} ${Math.round(progress)}%` : t('match.button')}
        </button>

        {/* results */}
        {results.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:MUTED, letterSpacing:'1px', textTransform:'uppercase' }}>
              {t('match.top')} {career}
            </div>
            {results.map((r, i) => (
              <Link key={r.university.id} to={`/universities/${r.university.id}`}
                style={{
                  textDecoration:'none', display:'flex', alignItems:'center', gap:12,
                  padding:'13px 14px', borderRadius:12,
                  border:`1px solid ${i===0 ? BORDER_ACT : BORDER}`,
                  background: i===0 ? PURPLE_LT : CARD,
                  animation: visible ? 'resultSlideUp 0.42s cubic-bezier(.22,1,.36,1) both' : 'none',
                  animationDelay:`${i*90}ms`,
                  transition:'all 0.2s',
                }}
                onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER_ACT; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 6px 20px rgba(79,107,255,0.1)'; }}
                onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=i===0?BORDER_ACT:BORDER; el.style.transform='none'; el.style.boxShadow='none'; }}>
                <div style={{ width:30, height:30, borderRadius:9, background:i===0?PURPLE:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {i===0 ? <IconStar /> : <span style={{ fontSize:11, fontWeight:800, color:MUTED }}>{i+1}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:TEXT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.university.name}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>{r.reasons[1]} - {r.university.location}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  {i===0 && <span style={{ fontSize:9, fontWeight:800, color:PURPLE, background:'rgba(79,107,255,0.1)', borderRadius:20, padding:'3px 8px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{t('match.topPick')}</span>}
                  <IconChevron />
                </div>
              </Link>
            ))}

            <Link to="/universities"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px', borderRadius:12, border:`1px solid ${BORDER}`, color:MUTED, fontSize:12, fontWeight:600, textDecoration:'none', marginTop:2, transition:'all 0.2s',
                animation: visible ? 'resultSlideUp 0.42s cubic-bezier(.22,1,.36,1) 320ms both' : 'none' }}
              onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER_ACT; el.style.color=PURPLE; }}
              onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.color=MUTED; }}>
              {t('match.browse')} <IconChevron />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────────*/
const FEATURED_IDS = [12, 13, 10, 18, 9];

export default function JourneyTimeline() {
  const { t } = usePreferences();
  const featured = FEATURED_IDS.map(id => UNIVERSITIES.find(u => u.id === id)).filter(Boolean) as typeof UNIVERSITIES;

  return (
    <section style={{ marginBottom:80 }}>
      <style>{`
        @keyframes dropFadeIn  { from{opacity:0;transform:translateY(-6px) scale(0.98)} to{opacity:1;transform:none} }
        @keyframes rowSlideIn  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes resultSlideUp { from{opacity:0;transform:translateY(14px) scale(0.97)} to{opacity:1;transform:none} }
      `}</style>

      {/* dark header */}
      <div style={{ background:HEADER_BG, padding:'clamp(40px,5vw,56px) clamp(20px,4vw,40px) 36px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ marginBottom:28 }}>
            <span style={{ fontSize:10, fontWeight:700, color:'rgba(196,181,253,0.6)', letterSpacing:'3px', textTransform:'uppercase' }}>{t('discovery.badge')}</span>
            <h2 style={{ fontSize:'clamp(22px,3.2vw,36px)', fontWeight:800, color:'#fff', letterSpacing:'-1.5px', lineHeight:1.15, marginTop:8 }}>
              {t('discovery.title')}
            </h2>
          </div>

          {/* partner bar */}
          <div className="discovery-partner-bar" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px 22px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.22)', letterSpacing:'2px', textTransform:'uppercase', flexShrink:0 }}>{t('discovery.partners')}</span>
            <div className="discovery-partner-divider" style={{ width:1, height:20, background:'rgba(255,255,255,0.06)', flexShrink:0 }}/>
            <div className="discovery-partner-logos" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              {featured.map(u => <LogoChip key={u.id} uni={u} size={46} />)}
            </div>
            <Link to="/universities"
              className="discovery-partner-all"
              style={{ marginLeft:'auto', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.35)', textDecoration:'none', flexShrink:0, transition:'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.35)'; }}>
              {t('discovery.viewAll')}
            </Link>
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ background:BG }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px clamp(20px,4vw,40px) 60px' }}>
          <div className="discovery-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22, alignItems:'stretch' }}>
            <ComparisonPanel />
            <AIMatchPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

