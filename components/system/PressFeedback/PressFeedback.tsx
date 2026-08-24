'use client';

import { useEffect } from 'react';

// Invisible component mounted globally in layout.tsx.
//
// Every button/link across the app already has a hand-tuned CSS :active
// rule (background/scale/opacity changes, one per component). Those rules
// are correct but not sufficient on their own: verified live that a real
// mousedown→mouseup pair can land only ~7ms apart with zero repaint in
// between, meaning the browser never actually renders the :active frame —
// the style is applied and reverted between two paints, so the CSS
// transition never gets sampled. That's why hovering (which holds the
// pointer still) clearly "pops," but clicking can feel like nothing
// happened — the mechanism was never given a chance to paint.
//
// This adds one guaranteed-minimum-duration press cue on top: a subtle,
// universal opacity dip held for at least MIN_HOLD_MS regardless of how
// fast the click was, so every tap is visibly acknowledged. Opacity-only
// (not transform) so it never fights a component's own hover/active
// transform (translateX slides, scale pops, translateZ compositing, etc).
export default function PressFeedback() {
  useEffect(() => {
    const MIN_HOLD_MS = 90;
    let active: { el: HTMLElement; startedAt: number } | null = null;

    function findTarget(e: PointerEvent): HTMLElement | null {
      const path = e.composedPath();
      for (const node of path) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.hasAttribute('data-no-press')) return null;
        if (node.matches('button, a[href], [role="button"], summary')) {
          if (node instanceof HTMLButtonElement && node.disabled) return null;
          return node;
        }
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return; // left click / touch / pen primary only
      const el = findTarget(e);
      if (!el) return;
      el.setAttribute('data-sf-pressed', 'true');
      active = { el, startedAt: performance.now() };
    }

    function release() {
      if (!active) return;
      const { el, startedAt } = active;
      active = null;
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_HOLD_MS - elapsed);
      window.setTimeout(() => el.removeAttribute('data-sf-pressed'), wait);
    }

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
    };
  }, []);

  return null;
}
