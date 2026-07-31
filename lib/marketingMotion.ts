'use client';

import { useReducedMotion, type Variants } from 'framer-motion';

/** Shared scroll-reveal used across every marketing page — same pattern
 *  already established in the public portfolio templates (ModernTemplate
 *  etc.), so the marketing site and the customer-facing portfolio pages
 *  move the same way. Respects prefers-reduced-motion. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/** Directional entrances for elements that should visibly travel into
 *  place (e.g. alternating feature rows) rather than just fade — gives
 *  the page more of a "walking rhythm" as you scroll. */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/** A snappier entrance with a slight overshoot — used for cards/CTAs that
 *  should feel like they "arrive" with more energy than a plain fade. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] } },
};

export function useReveal() {
  const reduceMotion = useReducedMotion();
  return (delay = 0, variants: Variants = fadeUp) =>
    reduceMotion
      ? {}
      : {
          initial: 'hidden',
          whileInView: 'shown',
          viewport: { once: true, margin: '-60px' },
          variants,
          transition: { delay },
        };
}
