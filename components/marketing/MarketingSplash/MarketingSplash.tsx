'use client';

import { useEffect, useState } from 'react';
import AnimatedBookLogo from '../AnimatedBookLogo/AnimatedBookLogo';
import styles from './MarketingSplash.module.css';

const HOLD_MS = 1250; // page-open + stitch-fade animation runtime, plus a short beat
const FADE_MS = 400;

/** A brand splash across the whole marketing site — like Gmail's logo
 *  screen before the app appears — not the small nav-bar mark (that
 *  stays static; see BrandIcon). Lives in app/(marketing)/layout.tsx,
 *  which the App Router keeps mounted across client-side navigation
 *  between marketing pages, so this plays once per visit (fresh load or
 *  hard refresh) rather than replaying every time a visitor clicks
 *  between Features/Pricing/About — reusing that persistence instead of
 *  a sessionStorage flag. */
export default function MarketingSplash() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('gone');
      return;
    }
    const fadeTimer = setTimeout(() => setPhase('fading'), HOLD_MS);
    const goneTimer = setTimeout(() => setPhase('gone'), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`${styles.overlay} ${phase === 'fading' ? styles.fading : ''}`} aria-hidden="true">
      <AnimatedBookLogo className={styles.mark} />
    </div>
  );
}
