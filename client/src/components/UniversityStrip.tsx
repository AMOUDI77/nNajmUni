import { useState, useEffect, memo } from 'react';
import { C } from '../styles/theme';
import { api } from '../api';
import { UNIVERSITIES } from '../data';
import type { Institute, University } from '../types';
import { usePreferences } from '../i18n';

// Priority unis appear first in the marquee
const PRIORITY = ['Taylor', "Taylor's", 'Sunway', 'UCSI', 'APU', 'MMU', 'Monash', 'UTP'];

const FALLBACK_INSTITUTES = [
  { id: 'bc',  abbr: 'British Council', domain: 'britishcouncil.org', location: 'Kuala Lumpur' },
  { id: 'els', abbr: 'ELS',             domain: 'els.edu.my',          location: 'Kuala Lumpur' },
  { id: 'ems', abbr: 'EMS',             domain: 'ems.edu.my',          location: 'Kuala Lumpur' },
];

const OFFICIAL_LOGOS: Record<string, string> = {
  USM: '/official-logos/usm.jpg',
  HWU: '/official-logos/heriot-watt.png',
  LINCOLN: '/official-logos/lincoln.png',
  SUNWAY: '/official-logos/sunway.avif',
  "TAYLOR'S": '/official-logos/taylors.jpg',
  UNICAM: '/official-logos/unicam.png',
  CYBERJAYA: '/official-logos/cyberjaya.jpg',
  BIGBEN: '/official-logos/big-ben.png',
  'British Council': '/official-logos/british-council.png',
  ELEC: '/official-logos/elec.jpg',
};

type StripItem = { id: string | number; abbr: string; domain: string | null; location: string };

function priorityIndex(item: StripItem) {
  const i = PRIORITY.findIndex(p => item.abbr.toLowerCase().includes(p.toLowerCase()));
  return i === -1 ? 999 : i;
}

function toStripItems(unis: University[]): StripItem[] {
  return unis
    .map(u => ({ id: u.id, abbr: u.abbr, domain: u.domain, location: u.location }))
    .sort((a, b) => priorityIndex(a) - priorityIndex(b));
}

function toInstituteItems(institutes: Institute[]): StripItem[] {
  return institutes.map(i => ({ id: `institute-${i.id}`, abbr: i.abbr, domain: i.domain, location: i.location }));
}

const LogoChip = memo(function LogoChip({ item, hov }: { item: StripItem; hov: boolean }) {
  const officialLogo = OFFICIAL_LOGOS[item.abbr];
  const [src, setSrc] = useState(
    officialLogo || (item.domain ? `https://www.google.com/s2/favicons?domain=${item.domain}&sz=128` : '')
  );
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setSrc(officialLogo || (item.domain ? `https://www.google.com/s2/favicons?domain=${item.domain}&sz=128` : ''));
    setStage(0);
  }, [item.domain, officialLogo]);

  const handleErr = () => {
    if (stage === 0 && officialLogo && item.domain) {
      setSrc(`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`);
      setStage(1);
      return;
    }
    if (stage === 0 && item.domain) {
      setSrc(`https://logo.clearbit.com/${item.domain}?size=160`);
      setStage(1);
    } else {
      setStage(2);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      width: 96, flexShrink: 0,
      transform: hov ? 'translateY(-5px)' : 'none',
      transition: 'transform 0.32s cubic-bezier(.22,1,.36,1)',
      cursor: 'default',
    }}>
      {/* logo — no box, no background */}
      <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {stage < 2 && src ? (
          <img
            src={src}
            alt={item.abbr}
            loading="lazy"
            decoding="async"
            onError={handleErr}
            style={{
              width: 52, height: 52, objectFit: 'contain',
              filter: hov ? 'none' : 'grayscale(90%)',
              opacity: hov ? 1 : 0.6,
              transition: 'filter 0.4s ease, opacity 0.4s ease',
              display: 'block',
            }}
          />
        ) : (
          <span style={{ fontSize: 15, fontWeight: 900, color: hov ? '#4F6BFF' : '#9CA3AF', transition: 'color 0.3s' }}>
            {item.abbr.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      {/* label */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: hov ? '#111827' : '#9CA3AF',
        letterSpacing: '0.2px', lineHeight: 1.2,
        textAlign: 'center',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 88,
        transition: 'color 0.3s',
      }}>
        {item.abbr}
      </span>
    </div>
  );
});

export default function UniversityStrip() {
  const [items, setItems] = useState<StripItem[]>(() => [...toStripItems(UNIVERSITIES), ...FALLBACK_INSTITUTES]);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const { t } = usePreferences();

  useEffect(() => {
    Promise.allSettled([
      api.universities.list({ limit: '50' }),
      api.institutes.list(),
    ]).then(([unisResult, institutesResult]) => {
      const unis = unisResult.status === 'fulfilled' ? toStripItems(unisResult.value.data) : toStripItems(UNIVERSITIES);
      const institutes = institutesResult.status === 'fulfilled' ? toInstituteItems(institutesResult.value.data) : FALLBACK_INSTITUTES;
      setItems([...unis, ...institutes]);
    });
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section style={{ padding: '0 0 72px', background: '#fff' }}>
      {/* header */}
      <div style={{ textAlign: 'center', padding: 'clamp(40px,6vw,56px) clamp(20px,4vw,40px) 32px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: C.purplePale, borderRadius: 50, padding: '5px 14px', marginBottom: 12,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.purpleMid }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.purpleMid, letterSpacing: '3px', textTransform: 'uppercase' }}>{t('partners.badge')}</span>
        </div>
        <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
          {t('partners.title')}
        </h2>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
          {items.length} {t('partners.subtitle')}
        </p>
      </div>

      {/* marquee */}
      <div style={{ position: 'relative', overflow: 'hidden', direction: 'ltr' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #fff, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #fff, transparent)', zIndex: 2, pointerEvents: 'none' }} />

        <div className="partner-marquee-track" style={{ alignItems: 'flex-start', gap: 24, padding: '8px 0 12px' }}>
          {doubled.map((item, i) => (
            <div
              key={i}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
            >
              <LogoChip item={item} hov={hovIdx === i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

