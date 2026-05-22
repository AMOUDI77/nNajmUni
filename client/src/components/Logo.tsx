interface Props {
  height?: number;
  tone?: 'light' | 'dark';
}

export default function Logo({ height = 36, tone = 'light' }: Props) {
  const src = tone === 'dark' ? '/logo.dark.png' : '/logo.white.png';

  return <img src={src} alt="NajmUni" style={{ height, width: 'auto', display: 'block' }} />;
}
