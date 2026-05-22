import { useState, useRef, useEffect, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
  color?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchable?: boolean;
  style?: React.CSSProperties;
}

export default function Select({ options, value, onChange, placeholder = 'Select…', searchable = false, style }: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref                 = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.sub?.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open, searchable]);

  const pick = useCallback((v: string) => {
    onChange(v); setOpen(false); setQuery('');
  }, [onChange]);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* trigger */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 10,
          border: `1px solid ${open ? '#D8DEFF' : '#E5E7EB'}`,
          background: '#fff', fontSize: 14, color: selected ? '#111827' : '#9CA3AF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          cursor: 'pointer', outline: 'none', textAlign: 'left',
          fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: open ? '0 0 0 3px rgba(196,181,253,0.2)' : 'none',
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
          animation: 'selectDrop 0.15s cubic-bezier(.22,1,.36,1)',
        }}>
          <style>{`@keyframes selectDrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

          {searchable && (
            <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', border: '1px solid #E5E7EB' }}>
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#111827', flex: 1, fontFamily: 'inherit' }} />
              </div>
            </div>
          )}

          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '6px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>No results</div>
            ) : filtered.map(o => {
              const active = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => pick(o.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                    background: active ? '#FAF5FF' : 'transparent',
                    color: active ? '#4F6BFF' : '#111827',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
                    gap: 10, fontFamily: 'inherit', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  {o.color && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.color, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</div>
                    {o.sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{o.sub}</div>}
                  </div>
                  {active && (
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#4F6BFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

