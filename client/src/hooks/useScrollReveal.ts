import { useEffect, useRef } from 'react';

interface Options {
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  threshold?: number;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(opts?: Options) {
  const ref = useRef<T>(null);
  const { delay = 0, direction = 'up', threshold = 0.12 } = opts ?? {};

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from =
      direction === 'up' ? 'translateY(40px)' :
      direction === 'left' ? 'translateX(-40px)' :
      'translateX(40px)';

    el.style.opacity = '0';
    el.style.transform = from;
    el.style.transition = `opacity 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'none';
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction, threshold]);

  return ref;
}
