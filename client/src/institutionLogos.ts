import assets from './partnerLogos.json';
export const institutionLogos: Record<string, string> = {
  LINCOLN: '/official-logos/lincoln.png', SUNWAY: '/official-logos/sunway.avif',
  "TAYLOR'S": '/official-logos/taylors.jpg', CYBERJAYA: '/official-logos/cyberjaya.jpg',
  BIGBEN: '/official-logos/big-ben.png', 'BRITISH COUNCIL': '/official-logos/british-council.png',
  'British Council': '/official-logos/british-council.png', ELEC: '/official-logos/elec.jpg',
  ...Object.fromEntries(assets.filter(a => a.path).map(a => [a.abbr, a.path!])),
};
