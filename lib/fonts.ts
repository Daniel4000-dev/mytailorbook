import { Inter, Fraunces, Manrope } from 'next/font/google';

/** Self-hosted via next/font/google — no more third-party round-trip to
 *  fonts.googleapis.com before text can render. Exposed as CSS variables
 *  (not the default className approach) so styles/tokens.css and every
 *  component that already references these by name can keep working
 *  after swapping `var(--font-inter)` etc. in for the literal font-family
 *  strings, instead of rewriting every consumer to use next/font's
 *  generated className. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});
