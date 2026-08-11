'use client';

/** Resets scroll on a step/screen transition that swaps content in place
 *  rather than navigating — the browser has no reason to reset scroll on
 *  its own for those.
 *
 *  Which element actually scrolls varies by context: the authenticated app
 *  shell scrolls its own <main> (overflow-y: auto in app/(app)/layout.tsx),
 *  an open BottomSheet scrolls its own body div, and pages outside the
 *  shell scroll the window directly. Rather than hardcode a selector per
 *  case, this resets every element that's actually scrolled — cheap
 *  (querySelectorAll runs once per step change, not per frame) and correct
 *  regardless of which container the calling page happens to sit inside. */
export function scrollContentToTop() {
  window.scrollTo({ top: 0 });
  document.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement) || el.scrollTop === 0) return;
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTo({ top: 0 });
  });
}
