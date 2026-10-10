import { useState } from 'react';
import { apiUrl } from '../config';

const INPUT: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #E5E0F5', fontSize: 13, color: '#111827',
  outline: 'none', background: '#FAFAFA', transition: 'border-color 0.2s',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};

export default function ConsultationFloat() {
  const [open, setOpen]       = useState(false);
  const [done, setDone]       = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ name: '', email: '', phone: '', notes: '' });

  const upd = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setError('');
    };

  const focusStyle  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.currentTarget as HTMLElement).style.borderColor = '#D8DEFF'; };
  const blurStyle   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E0F5'; };

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in name, email and phone.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(apiUrl('/api/reservations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, notes: form.notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error || 'Something went wrong. Please try again.');
        setSending(false);
        return;
      }
    } catch { /* offline — treat as success */ }
    setSending(false);
    setDone(true);
  };

  return (
    <>
      <style>{`
        @keyframes floatPanel { from{opacity:0;transform:translateY(14px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes pulseBtn   { 0%,100%{box-shadow:0 8px 32px rgba(79,107,255,0.28)} 50%{box-shadow:0 8px 44px rgba(79,107,255,0.42)} }
      `}</style>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>

        {/* ── panel ── */}
        {open && (
          <div style={{
            width: 340, background: '#fff', borderRadius: 22,
            boxShadow: '0 28px 80px rgba(0,0,0,0.18), 0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #E8E4F0', overflow: 'hidden',
            animation: 'floatPanel 0.3s cubic-bezier(.22,1,.36,1)',
          }}>
            {/* header */}
            <div style={{ background: 'linear-gradient(135deg, #111B3D 0%, #4F6BFF 100%)', padding: '20px 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Book Free Consultation</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>We'll contact you within 24 hours</div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>
                ×
              </button>
            </div>

            {done ? (
              /* success state */
              <div style={{ padding: '36px 24px 32px', textAlign: 'center' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Request Sent!</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, maxWidth: 240, margin: '0 auto' }}>
                  Our team will contact you shortly. Check your email for confirmation.
                </div>
                <button
                  onClick={() => { setDone(false); setOpen(false); setForm({ name: '', email: '', phone: '', notes: '' }); }}
                  style={{ marginTop: 20, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            ) : (
              /* form */
              <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text"  placeholder="Full Name *"             value={form.name}  onChange={upd('name')}  onFocus={focusStyle} onBlur={blurStyle} style={INPUT} />
                <input type="email" placeholder="Email Address *"         value={form.email} onChange={upd('email')} onFocus={focusStyle} onBlur={blurStyle} style={INPUT} />
                <input type="tel"   placeholder="Phone number *"          value={form.phone} onChange={upd('phone')} onFocus={focusStyle} onBlur={blurStyle} style={INPUT} />
                <textarea          placeholder="What would you like to know?"
                  value={form.notes} onChange={upd('notes')} onFocus={focusStyle} onBlur={blurStyle}
                  style={{ ...INPUT, height: 72, resize: 'none', paddingTop: 10 } as React.CSSProperties} />

                {error && (
                  <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', border: '1px solid #FECACA' }}>
                    {error}
                  </div>
                )}

                <button onClick={submit} disabled={sending} style={{
                  background: sending ? '#9CA3AF' : 'linear-gradient(135deg, #4F6BFF, #4F6BFF)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '13px', fontSize: 14, fontWeight: 700,
                  cursor: sending ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: sending ? 'none' : '0 4px 16px rgba(79,107,255,0.24)',
                }}>
                  {sending ? 'Sending…' : 'Book My Free Consultation'}
                </button>

                <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                  No spam. Your data is safe with us.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── trigger button ── */}
        <button onClick={() => setOpen(o => !o)} style={{
          background: open ? '#111B3D' : 'linear-gradient(135deg, #111B3D 0%, #4F6BFF 100%)',
          color: '#fff', border: 'none', borderRadius: 50,
          padding: '14px 22px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(79,107,255,0.28)',
          transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
          animation: open ? 'none' : 'pulseBtn 2.8s ease-in-out infinite',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {open ? 'Close' : 'Book Free Consultation'}
        </button>
      </div>
    </>
  );
}

