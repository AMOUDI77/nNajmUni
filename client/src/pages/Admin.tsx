import { useState, useEffect, useCallback } from 'react';
import Logo from '../components/Logo';
import { apiUrl } from '../config';

/* ─── design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg:       '#F8F9FB',
  sidebar:  '#111827',
  card:     '#FFFFFF',
  border:   '#E5E7EB',
  text:     '#111827',
  muted:    '#6B7280',
  purple:   '#4F6BFF',
  purpleL:  '#F3F5FF',
  green:    '#10B981',
  amber:    '#F59E0B',
  red:      '#EF4444',
};

const ADMIN_STORAGE_KEY = 'admin_key';
const BASE              = '/api/admin';

function getStoredAdminKey() {
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) ?? '';
}

/* ─── API helpers ────────────────────────────────────────────────────────── */
async function apiFetch(path: string, opts: RequestInit = {}) {
  const incomingHeaders = (opts.headers ?? {}) as Record<string, string>;
  const adminKey = incomingHeaders['X-Admin-Key'] ?? getStoredAdminKey();
  const url = apiUrl(path.startsWith('/api/') ? path : `${BASE}${path}`);
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(adminKey ? { 'X-Admin-Key': adminKey } : {}),
      ...incomingHeaders,
    },
  });
  if ((res.status === 401 || res.status === 503) && adminKey && adminKey === getStoredAdminKey()) {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    window.location.assign('/admin');
  }
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ─── types ──────────────────────────────────────────────────────────────── */
interface Lead {
  id: number; email: string | null; phone: string | null; name: string | null;
  source: string; status: string; created_at: string;
}
interface UniRow {
  id: number; abbr: string; name: string; type: string;
  location: string; qs_ranking: number | null;
  color: string; description: string; website: string; domain: string;
  tuition_min: number; tuition_max: number; established: number | null;
  students_count: number | null; programs_count: number;
}
interface InstituteRow {
  id: number; abbr: string; name: string; type: string;
  location: string; color: string; description: string;
  website: string; domain: string; tuition_min: number;
  tuition_max: number; established: number | null;
  students_count: number | null;
}
interface Stats {
  universities: number; institutes: number; programs: number;
  leads: number; students: number; new_today: number; pending: number;
}
interface Reservation {
  id: number; name: string; email: string; phone: string;
  university: string; field: string; preferred_date: string;
  notes: string; status: string; created_at: string;
}
interface ProgramRow {
  id: number; university_id: number; name: string; level: string;
  duration_years: number; tuition_per_year: number; field: string;
  description: string; intake: string;
}
interface Student {
  id: number; full_name: string; email: string; phone: string;
  nationality: string; field: string; university: string; status: string;
  notes: string; created_at: string; updated_at: string;
}

/* ─── Icon set ───────────────────────────────────────────────────────────── */
const I = { viewBox:'0 0 24 24', width:18, height:18, fill:'none', strokeWidth:'1.75', strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
const ic = (stroke: string) => ({ ...I, stroke });

const Icons = {
  Grid:   (c='#fff') => <svg {...ic(c)}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Users:  (c='#fff') => <svg {...ic(c)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Uni:    (c='#fff') => <svg {...ic(c)}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Check:  (c=T.green)  => <svg {...ic(c)} width={14} height={14}><polyline points="20 6 9 17 4 12"/></svg>,
  Trash:  (c=T.red)    => <svg {...ic(c)} width={14} height={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Save:   (c=T.purple) => <svg {...ic(c)} width={14} height={14}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Plus:   (c='#fff')   => <svg {...ic(c)} width={14} height={14}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   (c=T.muted)  => <svg {...ic(c)} width={14} height={14}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Search: (c=T.muted)  => <svg {...ic(c)} width={15} height={15}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Lock:   (c=T.muted)  => <svg {...ic(c)}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Logout:    (c='rgba(255,255,255,0.45)') => <svg {...ic(c)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Calendar:  (c='#fff') => <svg {...ic(c)}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

const INPUT: React.CSSProperties = {
  width:'100%', minHeight:42, padding:'10px 12px', borderRadius:10,
  border:`1px solid ${T.border}`, background:'#fff', color:T.text,
  fontSize:13, outline:'none', boxSizing:'border-box',
};

const FIELD_STYLE: React.CSSProperties = {
  display:'flex', flexDirection:'column', gap:6, minWidth:0,
};

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label style={{ ...FIELD_STYLE, gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:'0.8px', textTransform:'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  children, onClick, tone = 'plain', disabled = false, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; tone?: 'plain' | 'primary' | 'danger' | 'success'; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const styles: Record<string, React.CSSProperties> = {
    plain:   { background:T.card, color:T.text, border:`1px solid ${T.border}` },
    primary: { background:T.purple, color:'#fff', border:`1px solid ${T.purple}` },
    danger:  { background:'#FEF2F2', color:T.red, border:'1px solid #FECACA' },
    success: { background:'#ECFDF5', color:T.green, border:'1px solid #A7F3D0' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles[tone], minHeight:44, padding:'0 14px', borderRadius:10, fontSize:12, fontWeight:800, cursor: disabled ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, opacity: disabled ? 0.55 : 1 }}>
      {children}
    </button>
  );
}

function dateShort(value: string) {
  if (!value) return '-';
  return new Date(`${value}Z`).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function numText(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

/* ─── LOGIN SCREEN ───────────────────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = pw.trim();
    if (!key) return;
    setLoading(true);
    try {
      await apiFetch('/stats', { headers: { 'X-Admin-Key': key } });
      sessionStorage.setItem(ADMIN_STORAGE_KEY, key);
      onLogin();
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380, background:T.card, borderRadius:20, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        {/* top bar */}
        <div style={{ background:T.sidebar, padding:'28px 32px', textAlign:'center' }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            {Icons.Lock('rgba(196,181,253,0.8)')}
          </div>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>Admin Access</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:4 }}>NajmUni Management Portal</div>
        </div>

        <form onSubmit={submit} style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.muted, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:7 }}>Admin Password</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} placeholder="Enter password…"
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${err ? T.red : T.border}`, fontSize:13, outline:'none', color:T.text, transition:'border-color 0.2s', boxSizing:'border-box' }}
              onFocus={e => { if (!err) e.currentTarget.style.borderColor = '#D8DEFF'; }}
              onBlur={e => { e.currentTarget.style.borderColor = err ? T.red : T.border; }} />
            {err && <div style={{ fontSize:11, color:T.red, marginTop:5 }}>Incorrect password. Try again.</div>}
          </div>
          <button type="submit" disabled={!pw.trim() || loading}
            style={{ padding:'12px', borderRadius:10, border:'none', background: pw.trim() ? T.purple : '#F3F4F6', color: pw.trim() ? '#fff' : T.muted, fontSize:13, fontWeight:700, cursor: pw.trim() ? 'pointer' : 'default', transition:'all 0.2s' }}>
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color = T.purple }: { label: string; value: number | string; icon: React.ReactNode; color?: string }) {
  return (
    <div style={{ background:T.card, borderRadius:16, padding:'20px 22px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px', lineHeight:1.2 }}>{value}</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD TAB ──────────────────────────────────────────────────────── */
function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch('/stats').then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div style={{ padding:40, color:T.muted, fontSize:13 }}>Loading stats…</div>;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Overview</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Admin Dashboard</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:32 }}>
        <StatCard label="Total Student Requests" value={stats.leads}        icon={Icons.Users(T.purple)} color={T.purple} />
        <StatCard label="Pending Requests"        value={stats.pending}     icon={Icons.Users(T.amber)}  color={T.amber}  />
        <StatCard label="New Today"               value={stats.new_today}   icon={Icons.Users(T.green)}  color={T.green}  />
        <StatCard label="Students CRM"            value={stats.students}    icon={Icons.Users(T.green)}  color={T.green}  />
        <StatCard label="Universities"            value={stats.universities} icon={Icons.Uni(T.purple)}   color={T.purple} />
        <StatCard label="Institutes"              value={stats.institutes ?? 0} icon={Icons.Uni(T.amber)}  color={T.amber}  />
        <StatCard label="Programmes"              value={stats.programs}    icon={Icons.Grid(T.purple)}  color={T.purple} />
      </div>

      <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, padding:'22px 24px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>Quick Tips</div>
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
          {[
            'Go to "Student Requests" to view and manage enquiries.',
            'Use "Students CRM" to track each student from enquiry to enrolment.',
            'Go to "Universities" to add universities, edit details, and manage programmes.',
            'Use "Institutes" to manage language centres and pathway partners shown in the partner strip.',
            'Marking a request as "Handled" keeps your queue clean.',
            'Admin password is configured with the ADMIN_KEY environment variable.',
          ].map((tip, i) => (
            <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:13, color:T.muted }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#D8DEFF', marginTop:5, flexShrink:0 }}/>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── STUDENT REQUESTS TAB ────────────────────────────────────────────────── */
function LeadsTab() {
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all'|'new'|'handled'>('all');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/leads').then(d => { setLeads(d.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markHandled(id: number) {
    await apiFetch(`/leads/${id}`, { method:'PATCH', body: JSON.stringify({ status:'handled' }) });
    setLeads(prev => prev.map(l => l.id===id ? { ...l, status:'handled' } : l));
  }

  async function deleteLead(id: number) {
    if (!confirm('Delete this request permanently?')) return;
    await apiFetch(`/leads/${id}`, { method:'DELETE' });
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  const visible = leads.filter(l => filter==='all' || l.status===filter);

  const STATUS_COLORS: Record<string, string> = { new: T.green, handled: T.muted };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Management</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Student Requests</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {(['all','new','handled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'8px 16px', borderRadius:50, border:`1px solid ${filter===f ? T.purple : T.border}`, background: filter===f ? T.purpleL : T.card, color: filter===f ? T.purple : T.muted, fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {f === 'all' ? `All (${leads.length})` : f === 'new' ? `New (${leads.filter(l=>l.status==='new').length})` : `Handled (${leads.filter(l=>l.status==='handled').length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>Loading requests…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:T.muted, fontSize:13 }}>No {filter !== 'all' ? filter : ''} requests found.</div>
      ) : (
        <div className="admin-table-card" style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          {/* table header */}
          <div className="admin-table-header" style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr 90px 100px 110px 90px', gap:0, padding:'12px 20px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
            {['Name','Phone','Source','Status','Date','Actions'].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>
            ))}
          </div>
          {visible.map((lead, i) => (
            <div className="admin-table-row admin-lead-row" key={lead.id} style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr 90px 100px 110px 90px', gap:0, padding:'14px 20px', borderBottom: i < visible.length-1 ? `1px solid ${T.border}` : 'none', alignItems:'center', transition:'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.bg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{lead.name || '—'}</div>
              <div style={{ fontSize:12, color:T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>{lead.phone || lead.email || '—'}</div>
              <div style={{ fontSize:11, color:T.muted, textTransform:'capitalize' }}>{lead.source}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, color: STATUS_COLORS[lead.status] ?? T.muted, background:`${STATUS_COLORS[lead.status] ?? T.muted}14`, borderRadius:20, padding:'3px 9px', textTransform:'capitalize' }}>
                  {lead.status}
                </span>
              </div>
              <div style={{ fontSize:11, color:T.muted }}>{lead.created_at.slice(0,10)}</div>
              <div style={{ display:'flex', gap:8 }}>
                {lead.status === 'new' && (
                  <button onClick={() => markHandled(lead.id)} title="Mark handled"
                    style={{ width:28, height:28, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.green; (e.currentTarget as HTMLElement).style.background = '#F0FDF4'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.card; }}>
                    {Icons.Check()}
                  </button>
                )}
                <button onClick={() => deleteLead(lead.id)} title="Delete"
                  style={{ width:28, height:28, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.red; (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.card; }}>
                  {Icons.Trash()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── UNIVERSITIES PRICE TAB ─────────────────────────────────────────────── */
function UniversitiesTab() {
  const [unis, setUnis]   = useState<UniRow[]>([]);
  const [edits, setEdits] = useState<Record<number, { min: string; max: string }>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved,  setSaved]  = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/universities')
      .then(d => {
        setUnis(d.data);
        const init: typeof edits = {};
        d.data.forEach((u: UniRow) => { init[u.id] = { min: String(u.tuition_min), max: String(u.tuition_max) }; });
        setEdits(init);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  function setEdit(id: number, field: 'min'|'max', val: string) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    setSaved(prev => ({ ...prev, [id]: false }));
  }

  async function save(u: UniRow) {
    const e = edits[u.id];
    const min = parseInt(e.min), max = parseInt(e.max);
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      alert('Invalid values. Max must be ≥ Min.');
      return;
    }
    setSaving(prev => ({ ...prev, [u.id]: true }));
    try {
      await apiFetch(`/universities/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tuition_min: min, tuition_max: max }),
      });
      setUnis(prev => prev.map(r => r.id===u.id ? { ...r, tuition_min:min, tuition_max:max } : r));
      setSaved(prev => ({ ...prev, [u.id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [u.id]: false })), 2000);
    } finally {
      setSaving(prev => ({ ...prev, [u.id]: false }));
    }
  }

  const TYPE_COLORS: Record<string, string> = { public:'#059669', private: T.purple, foreign_branch:'#2563EB' };
  const TYPE_LABELS: Record<string, string> = { public:'Public', private:'Private', foreign_branch:'Branch' };

  const inputStyle = (dirty: boolean): React.CSSProperties => ({
    width:'100%', padding:'7px 10px', borderRadius:8,
    border:`1px solid ${dirty ? '#D8DEFF' : T.border}`,
    fontSize:12, fontWeight:600, color:T.text, outline:'none', transition:'border-color 0.2s', boxSizing:'border-box',
  });

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Price Management</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>University Tuition Fees</div>
        <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Edit and save tuition ranges — changes apply immediately to the website.</div>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>Loading universities…</div>
      ) : (
        <div className="admin-table-card" style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          {/* header */}
          <div className="admin-table-header" style={{ display:'grid', gridTemplateColumns:'48px 80px 1fr 80px 140px 140px 80px', gap:0, padding:'12px 20px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
            {['','Abbr','Name','Type','Min / yr (RM)','Max / yr (RM)','Save'].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>
            ))}
          </div>

          {unis.map((u, i) => {
            const e = edits[u.id] ?? { min: String(u.tuition_min), max: String(u.tuition_max) };
            const dirty = parseInt(e.min) !== u.tuition_min || parseInt(e.max) !== u.tuition_max;
            const isSaving = saving[u.id];
            const wasSaved = saved[u.id];

            return (
              <div className="admin-table-row admin-uni-row" key={u.id} style={{ display:'grid', gridTemplateColumns:'48px 80px 1fr 80px 140px 140px 80px', gap:0, padding:'12px 20px', borderBottom: i < unis.length-1 ? `1px solid ${T.border}` : 'none', alignItems:'center', transition:'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.bg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>

                {/* logo */}
                <UniMiniLogo u={u} />

                {/* abbr */}
                <div style={{ fontSize:12, fontWeight:800, color:T.text }}>{u.abbr}</div>

                {/* name */}
                <div style={{ fontSize:12, color:T.muted, paddingRight:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>

                {/* type badge */}
                <div>
                  <span style={{ fontSize:9, fontWeight:700, color: TYPE_COLORS[u.type], background:`${TYPE_COLORS[u.type]}12`, borderRadius:20, padding:'2px 7px', letterSpacing:'0.3px' }}>
                    {TYPE_LABELS[u.type]}
                  </span>
                </div>

                {/* min input */}
                <div style={{ paddingRight:8 }}>
                  <input type="number" value={e.min} min={0}
                    onChange={ev => setEdit(u.id, 'min', ev.target.value)}
                    style={inputStyle(parseInt(e.min) !== u.tuition_min)}
                    onFocus={ev => { ev.currentTarget.style.borderColor='#D8DEFF'; }}
                    onBlur={ev => { if (parseInt(e.min)===u.tuition_min) ev.currentTarget.style.borderColor=T.border; }} />
                </div>

                {/* max input */}
                <div style={{ paddingRight:8 }}>
                  <input type="number" value={e.max} min={0}
                    onChange={ev => setEdit(u.id, 'max', ev.target.value)}
                    style={inputStyle(parseInt(e.max) !== u.tuition_max)}
                    onFocus={ev => { ev.currentTarget.style.borderColor='#D8DEFF'; }}
                    onBlur={ev => { if (parseInt(e.max)===u.tuition_max) ev.currentTarget.style.borderColor=T.border; }} />
                </div>

                {/* save button */}
                <button onClick={() => save(u)} disabled={!dirty || isSaving}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:`1px solid ${wasSaved ? T.green : dirty ? T.purple : T.border}`, background: wasSaved ? '#F0FDF4' : dirty ? T.purpleL : T.card, color: wasSaved ? T.green : dirty ? T.purple : T.muted, fontSize:11, fontWeight:700, cursor: dirty ? 'pointer' : 'default', transition:'all 0.2s', whiteSpace:'nowrap' }}>
                  {isSaving ? '…' : wasSaved ? <>{Icons.Check(T.green)} Saved</> : <>{Icons.Save()} Save</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── UNIVERSITIES CMS TAB ───────────────────────────────────────────────── */
const ADMIN_TYPE_COLORS: Record<string, string> = { public:'#059669', private:T.purple, foreign_branch:'#2563EB' };
const ADMIN_TYPE_LABELS: Record<string, string> = { public:'Public', private:'Private', foreign_branch:'Branch' };
const UNIVERSITY_TYPES = [
  { value:'private', label:'Private' },
  { value:'public', label:'Public' },
  { value:'foreign_branch', label:'Foreign Branch' },
];

type UniForm = {
  abbr: string; name: string; type: string; location: string; qs_ranking: string;
  color: string; description: string; website: string; domain: string;
  tuition_min: string; tuition_max: string; established: string; students_count: string;
};

const EMPTY_UNI: UniForm = {
  abbr:'', name:'', type:'private', location:'', qs_ranking:'',
  color:T.purple, description:'', website:'', domain:'',
  tuition_min:'0', tuition_max:'0', established:'', students_count:'0',
};

function toUniForm(u: UniRow): UniForm {
  return {
    abbr:u.abbr ?? '', name:u.name ?? '', type:u.type ?? 'private', location:u.location ?? '',
    qs_ranking:numText(u.qs_ranking), color:u.color || T.purple,
    description:u.description ?? '', website:u.website ?? '', domain:u.domain ?? '',
    tuition_min:numText(u.tuition_min ?? 0), tuition_max:numText(u.tuition_max ?? 0),
    established:numText(u.established), students_count:numText(u.students_count ?? 0),
  };
}

function intFrom(value: string, fallback: number | null) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function uniPayload(form: UniForm) {
  return {
    ...form,
    abbr: form.abbr.trim().toUpperCase(),
    name: form.name.trim(),
    location: form.location.trim(),
    domain: form.domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    qs_ranking: intFrom(form.qs_ranking, null),
    tuition_min: intFrom(form.tuition_min, 0),
    tuition_max: intFrom(form.tuition_max, 0),
    established: intFrom(form.established, null),
    students_count: intFrom(form.students_count, 0),
  };
}

function UniversitiesManagerTab() {
  const [unis, setUnis] = useState<UniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UniForm>(EMPTY_UNI);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/universities');
      const data: UniRow[] = d.data ?? [];
      setUnis(data);
      setSelectedId(prev => {
        if (prev && data.some(u => u.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = unis.find(u => u.id === selectedId) ?? null;
  useEffect(() => {
    if (!creating && selected) setForm(toUniForm(selected));
  }, [creating, selectedId, selected?.id]);

  function patchForm<K extends keyof UniForm>(key: K, value: UniForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function editUni(u: UniRow) {
    setCreating(false);
    setSelectedId(u.id);
    setForm(toUniForm(u));
  }

  function addUni() {
    setCreating(true);
    setSelectedId(null);
    setForm(EMPTY_UNI);
  }

  async function saveUni() {
    if (!form.abbr.trim() || !form.name.trim() || !form.location.trim()) {
      alert('Abbr, name, and location are required.');
      return;
    }
    const payload = uniPayload(form);
    if ((payload.tuition_max ?? 0) < (payload.tuition_min ?? 0)) {
      alert('Max tuition must be greater than or equal to min tuition.');
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        const d = await apiFetch('/universities', { method:'POST', body: JSON.stringify(payload) });
        setUnis(prev => [...prev, d.university].sort((a, b) => a.name.localeCompare(b.name)));
        setCreating(false);
        setSelectedId(d.university.id);
      } else if (selected) {
        const d = await apiFetch(`/universities/${selected.id}`, { method:'PATCH', body: JSON.stringify(payload) });
        setUnis(prev => prev.map(u => u.id === selected.id ? d.university : u));
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteUni() {
    if (!selected || !confirm(`Delete ${selected.name} and all its programmes?`)) return;
    await apiFetch(`/universities/${selected.id}`, { method:'DELETE' });
    setUnis(prev => prev.filter(u => u.id !== selected.id));
    setSelectedId(null);
    setCreating(false);
    setForm(EMPTY_UNI);
  }

  const visible = unis.filter(u => {
    const haystack = `${u.abbr} ${u.name} ${u.location}`.toLowerCase();
    return haystack.includes(q.toLowerCase()) && (type === 'all' || u.type === type);
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, flexWrap:'wrap', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Content Manager</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Universities & Programmes</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Add universities, edit website details, and manage programmes from one place.</div>
        </div>
        <ActionButton tone="primary" onClick={addUni}>{Icons.Plus()} Add University</ActionButton>
      </div>

      <div className="admin-cms-layout" style={{ display:'grid', gridTemplateColumns:'minmax(280px,360px) minmax(0,1fr)', gap:18, alignItems:'start' }}>
        <section style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex' }}>{Icons.Search('#9CA3AF')}</span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search university..." style={{ ...INPUT, paddingLeft:36 }} />
            </div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>
              <option value="all">All types</option>
              {UNIVERSITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="admin-uni-list" style={{ display:'grid', gap:10 }}>
            {loading ? (
              <div style={{ padding:24, textAlign:'center', color:T.muted, fontSize:13 }}>Loading universities...</div>
            ) : visible.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', color:T.muted, fontSize:13, background:T.card, border:`1px solid ${T.border}`, borderRadius:14 }}>No universities found.</div>
            ) : visible.map(u => {
              const active = !creating && selectedId === u.id;
              return (
                <button key={u.id} onClick={() => editUni(u)}
                  style={{ width:'100%', textAlign:'left', background:active ? '#F3F5FF' : T.card, border:`1px solid ${active ? '#D8DEFF' : T.border}`, borderRadius:14, padding:14, display:'grid', gridTemplateColumns:'40px 1fr', gap:12, cursor:'pointer' }}>
                  <UniMiniLogo u={u} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:900, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.abbr}</div>
                      <span style={{ fontSize:10, fontWeight:800, color:ADMIN_TYPE_COLORS[u.type] ?? T.muted, background:`${ADMIN_TYPE_COLORS[u.type] ?? T.muted}14`, borderRadius:999, padding:'3px 8px' }}>
                        {ADMIN_TYPE_LABELS[u.type] ?? u.type}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:T.text, fontWeight:700, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{u.location || '-'} - {u.programs_count ?? 0} programmes</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ display:'grid', gap:16 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:T.text }}>{creating ? 'New University' : selected ? selected.name : 'Select a university'}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{creating ? 'Fill the core information first, then add programmes.' : 'Details below are used across the public site and comparison tools.'}</div>
              </div>
              {!creating && selected && <ActionButton tone="danger" onClick={deleteUni}>{Icons.Trash(T.red)} Delete</ActionButton>}
            </div>

            <div className="admin-form-grid" style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:14 }}>
              <Field label="Short Name"><input value={form.abbr} onChange={e => patchForm('abbr', e.target.value)} placeholder="APU" style={INPUT} /></Field>
              <Field label="Type"><select value={form.type} onChange={e => patchForm('type', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>{UNIVERSITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
              <Field label="Full Name" full><input value={form.name} onChange={e => patchForm('name', e.target.value)} placeholder="Asia Pacific University" style={INPUT} /></Field>
              <Field label="Location"><input value={form.location} onChange={e => patchForm('location', e.target.value)} placeholder="Kuala Lumpur" style={INPUT} /></Field>
              <Field label="QS Ranking"><input type="number" value={form.qs_ranking} onChange={e => patchForm('qs_ranking', e.target.value)} placeholder="Optional" style={INPUT} /></Field>
              <Field label="Min Tuition / Year"><input type="number" min={0} value={form.tuition_min} onChange={e => patchForm('tuition_min', e.target.value)} style={INPUT} /></Field>
              <Field label="Max Tuition / Year"><input type="number" min={0} value={form.tuition_max} onChange={e => patchForm('tuition_max', e.target.value)} style={INPUT} /></Field>
              <Field label="Established"><input type="number" value={form.established} onChange={e => patchForm('established', e.target.value)} placeholder="1993" style={INPUT} /></Field>
              <Field label="Students Count"><input type="number" min={0} value={form.students_count} onChange={e => patchForm('students_count', e.target.value)} placeholder="14000" style={INPUT} /></Field>
              <Field label="Website"><input value={form.website} onChange={e => patchForm('website', e.target.value)} placeholder="https://..." style={INPUT} /></Field>
              <Field label="Logo Domain"><input value={form.domain} onChange={e => patchForm('domain', e.target.value)} placeholder="apu.edu.my" style={INPUT} /></Field>
              <Field label="Brand Color">
                <div style={{ display:'grid', gridTemplateColumns:'52px 1fr', gap:10 }}>
                  <input type="color" value={form.color || T.purple} onChange={e => patchForm('color', e.target.value)} style={{ width:'100%', minHeight:42, border:`1px solid ${T.border}`, borderRadius:10, padding:3, background:'#fff' }} />
                  <input value={form.color} onChange={e => patchForm('color', e.target.value)} style={INPUT} />
                </div>
              </Field>
              <Field label="Description" full><textarea value={form.description} onChange={e => patchForm('description', e.target.value)} placeholder="Short public description..." style={{ ...INPUT, minHeight:96, resize:'vertical' }} /></Field>
            </div>

            <div style={{ padding:'0 20px 20px', display:'flex', justifyContent:'flex-end', gap:10, flexWrap:'wrap' }}>
              <ActionButton onClick={() => { selected ? editUni(selected) : addUni(); }}>Reset</ActionButton>
              <ActionButton tone="primary" onClick={saveUni} disabled={saving}>{Icons.Save('#fff')} {saving ? 'Saving...' : creating ? 'Create University' : 'Save Changes'}</ActionButton>
            </div>
          </div>

          {!creating && selected && <ProgramManager university={selected} onChanged={load} />}
        </section>
      </div>
    </div>
  );
}

type ProgramForm = {
  name: string; level: string; duration_years: string; tuition_per_year: string;
  field: string; description: string; intake: string;
};
const EMPTY_PROGRAM: ProgramForm = { name:'', level:'bachelor', duration_years:'3', tuition_per_year:'0', field:'Business', description:'', intake:'' };
const PROGRAM_LEVELS = ['foundation', 'diploma', 'bachelor', 'master', 'phd'];
const STUDY_FIELDS = ['Engineering', 'Medicine & Healthcare', 'Business', 'Technology & AI', 'Law', 'Architecture', 'Aviation', 'Pharmacy', 'Psychology', 'Arts & Design', 'Science', 'Other'];

function toProgramForm(p: ProgramRow): ProgramForm {
  return {
    name:p.name ?? '', level:p.level ?? 'bachelor', duration_years:String(p.duration_years ?? ''),
    tuition_per_year:String(p.tuition_per_year ?? 0), field:p.field ?? '',
    description:p.description ?? '', intake:p.intake ?? '',
  };
}

function ProgramManager({ university, onChanged }: { university: UniRow; onChanged: () => void }) {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [form, setForm] = useState<ProgramForm>(EMPTY_PROGRAM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/universities/${university.id}/programs`);
      setPrograms(d.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [university.id]);

  useEffect(() => {
    setEditingId(null);
    setForm(EMPTY_PROGRAM);
    load();
  }, [load]);

  function set<K extends keyof ProgramForm>(key: K, value: ProgramForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function saveProgram() {
    if (!form.name.trim() || !form.field.trim() || !form.level.trim()) {
      alert('Program name, field, and level are required.');
      return;
    }
    const payload = { ...form, duration_years:Number(form.duration_years || 0), tuition_per_year:Number(form.tuition_per_year || 0) };
    setSaving(true);
    try {
      if (editingId) {
        const d = await apiFetch(`/programs/${editingId}`, { method:'PATCH', body: JSON.stringify(payload) });
        setPrograms(prev => prev.map(p => p.id === editingId ? d.program : p));
      } else {
        const d = await apiFetch(`/universities/${university.id}/programs`, { method:'POST', body: JSON.stringify(payload) });
        setPrograms(prev => [...prev, d.program]);
      }
      setEditingId(null);
      setForm(EMPTY_PROGRAM);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function deleteProgram(p: ProgramRow) {
    if (!confirm(`Delete ${p.name}?`)) return;
    await apiFetch(`/programs/${p.id}`, { method:'DELETE' });
    setPrograms(prev => prev.filter(row => row.id !== p.id));
    onChanged();
  }

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden' }}>
      <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:15, fontWeight:900, color:T.text }}>Programmes</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Add degrees and edit small details shown in search, AI, and university pages.</div>
      </div>

      <div className="admin-form-grid" style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, borderBottom:`1px solid ${T.border}` }}>
        <Field label="Program Name" full><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bachelor of Computer Science" style={INPUT} /></Field>
        <Field label="Level"><select value={form.level} onChange={e => set('level', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>{PROGRAM_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</select></Field>
        <Field label="Field"><select value={form.field} onChange={e => set('field', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>{STUDY_FIELDS.map(field => <option key={field} value={field}>{field}</option>)}</select></Field>
        <Field label="Years"><input type="number" step="0.5" min={0} value={form.duration_years} onChange={e => set('duration_years', e.target.value)} style={INPUT} /></Field>
        <Field label="Tuition / Year"><input type="number" min={0} value={form.tuition_per_year} onChange={e => set('tuition_per_year', e.target.value)} style={INPUT} /></Field>
        <Field label="Intake"><input value={form.intake} onChange={e => set('intake', e.target.value)} placeholder="Feb, Jun, Oct" style={INPUT} /></Field>
        <Field label="Description" full><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short programme note..." style={{ ...INPUT, minHeight:72, resize:'vertical' }} /></Field>
        <div style={{ gridColumn:'1 / -1', display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
          {editingId && <ActionButton onClick={() => { setEditingId(null); setForm(EMPTY_PROGRAM); }}>Cancel Edit</ActionButton>}
          <ActionButton tone="primary" onClick={saveProgram} disabled={saving}>{Icons.Save('#fff')} {saving ? 'Saving...' : editingId ? 'Update Programme' : 'Add Programme'}</ActionButton>
        </div>
      </div>

      <div className="admin-table-card" style={{ overflow:'hidden' }}>
        <div className="admin-table-header" style={{ display:'grid', gridTemplateColumns:'1.6fr 100px 1fr 90px 110px 110px', padding:'12px 18px', background:T.bg, borderBottom:`1px solid ${T.border}` }}>
          {['Programme','Level','Field','Years','Fee / yr','Actions'].map(h => <div key={h} style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>)}
        </div>
        {loading ? (
          <div style={{ padding:28, textAlign:'center', color:T.muted, fontSize:13 }}>Loading programmes...</div>
        ) : programs.length === 0 ? (
          <div style={{ padding:28, textAlign:'center', color:T.muted, fontSize:13 }}>No programmes yet.</div>
        ) : programs.map((p, i) => (
          <div className="admin-table-row" key={p.id} style={{ display:'grid', gridTemplateColumns:'1.6fr 100px 1fr 90px 110px 110px', padding:'13px 18px', borderBottom:i < programs.length - 1 ? `1px solid ${T.border}` : 'none', alignItems:'center', gap:8 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
              {p.intake && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Intake: {p.intake}</div>}
            </div>
            <div style={{ fontSize:12, color:T.muted, textTransform:'capitalize' }}>{p.level}</div>
            <div style={{ fontSize:12, color:T.muted }}>{p.field}</div>
            <div style={{ fontSize:12, color:T.muted }}>{p.duration_years}</div>
            <div style={{ fontSize:12, fontWeight:800, color:T.text }}>RM {Number(p.tuition_per_year || 0).toLocaleString()}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button title="Edit" onClick={() => { setEditingId(p.id); setForm(toProgramForm(p)); }} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer' }}>{Icons.Edit()}</button>
              <button title="Delete" onClick={() => deleteProgram(p)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer' }}>{Icons.Trash()}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── RESERVATIONS TAB ───────────────────────────────────────────────────── */
/* Institutes CMS Tab */
const INSTITUTE_TYPE_COLORS: Record<string, string> = { language:T.purple, pathway:'#059669', training:T.amber };
const INSTITUTE_TYPE_LABELS: Record<string, string> = { language:'Language', pathway:'Pathway', training:'Training' };
const INSTITUTE_TYPES = [
  { value:'language', label:'Language' },
  { value:'pathway', label:'Pathway' },
  { value:'training', label:'Training' },
];

type InstituteForm = {
  abbr: string; name: string; type: string; location: string;
  color: string; description: string; website: string; domain: string;
  tuition_min: string; tuition_max: string; established: string; students_count: string;
};

const EMPTY_INSTITUTE: InstituteForm = {
  abbr:'', name:'', type:'language', location:'',
  color:T.purple, description:'', website:'', domain:'',
  tuition_min:'0', tuition_max:'0', established:'', students_count:'0',
};

function toInstituteForm(item: InstituteRow): InstituteForm {
  return {
    abbr:item.abbr ?? '', name:item.name ?? '', type:item.type ?? 'language', location:item.location ?? '',
    color:item.color || T.purple, description:item.description ?? '', website:item.website ?? '', domain:item.domain ?? '',
    tuition_min:numText(item.tuition_min ?? 0), tuition_max:numText(item.tuition_max ?? 0),
    established:numText(item.established), students_count:numText(item.students_count ?? 0),
  };
}

function institutePayload(form: InstituteForm) {
  return {
    ...form,
    abbr: form.abbr.trim(),
    name: form.name.trim(),
    location: form.location.trim(),
    domain: form.domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    tuition_min: intFrom(form.tuition_min, 0),
    tuition_max: intFrom(form.tuition_max, 0),
    established: intFrom(form.established, null),
    students_count: intFrom(form.students_count, 0),
  };
}

function InstitutesManagerTab() {
  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<InstituteForm>(EMPTY_INSTITUTE);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/institutes')
      .then(d => {
        const rows = d.data ?? [];
        setInstitutes(rows);
        setLoading(false);
        setSelectedId(prev => prev ?? rows[0]?.id ?? null);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = institutes.find(i => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!creating && selected) setForm(toInstituteForm(selected));
  }, [selected, creating]);

  function patchForm<K extends keyof InstituteForm>(key: K, value: InstituteForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addInstitute() {
    setCreating(true);
    setSelectedId(null);
    setForm(EMPTY_INSTITUTE);
  }

  function editInstitute(item: InstituteRow) {
    setCreating(false);
    setSelectedId(item.id);
    setForm(toInstituteForm(item));
  }

  async function saveInstitute() {
    if (!form.abbr.trim() || !form.name.trim() || !form.location.trim()) {
      alert('Short name, full name, and location are required.');
      return;
    }
    const payload = institutePayload(form);
    setSaving(true);
    try {
      if (creating) {
        const d = await apiFetch('/institutes', { method:'POST', body: JSON.stringify(payload) });
        setInstitutes(prev => [...prev, d.institute].sort((a, b) => a.name.localeCompare(b.name)));
        setCreating(false);
        setSelectedId(d.institute.id);
      } else if (selected) {
        const d = await apiFetch(`/institutes/${selected.id}`, { method:'PATCH', body: JSON.stringify(payload) });
        setInstitutes(prev => prev.map(i => i.id === selected.id ? d.institute : i));
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteInstitute() {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await apiFetch(`/institutes/${selected.id}`, { method:'DELETE' });
    setInstitutes(prev => prev.filter(i => i.id !== selected.id));
    setSelectedId(null);
    setCreating(false);
    setForm(EMPTY_INSTITUTE);
  }

  const visible = institutes.filter(i => {
    const haystack = `${i.abbr} ${i.name} ${i.location}`.toLowerCase();
    return haystack.includes(q.toLowerCase()) && (type === 'all' || i.type === type);
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, flexWrap:'wrap', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Content Manager</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Institutes</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Add language centres, pathway partners, and training institutes shown on the public site.</div>
        </div>
        <ActionButton tone="primary" onClick={addInstitute}>{Icons.Plus()} Add Institute</ActionButton>
      </div>

      <div className="admin-cms-layout" style={{ display:'grid', gridTemplateColumns:'minmax(280px,360px) minmax(0,1fr)', gap:18, alignItems:'start' }}>
        <section style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex' }}>{Icons.Search('#9CA3AF')}</span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search institute..." style={{ ...INPUT, paddingLeft:36 }} />
            </div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>
              <option value="all">All types</option>
              {INSTITUTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="admin-uni-list" style={{ display:'grid', gap:10 }}>
            {loading ? (
              <div style={{ padding:24, textAlign:'center', color:T.muted, fontSize:13 }}>Loading institutes...</div>
            ) : visible.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', color:T.muted, fontSize:13, background:T.card, border:`1px solid ${T.border}`, borderRadius:14 }}>No institutes found.</div>
            ) : visible.map(item => {
              const active = !creating && selectedId === item.id;
              return (
                <button key={item.id} onClick={() => editInstitute(item)}
                  style={{ width:'100%', textAlign:'left', background:active ? '#F3F5FF' : T.card, border:`1px solid ${active ? '#D8DEFF' : T.border}`, borderRadius:14, padding:14, display:'grid', gridTemplateColumns:'40px 1fr', gap:12, cursor:'pointer' }}>
                  <InstituteMiniLogo item={item} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:900, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.abbr}</div>
                      <span style={{ fontSize:10, fontWeight:800, color:INSTITUTE_TYPE_COLORS[item.type] ?? T.muted, background:`${INSTITUTE_TYPE_COLORS[item.type] ?? T.muted}14`, borderRadius:999, padding:'3px 8px' }}>
                        {INSTITUTE_TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:T.text, fontWeight:700, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{item.location || '-'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:T.text }}>{creating ? 'New Institute' : selected ? selected.name : 'Select an institute'}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{creating ? 'Fill the institute details, then save it.' : 'These details are used in the public partner strip.'}</div>
            </div>
            {!creating && selected && <ActionButton tone="danger" onClick={deleteInstitute}>{Icons.Trash(T.red)} Delete</ActionButton>}
          </div>

          <div className="admin-form-grid" style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:14 }}>
            <Field label="Short Name"><input value={form.abbr} onChange={e => patchForm('abbr', e.target.value)} placeholder="ELS" style={INPUT} /></Field>
            <Field label="Type"><select value={form.type} onChange={e => patchForm('type', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>{INSTITUTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
            <Field label="Full Name" full><input value={form.name} onChange={e => patchForm('name', e.target.value)} placeholder="ELS Language Centres Malaysia" style={INPUT} /></Field>
            <Field label="Location"><input value={form.location} onChange={e => patchForm('location', e.target.value)} placeholder="Kuala Lumpur" style={INPUT} /></Field>
            <Field label="Established"><input type="number" value={form.established} onChange={e => patchForm('established', e.target.value)} placeholder="1990" style={INPUT} /></Field>
            <Field label="Min Tuition"><input type="number" min={0} value={form.tuition_min} onChange={e => patchForm('tuition_min', e.target.value)} style={INPUT} /></Field>
            <Field label="Max Tuition"><input type="number" min={0} value={form.tuition_max} onChange={e => patchForm('tuition_max', e.target.value)} style={INPUT} /></Field>
            <Field label="Students Count"><input type="number" min={0} value={form.students_count} onChange={e => patchForm('students_count', e.target.value)} placeholder="1200" style={INPUT} /></Field>
            <Field label="Website"><input value={form.website} onChange={e => patchForm('website', e.target.value)} placeholder="https://..." style={INPUT} /></Field>
            <Field label="Logo Domain"><input value={form.domain} onChange={e => patchForm('domain', e.target.value)} placeholder="els.edu.my" style={INPUT} /></Field>
            <Field label="Brand Color">
              <div style={{ display:'grid', gridTemplateColumns:'52px 1fr', gap:10 }}>
                <input type="color" value={form.color || T.purple} onChange={e => patchForm('color', e.target.value)} style={{ width:'100%', minHeight:42, border:`1px solid ${T.border}`, borderRadius:10, padding:3, background:'#fff' }} />
                <input value={form.color} onChange={e => patchForm('color', e.target.value)} style={INPUT} />
              </div>
            </Field>
            <Field label="Description" full><textarea value={form.description} onChange={e => patchForm('description', e.target.value)} placeholder="Short public description..." style={{ ...INPUT, minHeight:96, resize:'vertical' }} /></Field>
          </div>

          <div style={{ padding:'0 20px 20px', display:'flex', justifyContent:'flex-end', gap:10, flexWrap:'wrap' }}>
            <ActionButton onClick={() => { selected ? editInstitute(selected) : addInstitute(); }}>Reset</ActionButton>
            <ActionButton tone="primary" onClick={saveInstitute} disabled={saving}>{Icons.Save('#fff')} {saving ? 'Saving...' : creating ? 'Create Institute' : 'Save Changes'}</ActionButton>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReservationsTab() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all'|'new'|'handled'>('all');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/reservations').then(d => { setReservations(d.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markHandled(id: number) {
    await apiFetch(`/reservations/${id}`, { method:'PATCH', body: JSON.stringify({ status:'handled' }) });
    setReservations(prev => prev.map(r => r.id===id ? { ...r, status:'handled' } : r));
  }

  async function deleteRes(id: number) {
    if (!confirm('Delete this reservation permanently?')) return;
    await apiFetch(`/reservations/${id}`, { method:'DELETE' });
    setReservations(prev => prev.filter(r => r.id !== id));
  }

  const visible = reservations.filter(r => filter==='all' || r.status===filter);
  const STATUS_COLORS: Record<string, string> = { new: T.green, handled: T.muted };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Management</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Reservations</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {(['all','new','handled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'8px 16px', borderRadius:50, border:`1px solid ${filter===f ? T.purple : T.border}`, background: filter===f ? T.purpleL : T.card, color: filter===f ? T.purple : T.muted, fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {f === 'all' ? `All (${reservations.length})` : f === 'new' ? `New (${reservations.filter(r=>r.status==='new').length})` : `Handled (${reservations.filter(r=>r.status==='handled').length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>Loading reservations…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:T.muted, fontSize:13 }}>No {filter !== 'all' ? filter : ''} reservations found.</div>
      ) : (
        <div className="admin-table-card" style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          <div className="admin-table-header" style={{ display:'grid', gridTemplateColumns:'1.2fr 1.6fr 130px 90px 100px 110px 80px', gap:0, padding:'12px 20px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
            {['Name','Email','Phone','University','Status','Date','Actions'].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>
            ))}
          </div>
          {visible.map((r, i) => (
            <div className="admin-table-row admin-reservation-row" key={r.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.6fr 130px 90px 100px 110px 80px', gap:0, padding:'14px 20px', borderBottom: i < visible.length-1 ? `1px solid ${T.border}` : 'none', alignItems:'center', transition:'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.bg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{r.name}</div>
                {r.field && <div style={{ fontSize:11, color:T.muted }}>{r.field}</div>}
              </div>
              <div style={{ fontSize:12, color:T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>{r.email}</div>
              <div style={{ fontSize:11, color:T.muted }}>{r.phone}</div>
              <div style={{ fontSize:11, color:T.muted }}>{r.university || '—'}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, color: STATUS_COLORS[r.status] ?? T.muted, background:`${STATUS_COLORS[r.status] ?? T.muted}14`, borderRadius:20, padding:'3px 9px', textTransform:'capitalize' }}>
                  {r.status}
                </span>
              </div>
              <div style={{ fontSize:11, color:T.muted }}>{r.created_at.slice(0,10)}</div>
              <div style={{ display:'flex', gap:8 }}>
                {r.status === 'new' && (
                  <button onClick={() => markHandled(r.id)} title="Mark handled"
                    style={{ width:28, height:28, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.green; (e.currentTarget as HTMLElement).style.background = '#F0FDF4'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.card; }}>
                    {Icons.Check()}
                  </button>
                )}
                <button onClick={() => deleteRes(r.id)} title="Delete"
                  style={{ width:28, height:28, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.red; (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.card; }}>
                  {Icons.Trash()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── STUDENTS CRM TAB ──────────────────────────────────────────────────── */
const STUDENT_STATUSES = [
  { value:'new', label:'New', bg:'#EFF6FF', color:'#2563EB' },
  { value:'counselling', label:'Counselling', bg:'#FFFBEB', color:'#D97706' },
  { value:'application', label:'Application', bg:T.purpleL, color:T.purple },
  { value:'documents', label:'Documents', bg:'#F0FDFA', color:'#0D9488' },
  { value:'visa', label:'Visa', bg:'#EEF2FF', color:'#4F46E5' },
  { value:'admitted', label:'Admitted', bg:'#ECFDF5', color:'#059669' },
  { value:'enrolled', label:'Enrolled', bg:'#D1FAE5', color:'#065F46' },
  { value:'rejected', label:'Rejected', bg:'#FEF2F2', color:'#DC2626' },
];

type StudentForm = Omit<Student, 'id' | 'created_at' | 'updated_at'>;
const EMPTY_STUDENT: StudentForm = {
  full_name:'', email:'', phone:'', nationality:'', field:'',
  university:'', status:'new', notes:'',
};

function studentStatusMeta(value: string) {
  return STUDENT_STATUSES.find(s => s.value === value) ?? { value, label:value, bg:'#F3F4F6', color:T.muted };
}

function StudentBadge({ status }: { status: string }) {
  const s = studentStatusMeta(status);
  return <span style={{ fontSize:11, fontWeight:800, color:s.color, background:s.bg, borderRadius:999, padding:'4px 10px', whiteSpace:'nowrap' }}>{s.label}</span>;
}

function StudentsCRMTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      const d = await apiFetch(`/api/students?${params.toString()}`);
      setStudents(d.data ?? []);
      setByStatus(d.by_status ?? []);
      setTotal(d.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  function countStatus(value: string) {
    return byStatus.find(s => s.status === value)?.count ?? 0;
  }

  function editStudent(s: Student) {
    setEditing(s);
    setForm({
      full_name:s.full_name ?? '', email:s.email ?? '', phone:s.phone ?? '',
      nationality:s.nationality ?? '', field:s.field ?? '', university:s.university ?? '',
      status:s.status ?? 'new', notes:s.notes ?? '',
    });
  }

  function newStudent() {
    setEditing(null);
    setForm(EMPTY_STUDENT);
  }

  function set<K extends keyof StudentForm>(key: K, value: StudentForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function saveStudent() {
    if (!form.full_name.trim()) {
      alert('Student full name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/students/${editing.id}`, { method:'PATCH', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/students', { method:'POST', body: JSON.stringify(form) });
      }
      newStudent();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(s: Student) {
    if (!confirm(`Delete ${s.full_name}?`)) return;
    await apiFetch(`/api/students/${s.id}`, { method:'DELETE' });
    if (editing?.id === s.id) newStudent();
    await load();
  }

  async function quickStatus(s: Student, next: string) {
    await apiFetch(`/api/students/${s.id}`, { method:'PATCH', body: JSON.stringify({ status: next }) });
    await load();
  }

  const pipeline = [
    { label:'Total', value:total, color:T.muted, bg:'#F3F4F6', status:'' },
    { label:'New', value:countStatus('new'), color:'#2563EB', bg:'#EFF6FF', status:'new' },
    { label:'In Progress', value:countStatus('counselling') + countStatus('application') + countStatus('documents') + countStatus('visa'), color:'#D97706', bg:'#FFFBEB', status:'' },
    { label:'Admitted', value:countStatus('admitted'), color:'#059669', bg:'#ECFDF5', status:'admitted' },
    { label:'Enrolled', value:countStatus('enrolled'), color:'#065F46', bg:'#D1FAE5', status:'enrolled' },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, flexWrap:'wrap', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Admissions CRM</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Students</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Track students from first enquiry to enrolment with notes and status changes.</div>
        </div>
        <ActionButton tone="primary" onClick={newStudent}>{Icons.Plus()} Add Student</ActionButton>
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
        {pipeline.map(item => (
          <button key={item.label} onClick={() => item.status && setStatus(status === item.status ? '' : item.status)}
            style={{ minHeight:54, border:'none', background:item.bg, color:item.color, borderRadius:14, padding:'9px 15px', cursor:item.status ? 'pointer' : 'default', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.8px' }}>{item.value}</span>
            <span style={{ fontSize:11, fontWeight:800 }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-student-layout" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 360px', gap:18, alignItems:'start' }}>
        <section style={{ display:'grid', gap:12 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:'1 1 260px' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex' }}>{Icons.Search('#9CA3AF')}</span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, nationality..." style={{ ...INPUT, paddingLeft:36 }} />
            </div>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...INPUT, width:170, cursor:'pointer' }}>
              <option value="">All statuses</option>
              {STUDENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="admin-table-card" style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden' }}>
            <div className="admin-table-header" style={{ display:'grid', gridTemplateColumns:'1.4fr 1.2fr 1fr 1fr 130px 120px', padding:'12px 18px', background:T.bg, borderBottom:`1px solid ${T.border}`, gap:8 }}>
              {['Student','Contact','Field','University','Status','Actions'].map(h => <div key={h} style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>)}
            </div>
            {loading ? (
              <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>Loading students...</div>
            ) : students.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:T.muted, fontSize:13 }}>No students found.</div>
            ) : students.map((s, i) => (
              <div className="admin-table-row" key={s.id} style={{ display:'grid', gridTemplateColumns:'1.4fr 1.2fr 1fr 1fr 130px 120px', padding:'14px 18px', borderBottom:i < students.length - 1 ? `1px solid ${T.border}` : 'none', gap:8, alignItems:'center' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Added {dateShort(s.created_at)}</div>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.email || '-'}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{s.phone || '-'}</div>
                </div>
                <div style={{ fontSize:12, color:T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.field || '-'}</div>
                <div style={{ fontSize:12, color:T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.university || '-'}</div>
                <div><StudentBadge status={s.status} /></div>
                <div style={{ display:'flex', gap:8 }}>
                  <button title="Edit" onClick={() => editStudent(s)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer' }}>{Icons.Edit()}</button>
                  <button title="Delete" onClick={() => deleteStudent(s)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer' }}>{Icons.Trash()}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden', position:'sticky', top:24 }}>
          <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:15, fontWeight:900, color:T.text }}>{editing ? 'Edit Student' : 'New Student'}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Keep contact info, preferred university, and internal notes tidy.</div>
          </div>
          <div style={{ padding:20, display:'grid', gap:13 }}>
            <Field label="Full Name"><input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Student name" style={INPUT} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@email.com" style={INPUT} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+60..." style={INPUT} /></Field>
            <Field label="Nationality"><input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Saudi Arabian" style={INPUT} /></Field>
            <Field label="Field"><select value={form.field} onChange={e => set('field', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}><option value="">Select field</option>{STUDY_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}</select></Field>
            <Field label="Preferred University"><input value={form.university} onChange={e => set('university', e.target.value)} placeholder="Taylor's University" style={INPUT} /></Field>
            <Field label="Status"><select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...INPUT, cursor:'pointer' }}>{STUDENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." style={{ ...INPUT, minHeight:92, resize:'vertical' }} /></Field>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
              {editing && <ActionButton onClick={newStudent}>Cancel</ActionButton>}
              <ActionButton tone="primary" onClick={saveStudent} disabled={saving}>{Icons.Save('#fff')} {saving ? 'Saving...' : editing ? 'Save Student' : 'Create Student'}</ActionButton>
            </div>

            {editing && (
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
                <div style={{ fontSize:11, fontWeight:800, color:T.muted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Quick Status</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {STUDENT_STATUSES.filter(s => s.value !== editing.status).slice(0, 5).map(s => (
                    <button key={s.value} onClick={() => quickStatus(editing, s.value)} style={{ border:'none', background:s.bg, color:s.color, borderRadius:999, padding:'7px 10px', fontSize:11, fontWeight:800, cursor:'pointer' }}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── inline logo helper (no external state needed) ─────────────────────── */
function UniMiniLogo({ u }: { u: UniRow }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ width:32, height:32, borderRadius:8, background:'#F3F5FF', border:`1px solid #E5E0F5`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      {u.domain && !failed
        ? <img src={`https://www.google.com/s2/favicons?domain=${u.domain}&sz=32`} alt={u.abbr}
            onError={() => setFailed(true)}
            style={{ width:20, height:20, objectFit:'contain' }} />
        : <span style={{ fontSize:9, fontWeight:800, color:T.purple }}>{u.abbr.slice(0,2)}</span>
      }
    </div>
  );
}

function InstituteMiniLogo({ item }: { item: InstituteRow }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ width:32, height:32, borderRadius:8, background:'#F3F5FF', border:`1px solid #E5E0F5`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      {item.domain && !failed
        ? <img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`} alt={item.abbr}
            onError={() => setFailed(true)}
            style={{ width:20, height:20, objectFit:'contain' }} />
        : <span style={{ fontSize:9, fontWeight:800, color:item.color || T.purple }}>{item.abbr.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

/* ─── NAV ITEM ───────────────────────────────────────────────────────────── */
function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontSize:13, fontWeight: active ? 600 : 400, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background='transparent'; }}>
      {icon}
      {label}
    </button>
  );
}

/* ─── MAIN ADMIN LAYOUT ─────────────────────────────────────────────────── */
type Tab = 'dashboard' | 'leads' | 'reservations' | 'universities' | 'institutes' | 'students';

export default function Admin() {
  const [authed, setAuthed] = useState(() => {
    return Boolean(getStoredAdminKey());
  });
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  function logout() {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAuthed(false);
  }

  return (
    <div className="admin-shell" style={{ display:'flex', minHeight:'100vh', background:T.bg }}>
      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar" style={{ width:220, background:T.sidebar, display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh' }}>
        {/* brand */}
        <div style={{ padding:'24px 18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <Logo height={30} tone="light" />
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', marginTop:2 }}>Admin Portal</div>
        </div>

        {/* nav */}
        <nav style={{ padding:'14px 10px', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          <NavItem label="Dashboard"        icon={Icons.Grid()}      active={tab==='dashboard'}    onClick={() => setTab('dashboard')} />
          <NavItem label="Student Requests" icon={Icons.Users()}     active={tab==='leads'}        onClick={() => setTab('leads')} />
          <NavItem label="Students CRM"     icon={Icons.Users()}     active={tab==='students'}     onClick={() => setTab('students')} />
          <NavItem label="Reservations"     icon={Icons.Calendar()}  active={tab==='reservations'} onClick={() => setTab('reservations')} />
          <NavItem label="Universities"     icon={Icons.Uni()}       active={tab==='universities'} onClick={() => setTab('universities')} />
          <NavItem label="Institutes"        icon={Icons.Uni()}       active={tab==='institutes'}   onClick={() => setTab('institutes')} />
        </nav>

        {/* logout */}
        <div style={{ padding:'10px 10px 20px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={logout}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)'; }}>
            {Icons.Logout()}
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="admin-main" style={{ flex:1, padding:'40px 40px', overflowY:'auto' }}>
        {tab === 'dashboard'    && <DashboardTab />}
        {tab === 'leads'        && <LeadsTab />}
        {tab === 'students'     && <StudentsCRMTab />}
        {tab === 'reservations' && <ReservationsTab />}
        {tab === 'universities' && <UniversitiesManagerTab />}
        {tab === 'institutes'   && <InstitutesManagerTab />}
      </main>
    </div>
  );
}

