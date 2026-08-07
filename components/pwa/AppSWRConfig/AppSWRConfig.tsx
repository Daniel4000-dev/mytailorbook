'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRef } from 'react';

/**
 * localStorage-backed SWR cache provider.
 *
 * INVALIDATION: SWR calls cache.set() on every successful fetch and
 * cache.delete() when a key is removed. Optimistic mutates in DataContext
 * (mutate(newData, { revalidate: false })) write directly into this map,
 * so the localStorage snapshot stays consistent with in-memory state.
 * A subsequent server revalidation overwrites the entry with truth.
 */
function localStorageProvider() {
  if (typeof window === 'undefined') return new Map();

  let map: Map<string, any>;
  try {
    map = new Map(JSON.parse(localStorage.getItem('mtb-swr-cache') || '[]'));
  } catch {
    map = new Map();
  }

  return {
    get: (key: string) => map.get(key),
    set: (key: string, value: any) => {
      map.set(key, value);
      try {
        localStorage.setItem('mtb-swr-cache', JSON.stringify(Array.from(map.entries())));
      } catch {
        // Storage quota exceeded — silently skip persistence.
      }
    },
    delete: (key: string) => {
      map.delete(key);
      try {
        localStorage.setItem('mtb-swr-cache', JSON.stringify(Array.from(map.entries())));
      } catch {
        // Ignored
      }
    },
    keys: () => map.keys(),
  } as any;
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
