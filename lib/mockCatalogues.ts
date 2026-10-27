import { StyleCatalogue } from './types';

export const MOCK_CATALOGUES: StyleCatalogue[] = [
  {
    id: 'mock-agbada',
    shopId: 'mock-shop',
    title: 'Royal Agbada Collection',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    photos: [
      {
        id: 'photo-agbada-1',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/blog/agbada-ceremonial-amurode.jpg',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'photo-agbada-2',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/blog/agbada-cover.jpg',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'photo-agbada-3',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/blog/agbada-slim-fit.jpg',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'photo-agbada-4',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/blog/agbada-embroidery-detail.jpg',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'photo-agbada-5',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/mock/mock_agbada_1789589437748.jpg',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'photo-agbada-6',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/garments/agbada-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'photo-agbada-7',
        catalogueId: 'mock-agbada',
        imageUrl: '/images/blog/agbada-ladies-cover.jpg',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'mock-senator',
    shopId: 'mock-shop',
    title: 'Modern Senator Styles',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    photos: [
      {
        id: 'photo-senator-1',
        catalogueId: 'mock-senator',
        imageUrl: '/images/blog/senator-wear-cover.jpg',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: 'photo-senator-2',
        catalogueId: 'mock-senator',
        imageUrl: '/images/blog/senator-collar-detail.jpg',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'photo-senator-3',
        catalogueId: 'mock-senator',
        imageUrl: '/images/blog/senator-wide-leg.jpg',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'photo-senator-4',
        catalogueId: 'mock-senator',
        imageUrl: '/images/garments/senator-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'photo-senator-5',
        catalogueId: 'mock-senator',
        imageUrl: '/images/garments/senator-female.jpg',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'photo-senator-6',
        catalogueId: 'mock-senator',
        imageUrl: '/images/mock/premium_1.jpg',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'mock-suits',
    shopId: 'mock-shop',
    title: 'Executive Bespoke Suits',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    photos: [
      {
        id: 'photo-suit-1',
        catalogueId: 'mock-suits',
        imageUrl: '/images/mock/mock_suit_1789589458471.jpg',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: 'photo-suit-2',
        catalogueId: 'mock-suits',
        imageUrl: '/images/mock/mock_suit_nigerian_1789589547408.jpg',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: 'photo-suit-3',
        catalogueId: 'mock-suits',
        imageUrl: '/images/mock/premium_2.jpg',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'photo-suit-4',
        catalogueId: 'mock-suits',
        imageUrl: '/images/mock/premium_3.jpg',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'photo-suit-5',
        catalogueId: 'mock-suits',
        imageUrl: '/images/garments/suit-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'photo-suit-6',
        catalogueId: 'mock-suits',
        imageUrl: '/images/mock/mock_detail_1789589482150.jpg',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'mock-kaftans',
    shopId: 'mock-shop',
    title: 'Luxury Kaftans & Danshiki',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    photos: [
      {
        id: 'photo-kaftan-1',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/blog/kaftan-babban-riga-cover.jpg',
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
      {
        id: 'photo-kaftan-2',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/blog/kaftan-embroidery-detail.jpg',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: 'photo-kaftan-3',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/garments/kaftan-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: 'photo-kaftan-4',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/garments/kaftan-female.jpg',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'photo-kaftan-5',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/garments/danshiki-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'photo-kaftan-6',
        catalogueId: 'mock-kaftans',
        imageUrl: '/images/garments/babariga-male.jpg',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'mock-bridal',
    shopId: 'mock-shop',
    title: 'Bridal & Evening Gowns',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    photos: [
      {
        id: 'photo-bridal-1',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/blog/bridal-gown-cover.jpg',
        createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
      },
      {
        id: 'photo-bridal-2',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/blog/bridal-gown-boutique.jpg',
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
      {
        id: 'photo-bridal-3',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/blog/lace-bridal-gown.jpg',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: 'photo-bridal-4',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/blog/bridal-gown-detail.jpg',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: 'photo-bridal-5',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/mock/premium_4.jpg',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'photo-bridal-6',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/mock/premium_5.jpg',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'photo-bridal-7',
        catalogueId: 'mock-bridal',
        imageUrl: '/images/blog/aso-oke-structured-gown.jpg',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
];

const STORAGE_KEY = 'mtb_client_mock_catalogues';
const MOCK_FLAG_KEY = 'mtb_use_mock_catalogues';

/**
 * Checks if frontend mock mode is currently active
 */
export function isMockCataloguesActive(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = localStorage.getItem(MOCK_FLAG_KEY);
  // Default to true if not explicitly disabled or wiped
  return flag !== 'false';
}

/**
 * Retrieves the current mock catalogues from localStorage,
 * initializing them with default MOCK_CATALOGUES if first run.
 */
export function getStoredMockCatalogues(): StyleCatalogue[] {
  if (typeof window === 'undefined') return MOCK_CATALOGUES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Auto-initialize with default mock data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CATALOGUES));
      localStorage.setItem(MOCK_FLAG_KEY, 'true');
      return MOCK_CATALOGUES;
    }
    return JSON.parse(raw);
  } catch {
    return MOCK_CATALOGUES;
  }
}

/**
 * Saves mock catalogues to localStorage
 */
export function saveMockCatalogues(list: StyleCatalogue[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(MOCK_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Failed to save mock catalogues:', err);
  }
}

/**
 * Wipes all mock catalogues (sets empty array and disabled flag)
 */
export function wipeMockCatalogues(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(MOCK_FLAG_KEY, 'false');
  } catch (err) {
    console.error('Failed to wipe mock catalogues:', err);
  }
}

/**
 * Resets back to the rich default mock catalogues
 */
export function resetMockCatalogues(): StyleCatalogue[] {
  if (typeof window === 'undefined') return MOCK_CATALOGUES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CATALOGUES));
    localStorage.setItem(MOCK_FLAG_KEY, 'true');
    return MOCK_CATALOGUES;
  } catch {
    return MOCK_CATALOGUES;
  }
}

