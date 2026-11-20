'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRef } from 'react';
import { createSmartLocalStorageProvider } from '@/lib/offline/swrCache';

/**
 * Smart localStorage-backed SWR cache provider.
 *
 * Implements bounded LRU eviction, protects core shop bundle data,
 * and recovers gracefully if browser quota is constrained.
 */
function localStorageProvider() {
  return createSmartLocalStorageProvider();
}

export default function AppSWRConfig({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  // Deduplicate: only one "No internet" toast per offline episode, even if
  // multiple SWR keys error simultaneously.
  const offlineToastFired = useRef(false);

  return (
    <SWRConfig
      value={{
        provider: localStorageProvider,
        onError: (_err, _key) => {
          // Only surface an offline toast when the device is actually offline.
          // Network errors while online are intentionally silent here —
          // callers in DataContext / pages handle those themselves.
          if (!navigator.onLine) {
            if (!offlineToastFired.current) {
              offlineToastFired.current = true;
              showToast('No internet connection — you can still browse cached data', 'info');
              setTimeout(() => { offlineToastFired.current = false; }, 8000);
            }
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
