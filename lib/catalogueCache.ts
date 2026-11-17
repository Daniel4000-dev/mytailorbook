import { StyleCatalogue } from '@/lib/types';

/**
 * In-memory client cache for Style Catalogues & Albums.
 *
 * Prevents skeleton flashes and jarring full-page reloads when navigating
 * back and forth between /catalogues and /catalogues/[catalogueId].
 */
let cachedCatalogues: { shopId: string; data: StyleCatalogue[] } | null = null;

export function getCachedCatalogues(shopId: string): StyleCatalogue[] | null {
  if (cachedCatalogues && cachedCatalogues.shopId === shopId) {
    return cachedCatalogues.data;
  }
  return null;
}

export function setCachedCatalogues(shopId: string, data: StyleCatalogue[]): void {
  cachedCatalogues = { shopId, data };
}

export function updateCachedCatalogue(shopId: string, updated: StyleCatalogue): void {
  if (cachedCatalogues && cachedCatalogues.shopId === shopId) {
    const idx = cachedCatalogues.data.findIndex((c) => c.id === updated.id);
    if (idx !== -1) {
      cachedCatalogues.data[idx] = updated;
    } else {
      cachedCatalogues.data.push(updated);
    }
  }
}

export function removeCachedCatalogue(shopId: string, catalogueId: string): void {
  if (cachedCatalogues && cachedCatalogues.shopId === shopId) {
    cachedCatalogues.data = cachedCatalogues.data.filter((c) => c.id !== catalogueId);
  }
}

export function invalidateCatalogueCache(): void {
  cachedCatalogues = null;
}

