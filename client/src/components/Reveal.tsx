import type { CSSProperties, ReactNode } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface Props {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  style?: CSSProperties;
  className?: string;
}

export default function Reveal({ children, delay, direction, style, className }: Props) {
  const ref = useScrollReveal({ delay, direction });
  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
