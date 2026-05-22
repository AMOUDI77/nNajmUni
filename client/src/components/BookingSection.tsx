import { useState } from 'react';
import { UNIVERSITIES } from '../data';
import Select from './Select';
import { usePreferences } from '../i18n';

const COUNTRY_OPTIONS = [
  { value: '+60',  label: 'MY +60',  sub: 'Malaysia' },
  { value: '+966', label: 'SA +966', sub: 'Saudi Arabia' },
  { value: '+971', label: 'AE +971', sub: 'UAE' },
  { value: '+968', label: 'OM +968', sub: 'Oman' },
  { value: '+974', label: 'QA +974', sub: 'Qatar' },
  { value: '+965', label: 'KW +965', sub: 'Kuwait' },
  { value: '+973', label: 'BH +973', sub: 'Bahrain' },
  { value: '+62',  label: 'ID +62',  sub: 'Indonesia' },
  { value: '+92',  label: 'PK +92',  sub: 'Pakistan' },
  { value: '+880', label: 'BD +880', sub: 'Bangladesh' },
  { value: '+44',  label: 'UK +44',  sub: 'United Kingdom' },
  { value: '+1',   label: 'US +1',   sub: 'United States' },
];

const FIELD_OPTIONS = [
  { value: 'Technology',    label: 'Technology',    sub: 'Computer Science, AI, Cybersecurity' },
  { value: 'Engineering',   label: 'Engineering',   sub: 'Mechanical, Civil, Electrical' },
  { value: 'Medicine',      label: 'Medicine',      sub: 'MBBS, Dentistry, Pharmacy, Nursing' },
  { value: 'Business',      label: 'Business',      sub: 'Management, Accounting, Finance' },
  { value: 'Law',           label: 'Law',           sub: 'LLB, Corporate & Commercial Law' },
  { value: 'Science',       label: 'Science',       sub: 'Biology, Chemistry, Physics' },
  { value: 'Arts & Design', label: 'Arts & Design', sub: 'Graphic Design, Architecture' },
  { value: 'Hospitality',   label: 'Hospitality',   sub: 'Culinary Arts, Hotel Management' },
  { value: 'Social Science',label: 'Social Science',sub: 'Psychology, Sociology, Education' },
];

const BASE = '/api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #E5E7EB',
  fontSize: 14, color: '#111827', outline: 'none', background: '#fff',
  transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function focus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#D8DEFF';
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(196,181,253,0.2)';
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#E5E7EB';
  e.currentTarget.style.boxShadow   = 'none';
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

export default function BookingSection() {
  const { t } = usePreferences();
  const [form, setForm] = useState({
    name: '', email: '', countryCode: '+60', phone: '',
    university: '', field: '', preferred_date: '', notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (status === 'error') setStatus('idle');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`${BASE}/reservations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(),
          phone: `${form.countryCode} ${form.phone.trim()}`,
          university: form.university, field: form.field,
          preferred_date: form.preferred_date, notes: form.notes.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm({ name: '', email: '', countryCode: '+60', phone: '', university: '', field: '', preferred_date: '', notes: '' });
    } catch { setStatus('error'); }
  }

  const canSubmit = form.name.trim() && form.email.trim() && form.phone.trim() && status !== 'loading';
  const uniOptions = [
    { value: '', label: t('booking.any'), sub: t('booking.anySub') },
    ...UNIVERSITIES.map(u => ({
      value: u.abbr,
      label: u.name,
      sub: `${u.abbr} - ${u.location}`,
      color: u.color,
    })),
  ];

  return (
    <section id="booking-section" className="section-pad" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="two-col">

        {/* Left */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4F6BFF', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>{t('booking.badge')}</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: 18 }}>
            {t('booking.title')}
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 32, maxWidth: 400 }}>
            {t('booking.copy')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { title: t('booking.guidance'), desc: t('booking.guidanceCopy') },
              { title: t('booking.noFees'),   desc: t('booking.noFeesCopy') },
              { title: t('booking.fast'),     desc: t('booking.fastCopy') },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F6BFF', marginTop: 7, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="booking-form-card" style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: 'clamp(20px,4vw,36px) clamp(16px,4vw,32px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('booking.success')}</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{t('booking.successCopy')}</div>
              <button onClick={() => setStatus('idle')} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#4F6BFF', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('booking.another')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="booking-name-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FieldWrap label={t('booking.name')}>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Ahmad Al-Rashidi" required style={inputStyle} onFocus={focus} onBlur={blur} />
                </FieldWrap>
                <FieldWrap label={t('booking.email')}>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="ahmad@email.com" required style={inputStyle} onFocus={focus} onBlur={blur} />
                </FieldWrap>
              </div>

              <FieldWrap label={t('booking.phone')}>
                <div className="booking-phone-row" style={{ display: 'flex', gap: 8 }}>
                  <Select
                    options={COUNTRY_OPTIONS}
                    value={form.countryCode}
                    onChange={v => set('countryCode', v)}
                    searchable
                    style={{ width: 130, flexShrink: 0 }}
                  />
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="12 345 6789" required style={inputStyle} onFocus={focus} onBlur={blur} />
                </div>
              </FieldWrap>

              <div className="booking-field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FieldWrap label={t('booking.university')}>
                  <Select
                    options={uniOptions}
                    value={form.university}
                    onChange={v => set('university', v)}
                    placeholder={t('booking.any')}
                    searchable
                  />
                </FieldWrap>
                <FieldWrap label={t('booking.field')}>
                  <Select
                    options={FIELD_OPTIONS}
                    value={form.field}
                    onChange={v => set('field', v)}
                    placeholder={t('booking.any')}
                  />
                </FieldWrap>
              </div>

              <FieldWrap label={t('booking.date')}>
                <input type="date" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)}
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </FieldWrap>

              <FieldWrap label={t('booking.notes')}>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder={t('booking.notePlaceholder')} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties}
                  onFocus={focus as React.FocusEventHandler<HTMLTextAreaElement>}
                  onBlur={blur as React.FocusEventHandler<HTMLTextAreaElement>} />
              </FieldWrap>

              {status === 'error' && (
                <div style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
                  {t('booking.error')}
                </div>
              )}

              <button type="submit" disabled={!canSubmit}
                style={{ padding: '14px', borderRadius: 12, border: 'none', background: canSubmit ? '#4F6BFF' : '#F3F4F6', color: canSubmit ? '#fff' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.2s', letterSpacing: '-0.3px' }}>
                {status === 'loading' ? t('booking.submitting') : t('booking.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

