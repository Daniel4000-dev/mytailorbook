import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1024px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True at desktop widths (matches the app's own 1024px breakpoint used
 *  throughout the CSS). Backed by useSyncExternalStore (not a resize
 *  effect + setState) so it's hydration-safe the same way useHasMounted
 *  is — assumes mobile on the server, corrects on the client in the one
 *  supported re-render, never trips "no setState in an effect". */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
