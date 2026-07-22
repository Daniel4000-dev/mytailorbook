'use client';

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/lib/hooks/useHasMounted';

/** Renders children straight onto document.body instead of in place.
 *
 *  `.appShell` (the sidebar/main-content wrapper in app/(app)/layout.tsx)
 *  applies a real `transform` while the sidebar is open. Per this app's own
 *  prior fix for BottomNav/FAB/InstallPrompt: once a `position: fixed`
 *  element has ever sat inside a transformed ancestor, some browsers
 *  permanently mis-associate its containing block — even after the
 *  transform reverts to `none` — so it stops tracking the real viewport
 *  and instead positions relative to whatever scrollable ancestor it
 *  ends up bound to (making it appear pushed down to the bottom of the
 *  full scrollable content instead of staying pinned on screen).
 *
 *  Global chrome was moved outside `.appShell` entirely to dodge this.
 *  Page-specific fixed bars (a wizard's sticky action bar, etc.) can't do
 *  that the same way since they're defined inside the page itself — this
 *  portal gives them the same escape hatch. */
export default function FixedBottomPortal({ children }: { children: ReactNode }) {
  const mounted = useHasMounted();
  if (!mounted) return null;
  return createPortal(children, document.body);
}
