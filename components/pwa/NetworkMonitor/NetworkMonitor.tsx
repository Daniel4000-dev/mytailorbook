'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

/**
 * Invisible component mounted globally in layout.tsx.
 * Listens to the browser's online/offline events and fires a single
 * deduplicated toast when the connection drops.
 *
 * A second toast fires when connectivity is restored, so users know
 * the app is back to live-syncing after a period of offline reads.
 *
 * We don't toast every SWR fetch error here — DataContext's onError
 * handles that path. This component owns the event-driven path:
 * the device went offline regardless of whether a request was in flight.
 */
export default function NetworkMonitor() {
  const { showToast } = useToast();
  // Prevent rapid-fire duplicate toasts if the browser fires the event
  // multiple times in quick succession.
  const offlineToastPending = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      if (offlineToastPending.current) return;
      offlineToastPending.current = true;
      showToast('No internet connection — you can still browse cached data', 'info');
      // Reset after a short cooldown so a later disconnection can toast again.
      setTimeout(() => { offlineToastPending.current = false; }, 8000);
    };

    const handleOnline = () => {
      // Only announce reconnection if we actually went offline first.
      if (!offlineToastPending.current) {
        showToast('Back online — syncing your latest data', 'success');
      }
      offlineToastPending.current = false;
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast]);

  return null;
}
