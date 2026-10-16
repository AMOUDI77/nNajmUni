import { Link } from 'react-router-dom';
import WhatsAppIcon from './WhatsAppIcon';

export default function Hero() {
  return (
    <section className="hero-section" style={{
      maxWidth: 1440,
      margin: '0 auto',
      padding: '96px clamp(20px,4vw,40px) 48px',
    }}>
      <div className="hero-wrap" style={{
        position: 'relative',
        minHeight: 520,
        borderRadius: 30,
        overflow: 'hidden',
        padding: '84px clamp(32px,5vw,68px) 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 78% 18%, rgba(79,107,255,0.44), transparent 34%), linear-gradient(116deg, #101216 0%, #151922 48%, #075BD7 100%)',
        boxShadow: '0 36px 90px rgba(8,19,49,0.22)',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1.5px)',
          backgroundSize: '26px 26px',
          opacity: 0.35,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          right: -160,
          top: -130,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,107,255,0.32), transparent 62%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }} />

        <div className="hero-copy-col" style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 820,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <h1 className="hero-title" style={{
            fontSize: 'clamp(46px,6vw,80px)',
            lineHeight: 1.08,
            letterSpacing: '-1.8px',
            color: '#fff',
            fontWeight: 900,
            marginBottom: 22,
          }}>
            ابدأ رحلتك{' '}
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #4F8CFF 0%, #7B61FF 100%)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>الدراسية</span>
            <br />في ماليزيا
          </h1>

          <p className="hero-copy" style={{ fontSize: 18, lineHeight: 1.72, color: 'rgba(255,255,255,0.74)', maxWidth: 600, marginBottom: 30 }}>
            نساعدك تختار الجامعة أو المعهد والتخصص المناسب، ونسهّل عليك إجراءات القبول.
          </p>

          <div className="hero-entry-actions">
            <Link className="student-button" to="/explore">شوف الجامعات واختر تخصصك</Link>
            <Link className="student-button secondary" to="/apply"><WhatsAppIcon />يلا ابدأ قبولك</Link>
          </div>
        </div>
        <img className="hero-mascot" src="/najmuni-mascot.png" alt="" width="1280" height="1280" />
      </div>
    </section>
  );
}
