import { useState, useEffect, memo } from 'react';
import { api } from '../api';
import type { Institute } from '../types';
import { C } from '../styles/theme';
import { useDebounce } from '../hooks/useDebounce';
import { usePreferences } from '../i18n';

const OFFICIAL_LOGOS: Record<string, string> = {
  BIGBEN: '/official-logos/big-ben.png',
  'British Council': '/official-logos/british-council.png',
  ELEC: '/official-logos/elec.jpg',
};

const AR_DESCRIPTIONS: Record<string, string> = {
  BIGBEN: 'برامج لغة إنجليزية وتحضير IELTS ودعم مسارات تعليمية للطلاب الراغبين بالدراسة في ماليزيا.',
  BRIGHT: 'مركز لغة إنجليزية في ماليزيا يقدم برامج عملية للمتعلمين الدوليين.',
  EMS: 'دورات لغة إنجليزية وبرامج مكثفة ودعم للطلاب الدوليين.',
  ELEC: 'مدرسة لغة إنجليزية في كوالالمبور تقدم دورات مكثفة وخدمات دعم للطلاب.',
  SHEFFIELD: 'أكاديمية في كوالالمبور تقدم برامج لغة إنجليزية ومسارات تدريب للطلاب والمهنيين.',
  ELS: 'برامج لغة ومسارات تحضيرية للطلاب الذين يخططون للدراسة في ماليزيا.',
  'British Council': 'اختبارات اللغة الإنجليزية والتحضير لـ IELTS ودعم أكاديمي للطلاب الدوليين.',
};

const InstituteLogo = memo(function InstituteLogo({ institute, size = 52 }: { institute: Institute; size?: number }) {
  const [failed, setFailed] = useState(false);
  const officialLogo = OFFICIAL_LOGOS[institute.abbr];

  if (!institute.domain || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${institute.color}12` }}>
        <span style={{ fontSize: size * 0.35, fontWeight: 900, color: institute.color }}>{institute.abbr.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 12, border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', background: '#fff' }}>
      <img
        src={officialLogo ?? `https://logo.clearbit.com/${institute.domain}?size=128`}
        alt={institute.abbr}
        loading="lazy"
        onError={e => {
          if (officialLogo && institute.domain) {
            e.currentTarget.src = `https://logo.clearbit.com/${institute.domain}?size=128`;
            e.currentTarget.onerror = () => setFailed(true);
            return;
          }
          const el = e.currentTarget as HTMLImageElement;
          el.src = `https://www.google.com/s2/favicons?domain=${institute.domain}&sz=128`;
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
    if (type === 'language') return t('type.language');
    if (type === 'pathway') return t('type.pathway');
    if (type === 'training') return t('type.training');
    return t('institutes.all');
  };
}

function formatTuition(min: number, max: number) {
  if (!min && !max) return 'Ask advisor';
  if (min && !max) return `From RM ${min.toLocaleString()}`;
  if (!min && max) return `Up to RM ${max.toLocaleString()}`;
  return `RM ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

const InstituteCard = memo(function InstituteCard({ institute }: { institute: Institute }) {
  const { t, language } = usePreferences();
  const typeLabel = useTypeLabel();
  const [hov, setHov] = useState(false);
  const description = language === 'ar' ? (AR_DESCRIPTIONS[institute.abbr] ?? institute.description) : institute.description;

  return (
    <article
      className="uni-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        border: hov ? '1px solid #D8DEFF' : '1px solid #f0f0f0',
        boxShadow: hov ? '0 12px 32px rgba(0,0,0,0.08)' : '0 1px 6px rgba(0,0,0,0.04)',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-3px)' : 'none',
        contain: 'layout',
      }}
    >
      <div className="uni-card-body" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 16 }}>
          <InstituteLogo institute={institute} size={52} />
          <span style={{ fontSize: 10, fontWeight: 600, color: institute.color, background: `${institute.color}12`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
            {typeLabel(institute.type)}
          </span>
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{institute.name}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{institute.location}</div>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {description}
        </p>

        <div className="uni-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 14, gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{t('institutes.tuition')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatTuition(institute.tuition_min, institute.tuition_max)}</div>
          </div>
        </div>
      </div>
    </article>
  );
});

export default function Institutes() {
  const { t } = usePreferences();
  const typeLabel = useTypeLabel();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedQ = useDebounce(q, 280);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (debouncedQ) params.q = debouncedQ;
    if (typeFilter) params.type = typeFilter;

    api.institutes.list(params)
      .then(r => { setInstitutes(r.data); setLoading(false); })
      .catch(() => { setInstitutes([]); setLoading(false); });
  }, [debouncedQ, typeFilter]);

  return (
    <div className="universities-page" style={{ paddingTop: 68, background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #062A3A, #4F6BFF)', padding: 'clamp(40px,6vw,60px) clamp(20px,5vw,40px) clamp(50px,7vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 16 }}>{t('institutes.title')}</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.78)', maxWidth: 590, margin: '0 auto', lineHeight: 1.7 }}>
            {t('institutes.copy')}
          </p>
        </div>
      </div>

      <div className="universities-filter-bar" style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '16px clamp(16px,4vw,40px)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="universities-filter-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="universities-filter-search" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: C.textMuted }}>⌕</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t('institutes.search')}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', background: C.bg }}
            />
          </div>
          <div className="universities-filter-chips" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['', 'language', 'pathway', 'training'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 50,
                  border: `1px solid ${typeFilter === type ? C.purpleMid : C.border}`,
                  background: typeFilter === type ? C.purplePale : '#fff',
                  color: typeFilter === type ? C.purpleMid : C.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {typeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,40px) 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.textMuted }}>{t('institutes.loading')}</div>
        ) : institutes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.textMuted }}>{t('institutes.empty')}</div>
        ) : (
          <div className="uni-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {institutes.map(institute => <InstituteCard key={institute.id} institute={institute} />)}
          </div>
        )}
      </div>
    </div>
  );
}
