import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { University } from '../types';
import { C } from '../styles/theme';
import { useDebounce } from '../hooks/useDebounce';
import { usePreferences } from '../i18n';

const OFFICIAL_LOGOS: Record<string, string> = {
  USM: '/official-logos/usm.jpg',
  HWU: '/official-logos/heriot-watt.png',
  LINCOLN: '/official-logos/lincoln.png',
  SUNWAY: '/official-logos/sunway.avif',
  "TAYLOR'S": '/official-logos/taylors.jpg',
  UNICAM: '/official-logos/unicam.png',
  CYBERJAYA: '/official-logos/cyberjaya.jpg',
};

const UniLogo = memo(function UniLogo({ uni, size = 52 }: { uni: University; size?: number }) {
  const [failed, setFailed] = useState(false);
  const officialLogo = OFFICIAL_LOGOS[uni.abbr];
  if (!uni.domain || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: size * 0.35, fontWeight: 900, color: '#4F6BFF' }}>{uni.abbr.slice(0, 2)}</span>
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 12, border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      <img
        src={officialLogo ?? `https://logo.clearbit.com/${uni.domain}?size=128`}
        alt={uni.abbr}
        loading="lazy"
        onError={e => {
          if (officialLogo && uni.domain) {
            e.currentTarget.src = `https://logo.clearbit.com/${uni.domain}?size=128`;
            e.currentTarget.onerror = () => setFailed(true);
            return;
          }
          const el = e.currentTarget as HTMLImageElement;
          el.src = `https://www.google.com/s2/favicons?domain=${uni.domain}&sz=128`;
          el.onerror = () => setFailed(true);
        }}
        style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain' }}
      />
    </div>
  );
});

function useTypeLabel() {
  const { t } = usePreferences();
  return (type: string) => {
    if (type === 'public') return t('type.public');
    if (type === 'private') return t('type.private');
    if (type === 'foreign_branch') return t('type.foreign');
    return t('universities.all');
  };
}

const UniCard = memo(function UniCard({ uni, onClick }: { uni: University; onClick: () => void }) {
  const { t } = usePreferences();
  const typeLabel = useTypeLabel();
  const [hov, setHov] = useState(false);
  return (
    <div
      className="uni-card"
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        border: hov ? '1px solid #D8DEFF' : '1px solid #f0f0f0',
        boxShadow: hov ? '0 12px 32px rgba(0,0,0,0.08)' : '0 1px 6px rgba(0,0,0,0.04)',
        cursor: 'pointer', transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-3px)' : 'none',
        contain: 'layout',
      }}>
      <div className="uni-card-body" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <UniLogo uni={uni} size={52} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#4F6BFF', background: '#F3F5FF', borderRadius: 20, padding: '3px 10px' }}>
              {typeLabel(uni.type)}
            </span>
            {uni.qs_ranking && (
              <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>QS #{uni.qs_ranking}</span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{uni.name}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>📍 {uni.location}</div>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{uni.description}</p>
        <div className="uni-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{t('universities.tuition')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              RM {uni.tuition_min.toLocaleString()} – {uni.tuition_max.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4F6BFF' }}>{t('universities.view')}</div>
        </div>
      </div>
    </div>
  );
});

export default function Universities() {
  const { t } = usePreferences();
  const typeLabel = useTypeLabel();
  const navigate = useNavigate();
  const [unis, setUnis] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const debouncedQ = useDebounce(q, 280);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: '50' };
    if (debouncedQ) params.q = debouncedQ;
    if (typeFilter) params.type = typeFilter;
    api.universities.list(params)
      .then(r => { setUnis(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQ, typeFilter]);

  return (
    <>
      <div className="universities-page" style={{ paddingTop: 68, background: C.bg, minHeight: '100vh' }}>
        <div style={{ background: `linear-gradient(135deg, #081331, ${C.purpleMid})`, padding: 'clamp(40px,6vw,60px) clamp(20px,5vw,40px) clamp(50px,7vw,80px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', marginBottom: 16 }}>{t('universities.title')}</h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              {t('universities.copy')}
            </p>
          </div>
        </div>

        <div className="universities-filter-bar" style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '16px clamp(16px,4vw,40px)', position: 'sticky', top: 64, zIndex: 50 }}>
          <div className="universities-filter-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="universities-filter-search" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder={t('universities.search')}
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', background: C.bg }}
              />
            </div>
            <div className="universities-filter-chips" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['', 'public', 'private', 'foreign_branch'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{
                  padding: '10px 18px', borderRadius: 50, border: `1px solid ${typeFilter === t ? C.purpleMid : C.border}`,
                  background: typeFilter === t ? C.purplePale : '#fff',
                  color: typeFilter === t ? C.purpleMid : C.textMuted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}>{typeLabel(t)}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,40px) 80px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: C.textMuted }}>{t('universities.loading')}</div>
          ) : unis.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: C.textMuted }}>{t('universities.empty')}</div>
          ) : (
            <div className="uni-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {unis.map(u => <UniCard key={u.id} uni={u} onClick={() => navigate(`/universities/${u.id}`)} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

