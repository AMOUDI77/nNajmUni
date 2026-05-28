import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../config';

/* ── types ─────────────────────────────────────────────────────────────────── */
interface Student {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  field: string;
  university: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  { value: 'new',          label: 'New',          bg: '#EFF6FF', color: '#2563EB' },
  { value: 'counselling',  label: 'Counselling',  bg: '#FFFBEB', color: '#D97706' },
  { value: 'application',  label: 'Application',  bg: '#F3F5FF', color: '#4F6BFF' },
  { value: 'documents',    label: 'Documents',    bg: '#F0FDFA', color: '#0D9488' },
  { value: 'visa',         label: 'Visa',         bg: '#EEF2FF', color: '#4F46E5' },
  { value: 'admitted',     label: 'Admitted',     bg: '#ECFDF5', color: '#059669' },
  { value: 'enrolled',     label: 'Enrolled',     bg: '#D1FAE5', color: '#065F46' },
  { value: 'rejected',     label: 'Rejected',     bg: '#FEF2F2', color: '#DC2626' },
];

const FIELDS = [
  'Engineering', 'Medicine & Healthcare', 'Business & Finance',
  'Technology & AI', 'Law', 'Architecture', 'Aviation',
  'Pharmacy', 'Psychology', 'Culinary Arts', 'Science', 'Arts & Design', 'Other',
];

const BASE = '/api/students';
const ADMIN_STORAGE_KEY = 'admin_key';
const EMPTY: Omit<Student, 'id' | 'created_at' | 'updated_at'> = {
  full_name: '', email: '', phone: '', nationality: '',
  field: '', university: '', status: 'new', notes: '',
};

function getAdminKey() {
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) ?? '';
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const incomingHeaders = (opts.headers ?? {}) as Record<string, string>;
  const adminKey = incomingHeaders['X-Admin-Key'] ?? getAdminKey();
  return fetch(apiUrl(path), {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(adminKey ? { 'X-Admin-Key': adminKey } : {}),
      ...incomingHeaders,
    },
  });
}

/* ── helpers ────────────────────────────────────────────────────────────────── */
function statusMeta(value: string) {
  return STATUSES.find(s => s.value === value) ?? { bg: '#F3F4F6', color: '#6B7280', label: value };
}

function fmt(dt: string) {
  if (!dt) return '—';
  return new Date(dt + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── subcomponents ──────────────────────────────────────────────────────────── */
const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #E5E7EB', fontSize: 13, color: '#111827',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: m.color, background: m.bg,
      borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

/* ── slide-in drawer ────────────────────────────────────────────────────────── */
interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (data: typeof EMPTY) => Promise<void>;
  initial: typeof EMPTY;
  saving: boolean;
}

function Drawer({ open, title, onClose, onSave, initial, saving }: DrawerProps) {
  const [form, setForm] = useState(initial);

  useEffect(() => { setForm(initial); }, [initial]);

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 400 }} />

      {/* panel */}
      <div className="student-drawer" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#fff', zIndex: 401, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
      }}>
        {/* header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF', lineHeight: 1 }}>×</button>
        </div>

        {/* form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Full Name *">
            <input value={form.full_name} onChange={set('full_name')} placeholder="e.g. Ahmed Al-Rashid" style={INPUT}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
              onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} placeholder="student@email.com" style={INPUT}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
                onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+966 5xx xxx xxx" style={INPUT}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
                onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
            </Field>
          </div>

          <Field label="Nationality">
            <input value={form.nationality} onChange={set('nationality')} placeholder="e.g. Saudi Arabian" style={INPUT}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
              onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Field of Study">
              <select value={form.field} onChange={set('field')} style={{ ...INPUT, cursor: 'pointer', appearance: 'none' }}>
                <option value="">— Select —</option>
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} style={{ ...INPUT, cursor: 'pointer', appearance: 'none' }}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Preferred University">
            <input value={form.university} onChange={set('university')} placeholder="e.g. Taylor's University" style={INPUT}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
              onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={set('notes')} placeholder="Any additional notes…"
              style={{ ...INPUT, height: 90, resize: 'none', paddingTop: 10 } as React.CSSProperties}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
              onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
          </Field>
        </div>

        {/* footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.full_name.trim()} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: saving || !form.full_name.trim() ? '#9CA3AF' : 'linear-gradient(135deg, #4F6BFF, #4F6BFF)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving || !form.full_name.trim() ? 'default' : 'pointer',
            boxShadow: saving || !form.full_name.trim() ? 'none' : '0 4px 12px rgba(79,107,255,0.25)',
          }}>
            {saving ? 'Saving…' : 'Save Student'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── confirm delete modal ───────────────────────────────────────────────────── */
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 500 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: 16, padding: '28px 32px', zIndex: 501,
        width: 360, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Delete Student?</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently remove <strong style={{ color: '#111827' }}>{name}</strong> from the system. This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

/* ── main page ──────────────────────────────────────────────────────────────── */
function StudentLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const accessKey = key.trim();
    if (!accessKey) return;
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch('/api/students', { headers: { 'X-Admin-Key': accessKey } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, accessKey);
      onLogin(accessKey);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 28, boxShadow: '0 16px 40px rgba(15,23,42,0.08)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Student Manager</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Enter the student access password to continue.</div>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setError(false); }}
          placeholder="Student password"
          style={{ ...INPUT, borderColor: error ? '#DC2626' : '#E5E7EB', marginBottom: error ? 8 : 16 }}
        />
        {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 16 }}>Invalid student password.</div>}
        <button type="submit" disabled={!key.trim() || loading} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, border: 'none', background: key.trim() ? '#4F6BFF' : '#E5E7EB', color: key.trim() ? '#fff' : '#6B7280', fontSize: 13, fontWeight: 700, cursor: key.trim() ? 'pointer' : 'default' }}>
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default function Students() {
  const [adminKey,   setAdminKey]   = useState(getAdminKey);
  const [students,   setStudents]   = useState<Student[]>([]);
  const [byStatus,   setByStatus]   = useState<{ status: string; count: number }[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [apiError,   setApiError]   = useState(false);
  const [q,          setQ]          = useState('');
  const [filterSt,   setFilterSt]   = useState('');
  const [drawer,     setDrawer]     = useState<'add' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Student | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<Student | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!adminKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (filterSt) params.set('status', filterSt);
      const res = await apiFetch(`${BASE}?${params}`);
      if (res.status === 401 || res.status === 503) {
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        setAdminKey('');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudents(data.data ?? []);
      setTotal(data.total ?? 0);
      setByStatus(data.by_status ?? []);
    } catch {
      setApiError(true);
      setStudents([]);
    }
    setLoading(false);
  }, [q, filterSt, adminKey]);

  useEffect(() => { load(); }, [load]);

  /* close action menu on outside click */
  useEffect(() => {
    const h = () => setActionMenu(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  async function handleSave(form: typeof EMPTY) {
    setSaving(true);
    try {
      let res: Response;
      if (drawer === 'add') {
        res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(form) });
      } else {
        res = await apiFetch(`${BASE}/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrawer(null);
      setEditing(null);
      await load();
    } catch { /* leave drawer open on error */ }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    setDeleting(null);
    await load();
  }

  async function quickStatus(id: number, status: string) {
    setActionMenu(null);
    await apiFetch(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  }

  const drawerInitial: typeof EMPTY = drawer === 'edit' && editing
    ? { full_name: editing.full_name, email: editing.email, phone: editing.phone, nationality: editing.nationality, field: editing.field, university: editing.university, status: editing.status, notes: editing.notes }
    : EMPTY;

  /* stats */
  const statCount = (s: string) => byStatus.find(b => b.status === s)?.count ?? 0;
  const STAT_CHIPS = [
    { label: 'Total', value: total, color: '#6B7280', bg: '#F3F4F6' },
    { label: 'New', value: statCount('new'), color: '#2563EB', bg: '#EFF6FF' },
    { label: 'In Progress', value: (statCount('counselling') + statCount('application') + statCount('documents') + statCount('visa')), color: '#D97706', bg: '#FFFBEB' },
    { label: 'Admitted', value: statCount('admitted'), color: '#059669', bg: '#ECFDF5' },
    { label: 'Enrolled', value: statCount('enrolled'), color: '#065F46', bg: '#D1FAE5' },
    { label: 'Rejected', value: statCount('rejected'), color: '#DC2626', bg: '#FEF2F2' },
  ];

  if (!adminKey) return <StudentLogin onLogin={setAdminKey} />;

  function logout() {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminKey('');
  }

  return (
    <div className="student-page" style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      {/* ── top bar ── */}
      <div className="student-topbar" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 16, height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#4F6BFF,#4F6BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', lineHeight: 1 }}>Student Manager</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>NajmUni Internal</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <a href="/" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          ← Back to site
        </a>

        <button onClick={logout} style={{ fontSize: 13, color: '#6B7280', padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer' }}>
          Sign Out
        </button>

        <button onClick={() => { setEditing(null); setDrawer('add'); }} style={{
          padding: '8px 18px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #4F6BFF, #4F6BFF)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 4px 12px rgba(79,107,255,0.25)',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Student
        </button>
      </div>

      <div className="student-content" style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px' }}>
        {/* ── stat chips ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {STAT_CHIPS.map(chip => (
            <div key={chip.label} style={{ background: chip.bg, borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: chip.label !== 'Total' && chip.label !== 'In Progress' ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
              onClick={() => {
                const map: Record<string, string> = { New: 'new', Admitted: 'admitted', Enrolled: 'enrolled', Rejected: 'rejected' };
                if (map[chip.label]) setFilterSt(filterSt === map[chip.label] ? '' : map[chip.label]);
              }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: chip.color, letterSpacing: '-1px' }}>{chip.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: chip.color, opacity: 0.75 }}>{chip.label}</div>
            </div>
          ))}
        </div>

        {/* ── search + filter bar ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, nationality…"
              style={{ ...INPUT, paddingLeft: 34, borderColor: '#E5E7EB' }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; }}
              onBlur={e =>  { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }} />
          </div>

          <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
            style={{ ...INPUT, width: 160, cursor: 'pointer', appearance: 'none' }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {(q || filterSt) && (
            <button onClick={() => { setQ(''); setFilterSt(''); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
              Clear
            </button>
          )}

          <div style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── table ── */}
        <div className="student-table-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {/* header */}
          <div className="student-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr 1fr 1fr 1.2fr 48px', gap: 0, padding: '11px 18px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {['Name', 'Email / Phone', 'Nationality', 'Field', 'University', 'Status', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '56px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading students…</div>
          ) : apiError ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Cannot connect to backend</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 18 }}>Make sure the Flask server is running on port 5000.</div>
              <button onClick={load} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4F6BFF', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: '64px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No students yet</div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                {q || filterSt ? 'No results match your filters.' : 'Add your first student to get started.'}
              </div>
            </div>
          ) : (
            students.map((s, idx) => (
              <div className="student-table-row" key={s.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr 1fr 1fr 1.2fr 48px',
                  gap: 0, padding: '13px 18px', alignItems: 'center',
                  borderBottom: idx < students.length - 1 ? '1px solid #F3F4F6' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
              >
                {/* name + date */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Added {fmt(s.created_at)}</div>
                </div>

                {/* email + phone */}
                <div>
                  <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || '—'}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{s.phone || '—'}</div>
                </div>

                {/* nationality */}
                <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nationality || '—'}</div>

                {/* field */}
                <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.field || '—'}</div>

                {/* university */}
                <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.university || '—'}</div>

                {/* status */}
                <div><Badge status={s.status} /></div>

                {/* action menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === s.id ? null : s.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: '#9CA3AF', fontSize: 16, display: 'flex', alignItems: 'center', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                    ···
                  </button>

                  {actionMenu === s.id && (
                    <div onClick={e => e.stopPropagation()} style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 50,
                      background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180,
                      overflow: 'hidden',
                    }}>
                      <button onClick={() => { setEditing(s); setDrawer('edit'); setActionMenu(null); }}
                        style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#fff', textAlign: 'left', fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F5FF'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit Student
                      </button>

                      <div style={{ borderTop: '1px solid #F3F4F6', padding: '6px 0' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', padding: '4px 14px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Change Status</div>
                        {STATUSES.filter(st => st.value !== s.status).map(st => (
                          <button key={st.value} onClick={() => quickStatus(s.id, st.value)}
                            style={{ width: '100%', padding: '8px 14px', border: 'none', background: '#fff', textAlign: 'left', fontSize: 12, color: st.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = st.bg; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                            {st.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ borderTop: '1px solid #F3F4F6' }}>
                        <button onClick={() => { setDeleting(s); setActionMenu(null); }}
                          style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#fff', textAlign: 'left', fontSize: 13, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── drawer ── */}
      <Drawer
        open={drawer !== null}
        title={drawer === 'add' ? 'Add New Student' : `Edit — ${editing?.full_name}`}
        onClose={() => { setDrawer(null); setEditing(null); }}
        onSave={handleSave}
        initial={drawerInitial}
        saving={saving}
      />

      {/* ── confirm delete ── */}
      {deleting && (
        <ConfirmDelete
          name={deleting.full_name}
          onConfirm={() => handleDelete(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

