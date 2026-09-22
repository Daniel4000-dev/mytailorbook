'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import { trackEvent } from '@/lib/analytics';
import styles from './AppTour.module.css';

// Bump this if the tour's steps or targets change meaningfully — a
// returning user who already dismissed v1 won't otherwise ever see v2.
const TOUR_VERSION = 'v2';

function tourStorageKey(uid: string) {
  return `mtb_tour_seen_${TOUR_VERSION}:${uid}`;
}

interface TourStep {
  /** Matches a `data-tour-id` rendered on the real element — BottomNav and
   *  SidebarMenu both tag their links from NAV_ITEMS[].tourId (lib/
   *  constants.ts), and the layout's FAB instance is tagged directly
   *  (app/(app)/layout.tsx). Whichever nav the current viewport is
   *  actually showing, the id resolves to the one real element on screen. */
  targetId: string;
  title: string;
  body: string;
}

const TOOLTIP_WIDTH = 260;
const VIEWPORT_MARGIN = 12;

/** First-run product tour: spotlights the real nav items and the FAB in
 *  turn, with a small arrow-callout next to each one — same pattern as
 *  Intercom/Appcues-style SaaS onboarding, rather than a modal describing
 *  features in the abstract. Shown once per account (localStorage, not the
 *  database — this is a nice-to-have, not billing-critical state).
 *
 *  Reads target positions via getBoundingClientRect and portals its own
 *  overlay straight to document.body (same pattern BottomSheet/
 *  FixedBottomPortal already use) — it never adds a new fixed-position
 *  element *inside* the sidebar's transformed subtree, which is what
 *  actually caused this app's earlier position:fixed bugs (see the
 *  comment above BottomNav/FAB in app/(app)/layout.tsx). It only reads
 *  the real nav/FAB elements' on-screen position; it never moves or wraps
 *  them. */
export default function AppTour() {
  const { user, isOwner, loading, needsOnboarding } = useAuth();
  const mounted = useHasMounted();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    { targetId: 'home', title: 'Your Dashboard', body: "See today's activity at a glance — orders due, recent updates, and quick shortcuts." },
    { targetId: 'production', title: 'Production Board', body: 'Track every order from cutting through delivery, and assign work to your staff.' },
    { targetId: 'fabrics', title: 'Fabric Board', body: 'Browse every fabric photo on file and jump straight to its order.' },
    ...(isOwner
      ? [{
          targetId: 'customers',
          title: 'Customers',
          body: "Every client's measurements are saved here — captured once, reused automatically for every order after.",
        }]
      : []),
    { targetId: 'fab', title: 'Tap + to get started', body: 'Use this anytime to add a new customer or start a new order.' },
    { targetId: 'menu', title: 'More options', body: 'Your portfolio, style gallery, and more live behind this menu.' },
  ];

  useEffect(() => {
    if (loading || needsOnboarding || !user) return;
    try {
      if (!localStorage.getItem(tourStorageKey(user.uid))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActive(true);
      }
    } catch {
      // Storage can throw in private-browsing/storage-blocked contexts —
      // skip the tour rather than crash the app over a nice-to-have.
    }
  }, [loading, needsOnboarding, user]);

  const currentTargetId = active ? steps[step]?.targetId : undefined;

  const measure = useCallback(() => {
    if (!currentTargetId) {
      setRect(null);
      return;
    }
    // NAV_ITEMS render the same tourId in both SidebarMenu (desktop) and
    // BottomNav (mobile) at once — only one is actually visible at a given
    // viewport width, the other sits in the DOM at zero size. Picking the
    // first querySelector match would grab whichever renders first in DOM
    // order regardless of visibility (SidebarMenu comes first), so instead
    // scan every match and use the first one with a real, nonzero size.
    const candidates = document.querySelectorAll(`[data-tour-id="${currentTargetId}"]`);
    for (const el of candidates) {
      const candidateRect = el.getBoundingClientRect();
      if (candidateRect.width > 0 && candidateRect.height > 0) {
        setRect(candidateRect);
        return;
      }
    }
    setRect(null);
  }, [currentTargetId]);

  // getBoundingClientRect is a snapshot, not a live binding — a resize
  // listener alone isn't enough, since the target can also move from a
  // same-size layout shift (e.g. the dashboard's skeleton swapping for
  // real content changes page height, which can shift a target even
  // though nothing "resized"). Tracking every frame via rAF while the
  // tour is active is the standard fix for this class of bug and is cheap
  // enough for a short-lived overlay — this stops the spotlight/tooltip
  // from ever silently drifting out of sync with the real element.
  useEffect(() => {
    if (!active) return;
    let frameId: number;
    const tick = () => {
      measure();
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active, measure]);

  const dismiss = (completed: boolean) => {
    setActive(false);
    trackEvent(completed ? 'app_tour_completed' : 'app_tour_skipped', { step, ofSteps: steps.length });
    if (!user) return;
    try {
      localStorage.setItem(tourStorageKey(user.uid), '1');
    } catch {
      // Non-fatal — same reasoning as above.
    }
  };

  // No target found (an unexpected DOM state, or a step's element genuinely
  // isn't on screen right now) — bail rather than show an orphaned
  // tooltip with nothing to point at.
  if (!mounted || !user || !active || !rect) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const targetCenterX = rect.left + rect.width / 2;
  const maxLeft = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN;
  const tooltipLeft = Math.max(VIEWPORT_MARGIN, Math.min(targetCenterX - TOOLTIP_WIDTH / 2, maxLeft));
  const arrowLeft = Math.max(16, Math.min(targetCenterX - tooltipLeft, TOOLTIP_WIDTH - 16));
  // Most targets (bottom nav items, FAB) sit low on screen, so the callout
  // defaults to sitting above them — but the menu button sits at the very
  // top, where "above" would push the tooltip off-screen entirely. Flip to
  // below whenever the target itself is in the top half of the viewport.
  const placeBelow = rect.top < window.innerHeight / 2;
  const verticalStyle = placeBelow
    ? { top: rect.bottom + VIEWPORT_MARGIN }
    : { bottom: window.innerHeight - rect.top + VIEWPORT_MARGIN };

  return createPortal(
    <div className={styles.overlay} onClick={() => dismiss(false)}>
      <div
        className={styles.highlightRing}
        style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      <div
        className={styles.tooltip}
        style={{ left: tooltipLeft, width: TOOLTIP_WIDTH, ...verticalStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={placeBelow ? styles.tooltipArrowTop : styles.tooltipArrow}
          style={{ left: arrowLeft }}
        />
        <h3 className={styles.title}>{current.title}</h3>
        <p className={styles.body}>{current.body}</p>
        <div className={styles.footer}>
          <span className={styles.progress}>{step + 1}/{steps.length}</span>
          <div className={styles.actions}>
            {!isLast && (
              <button type="button" className={styles.skipBtn} onClick={() => dismiss(false)}>
                Skip
              </button>
            )}
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => (isLast ? dismiss(true) : setStep((s) => s + 1))}
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
