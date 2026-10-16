import { useCopy } from '../copy';
import { institutionLogos as officialLogos } from '../institutionLogos';
import { useState } from 'react';



export default function InstitutionIdentity({ name, abbr, domain, location }: {
  name: string; abbr: string; domain?: string; location?: string;
}) {
  const { tr, language: copyLanguage } = useCopy();
  const [failedSource, setFailedSource] = useState<string>();
  const source = officialLogos[abbr.toUpperCase()] || (domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : undefined);
  return <div className="institution-identity">
    <div className="institution-logo">
      {source && failedSource !== source ? <img src={source} alt={copyLanguage === 'ar' ? `شعار ${tr(name)}` : `${name} logo`} loading="lazy" decoding="async" onError={() => setFailedSource(source)} /> : <span>{tr(abbr)}</span>}
    </div>
    <div className="institution-name"><strong dir="auto">{tr(name)}</strong><span dir="auto">{abbr}{location ? ` · ${tr(location)}` : ''}</span></div>
  </div>;
}
