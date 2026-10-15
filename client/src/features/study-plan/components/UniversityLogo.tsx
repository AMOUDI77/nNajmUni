import StudyPlanIcon from './StudyPlanIcon';
import { institutionLogos } from '../../../institutionLogos';
import { UNIVERSITIES } from '../../../data';

const logos: Record<string, string> = {
  '2': '/official-logos/usm.jpg', '12': '/official-logos/taylors.jpg', '13': '/official-logos/sunway.avif',
  '17': '/official-logos/lincoln.png', '19': '/official-logos/cyberjaya.jpg', '24': '/official-logos/unicam.png', '26': '/official-logos/heriot-watt.png',
};

export function getUniversityLogo(universityId: string, domain?: string) {
  const university = UNIVERSITIES.find(u => String(u.id) === universityId);
  return (university && institutionLogos[university.abbr]) ?? logos[universityId] ?? (domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : undefined);
}
export default function UniversityLogo({ universityId, name, logoUrl }: { universityId: string; name: string; logoUrl?: string }) {
  const logo = logoUrl ?? getUniversityLogo(universityId);
  return <div className="sp-university-logo">{logo ? <img src={logo} alt={`شعار ${name}`} loading="lazy" /> : <StudyPlanIcon name="university" size={25} />}</div>;
}
