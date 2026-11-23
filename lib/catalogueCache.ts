import { StyleCatalogue } from '@/lib/types';

/**
 * Persistent Stale-While-Revalidate client cache for Style Catalogues & Albums.
 *
 * Saves in memory and localStorage to guarantee 0ms instant load times
 * without empty skeletons when opening /catalogues or /catalogues/[catalogueId].
 */
const STORAGE_PREFIX = 'mtb_catalogues_';

let cachedCatalogues: { shopId: string; data: StyleCatalogue[] } | null = null;

export function getCachedCatalogues(shopId?: string | null): StyleCatalogue[] | null {
  if (shopId && cachedCatalogues && cachedCatalogues.shopId === shopId) {
    return cachedCatalogues.data;
  }

  if (typeof window !== 'undefined') {
    try {
      if (shopId) {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${shopId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            cachedCatalogues = { shopId, data: parsed };
            return parsed;
          }
        }
      } else {
        // Fallback: search for any stored catalogue in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
              }
            }
          }
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
  }

  return null;
}

export function setCachedCatalogues(shopId: string, data: StyleCatalogue[]): void {
  cachedCatalogues = { shopId, data };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${shopId}`, JSON.stringify(data));
    } catch {
      // Quota exceeded safe fallback
    }
  }
}

export function updateCachedCatalogue(shopId: string, updated: StyleCatalogue): void {
  const current = getCachedCatalogues(shopId) || [];
  const idx = current.findIndex((c) => c.id === updated.id);
  const next = [...current];
  if (idx !== -1) {
    next[idx] = updated;
  } else {
    next.push(updated);
  }
  setCachedCatalogues(shopId, next);
}

export function removeCachedCatalogue(shopId: string, catalogueId: string): void {
  const current = getCachedCatalogues(shopId) || [];
  const next = current.filter((c) => c.id !== catalogueId);
  setCachedCatalogues(shopId, next);
}

export function invalidateCatalogueCache(): void {
  cachedCatalogues = null;
}


