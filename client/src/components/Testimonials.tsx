import { useState } from 'react';
import { C } from '../styles/theme';
import { usePreferences } from '../i18n';

const testimonials = [
  {
    name: 'Khaled Abdullah',
    country: 'Saudi Arabia 🇸🇦',
    university: 'APU',
    program: 'Bachelor of Software Engineering',
    text: 'NajmUni made the entire process so smooth. From choosing APU to getting my visa, every step was handled professionally. I highly recommend them to any student who wants to study in Malaysia.',
    // hooded Arabic male portrait from /image/ folder
    avatarSrc: '/avatars/arabic-male.jpg',
    avatarFit: 'cover' as const,
  },
  {
    name: 'Aisha Mohammed',
    country: 'Yemen 🇾🇪',
    university: 'UM',
    program: 'Bachelor of Medicine (MBBS)',
    text: 'I was confused about which university to pick for medicine. The NajmUni team sat with me, understood my budget, and got me into UM. The support did not stop after admission either — they helped with my student pass.',
    avatarSrc: '/avatars/arabic-symbol.jpg',
    avatarFit: 'contain' as const,
  },
  {
    name: 'Omar Al-Rashidi',
    country: 'Libya 🇱🇾',
    university: 'MMU',
    program: 'Bachelor of Computer Science (AI)',
    text: 'Excellent service from start to finish. I came to Malaysia not knowing anyone, and NajmUni arranged my accommodation, SIM card and airport pickup. Now I am in my second year and loving it.',
    avatarSrc: '/avatars/gon.jpg',
    avatarFit: 'cover' as const,
  },
  {
    name: 'Fatima Al-Zahra',
    country: 'Sudan 🇸🇩',
    university: 'USM',
    program: 'Bachelor of Pharmacy',
    text: 'The budget calculator on the website helped me plan before I even contacted them. When I reached out, they confirmed the numbers and walked me through every document needed. A very trustworthy team.',
    avatarSrc: '/avatars/student-study.jpg',
    avatarFit: 'cover' as const,
  },
];

export default function Testimonials() {
  const { t } = usePreferences();
  const [active, setActive] = useState(0);
  const activeTestimonial = testimonials[active];

  return (
    <section style={{ padding: 'clamp(52px,8vw,80px) clamp(20px,4vw,40px)', background: '#fff' }} id="testimonials">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,56px)' }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1.15 }}>
            {t('testimonials.titleA')} <span style={{ color: C.purpleMid }}>{t('testimonials.titleB')}</span>
          </h2>
        </div>

        <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(20px,4vw,40px)', alignItems: 'center' }}>
          {/* Quote */}
          <div style={{ background: `linear-gradient(135deg, ${C.purpleDeep}, ${C.purpleMid})`, borderRadius: 'clamp(16px,3vw,28px)', padding: 'clamp(28px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ fontSize: 'clamp(40px,6vw,64px)', color: 'rgba(255,255,255,0.2)', fontFamily: 'Georgia', lineHeight: 0.8, marginBottom: 16 }}>"</div>
            <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, marginBottom: 'clamp(20px,3vw,32px)', position: 'relative', zIndex: 1 }}>{activeTestimonial.text}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.15)' }}>
                <img src={activeTestimonial.avatarSrc} alt={activeTestimonial.name} width={48} height={48} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: activeTestimonial.avatarFit }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{activeTestimonial.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{activeTestimonial.country} - {activeTestimonial.university} - {activeTestimonial.program}</div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {testimonials.map((item, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => setActive(i)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActive(i);
                  }
                }}
                style={{
                background: active === i ? C.purplePale : '#fff',
                border: active === i ? `1px solid ${C.purpleMid}` : `1px solid ${C.border}`,
                borderRadius: 16, padding: '18px 20px', cursor: 'pointer',
                transition: 'all 0.25s', display: 'flex', gap: 14, alignItems: 'center',
                boxShadow: active === i ? `0 8px 24px ${C.purpleMid}22` : 'none',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#F3F4F6' }}>
                  <img src={item.avatarSrc} alt={item.name} width={40} height={40} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: item.avatarFit }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{item.country} · {item.university}</div>
                </div>
                {active === i && <span style={{ marginLeft: 'auto', color: C.purpleMid, fontSize: 18 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
