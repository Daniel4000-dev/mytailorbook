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

export function useReveal() {
  const reduceMotion = useReducedMotion();
  return (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: 'hidden',
          whileInView: 'shown',
          viewport: { once: true, margin: '-60px' },
          variants: fadeUp,
          transition: { delay },
        };
}
