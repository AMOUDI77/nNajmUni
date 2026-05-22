import type { CSSProperties } from 'react';

/*
 * NajmUni light luxury palette.
 * Primary: #4F6BFF
 * Purple accent: #7B61FF
 * Ink: #081331
 */

export const C = {
  /* Blue-purple brand scale */
  blue:      '#4F6BFF',
  blueDark:  '#3651E8',
  blueLight: '#7B61FF',
  bluePale:  '#F3F5FF',
  blueDim:   '#D8DEFF',

  /* Dark / ink scale */
  ink:       '#081331',
  jet:       '#111B3D',

  /* Neutrals */
  bg:        '#FBFCFF',
  bgSoft:    '#F5F7FF',
  text:      '#081331',
  textSub:   '#273153',
  textMuted: '#65708F',
  textFaint: '#98A1BA',
  border:    '#E7EAF5',
  borderSoft:'#F1F3FA',
  white:     '#FFFFFF',

  /* Legacy aliases: keep so existing components do not break */
  purpleDeep:  '#3651E8',
  purpleMid:   '#4F6BFF',
  purpleLight: '#7B61FF',
  purplePale:  '#F3F5FF',
  purpleDim:   '#D8DEFF',
  dark:        '#081331',
} as const;

export const gradientHero = `linear-gradient(135deg, ${C.blue} 0%, ${C.blueLight} 100%)`;
export const gradientMid  = `linear-gradient(135deg, ${C.blue} 0%, ${C.blueLight} 100%)`;
export const gradientCTA  = `linear-gradient(135deg, ${C.blue} 0%, ${C.blueLight} 100%)`;

export const card: CSSProperties = {
  background: C.white,
  borderRadius: 16,
  padding: 32,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${C.border}`,
};

export const pill = (bg = C.bluePale, color = C.blue): CSSProperties => ({
  display: 'inline-flex',
  fontSize: 11,
  fontWeight: 600,
  color,
  background: bg,
  borderRadius: 20,
  padding: '4px 12px',
});
