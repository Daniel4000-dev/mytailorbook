import { PublicPortfolio, PortfolioOutfit } from '@/app/public-actions';
import type { Order } from '@/lib/types';

export const DEFAULT_MOCK_PORTFOLIO: PublicPortfolio = {
  shop: {
    id: 'mock-shop',
    name: 'Savile Row Atelier',
    slug: 'savile-row',
    portfolioAccent: 'indigo',
    bio: 'Rooted in heritage pattern drafting and refined African artisanal craftsmanship. We have spent over a decade crafting bespoke garments that command presence, drape impeccably, and outlive fast fashion cycles.',
    tagline: 'Architects of Regal Drape & Bespoke Excellence',
    foundedYear: 2014,
    address: '14 Victoria Island Boulevard, Lagos',
    phone: '+2348030000000',
  },
  stats: {
    completed: 148,
    onTimePercent: 99,
    stylesCount: 6,
  },
  ratingSummary: {
    average: 4.9,
    count: 38,
  },
  testimonials: [
    {
      customerName: 'Chief Adeleke O.',
      comment: 'The embroidery on my daughter\'s wedding Agbada was the talk of the entire banquet. Unyielding structure and pristine hem finishing.',
      rating: 5,
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      customerName: 'Dr. Chinedu M.',
      comment: 'The first tailor who truly understands how a double-breasted suit should drape without pulling across the chest. Delivered two days ahead of schedule.',
      rating: 5,
      submittedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      customerName: 'Kemi Adeyemi',
      comment: 'The internal corsetry on my reception gown was breathtaking yet comfortable enough to dance in all night. A truly master artisan.',
      rating: 5,
      submittedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      customerName: 'Ibrahim Bello',
      comment: 'Impeccable cut on my ceremonial Kaftans. Crisp, sharp, and genuinely royal.',
      rating: 5,
      submittedAt: new Date(Date.now() - 86400000 * 35).toISOString(),
    },
  ],
  outfits: [
    {
      id: 'mock-outfit-1',
      title: 'The Royal Sovereign Agbada',
      category: 'Traditional',
      startingPrice: 380000,
      materials: '100% Hand-Woven Aso-Oke with Metallic Gold Threadwork',
      displayPhotos: [
        { url: '/images/blog/agbada-ceremonial-amurode.jpg', angle: 'front' },
        { url: '/images/blog/agbada-embroidery-detail.jpg', angle: 'detail' },
      ],
      storyModeEnabled: true,
      storyCaption: 'Commissioned for a high-profile traditional wedding in Lagos. Over 48 hours of precision embroidery was hand-stitched into the chest piece to achieve an unyielding, regal drape that rests perfectly square on the shoulders.',
      storyPhotos: [
        '/images/mock/mock_process_chalk_1789591170047.jpg',
        '/images/mock/mock_process_sewing_1789591187626.jpg',
      ],
    },
    {
      id: 'mock-outfit-2',
      title: 'Executive Bespoke Double-Breasted Suit',
      category: 'Suits',
      startingPrice: 520000,
      materials: 'Super 150s Merino Wool with Hand-Stitched Milanese Lapel',
      displayPhotos: [
        { url: '/images/mock/mock_suit_nigerian_1789589547408.jpg', angle: 'front' },
        { url: '/images/mock/mock_detail_nigerian_1789589583459.jpg', angle: 'detail' },
      ],
      storyModeEnabled: true,
      storyCaption: 'Structured shoulders with a floating full-canvas horsehair chest piece designed to mold to the client\'s exact posture over years of international boardroom wear.',
      storyPhotos: [
        '/images/mock/mock_suit_1789589458471.jpg',
      ],
    },
    {
      id: 'mock-outfit-3',
      title: 'Modern Minimalist Senator Set',
      category: 'Senator',
      startingPrice: 195000,
      materials: 'Irish Cashmere Blend with Concealed Placket & Geometric Collar',
      displayPhotos: [
        { url: '/images/blog/senator-wear-cover.jpg', angle: 'front' },
        { url: '/images/blog/senator-collar-detail.jpg', angle: 'detail' },
      ],
      storyModeEnabled: false,
      storyCaption: null,
      storyPhotos: [],
    },
    {
      id: 'mock-outfit-4',
      title: 'Luxe Embroidered Kaftan & Danshiki',
      category: 'Kaftan',
      startingPrice: 240000,
      materials: 'Crisp Swiss Damask with Tone-on-Tone Threadwork',
      displayPhotos: [
        { url: '/images/blog/kaftan-babban-riga-cover.jpg', angle: 'front' },
        { url: '/images/blog/kaftan-embroidery-detail.jpg', angle: 'detail' },
      ],
      storyModeEnabled: true,
      storyCaption: 'Clean geometric symmetry on the collar with tailored side slits for comfortable all-day ceremonial movement under warm climates.',
      storyPhotos: [
        '/images/garments/kaftan-male.jpg',
      ],
    },
    {
      id: 'mock-outfit-5',
      title: 'Couture Bridal Reception Gown',
      category: 'Bridal',
      startingPrice: 650000,
      materials: 'Beaded French Corded Lace & Silk Organza Lining',
      displayPhotos: [
        { url: '/images/blog/bridal-gown-cover.jpg', angle: 'front' },
        { url: '/images/blog/lace-bridal-gown.jpg', angle: 'detail' },
      ],
      storyModeEnabled: true,
      storyCaption: 'Sculpted bodice with custom internal steel-boned corsetry engineered to provide effortless posture and dancing comfort throughout the wedding reception.',
      storyPhotos: [
        '/images/blog/bridal-gown-detail.jpg',
      ],
    },
    {
      id: 'mock-outfit-6',
      title: 'Structural Aso-Oke Evening Gown',
      category: 'Dresses',
      startingPrice: 420000,
      materials: 'Metallic Threaded Aso-Oke with Flared Architectural Hem',
      displayPhotos: [
        { url: '/images/blog/aso-oke-structured-gown.jpg', angle: 'front' },
        { url: '/images/blog/aso-oke-styles-for-ladies.jpg', angle: 'detail' },
      ],
      storyModeEnabled: false,
      storyCaption: null,
      storyPhotos: [],
    },
  ],
  photos: [
    { url: '/images/blog/agbada-ceremonial-amurode.jpg' },
    { url: '/images/mock/mock_suit_nigerian_1789589547408.jpg' },
    { url: '/images/blog/senator-wear-cover.jpg' },
    { url: '/images/blog/kaftan-babban-riga-cover.jpg' },
    { url: '/images/blog/bridal-gown-cover.jpg' },
    { url: '/images/blog/aso-oke-structured-gown.jpg' },
  ],
  isPremium: true,
};

const PORTFOLIO_STORAGE_KEY = 'mtb_client_mock_portfolio';
const PORTFOLIO_MOCK_FLAG_KEY = 'mtb_use_mock_portfolio';

/**
 * Checks if frontend mock portfolio mode is active
 */
export function isMockPortfolioActive(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = localStorage.getItem(PORTFOLIO_MOCK_FLAG_KEY);
  return flag !== 'false';
}

/**
 * Retrieves the stored mock portfolio or initializes it with DEFAULT_MOCK_PORTFOLIO
 */
export function getStoredMockPortfolio(shopSlug?: string, customName?: string): PublicPortfolio {
  if (typeof window === 'undefined') {
    const base = { ...DEFAULT_MOCK_PORTFOLIO };
    if (shopSlug) base.shop.slug = shopSlug;
    if (customName) base.shop.name = customName;
    return base;
  }

  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) {
      const init = { ...DEFAULT_MOCK_PORTFOLIO };
      if (shopSlug) init.shop.slug = shopSlug;
      if (customName) init.shop.name = customName;
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(init));
      localStorage.setItem(PORTFOLIO_MOCK_FLAG_KEY, 'true');
      return init;
    }
    const parsed = JSON.parse(raw);
    if (shopSlug && parsed.shop) parsed.shop.slug = shopSlug;
    if (customName && parsed.shop) parsed.shop.name = customName;
    return parsed;
  } catch {
    return DEFAULT_MOCK_PORTFOLIO;
  }
}

/**
 * Saves mock portfolio to localStorage
 */
export function saveMockPortfolio(portfolio: PublicPortfolio): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
    localStorage.setItem(PORTFOLIO_MOCK_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Failed to save mock portfolio:', err);
  }
}

/**
 * Wipes mock portfolio (empties outfits and testimonials for testing blank state)
 */
export function wipeMockPortfolio(): PublicPortfolio {
  const empty: PublicPortfolio = {
    ...DEFAULT_MOCK_PORTFOLIO,
    outfits: [],
    photos: [],
    testimonials: [],
    stats: {
      completed: 0,
      onTimePercent: 100,
      stylesCount: 0,
    },
    ratingSummary: null,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(empty));
      localStorage.setItem(PORTFOLIO_MOCK_FLAG_KEY, 'false');
    } catch (err) {
      console.error('Failed to wipe mock portfolio:', err);
    }
  }

  return empty;
}

/**
 * Resets back to the rich default mock portfolio
 */
export function resetMockPortfolio(shopSlug?: string, customName?: string): PublicPortfolio {
  const fresh = { ...DEFAULT_MOCK_PORTFOLIO };
  if (shopSlug) fresh.shop.slug = shopSlug;
  if (customName) fresh.shop.name = customName;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(fresh));
      localStorage.setItem(PORTFOLIO_MOCK_FLAG_KEY, 'true');
    } catch (err) {
      console.error('Failed to reset mock portfolio:', err);
    }
  }

  return fresh;
}

/**
 * Adds an order's progress photos as a featured creation story in the mock portfolio
 */
export function addOrderToMockPortfolio(
  order: Order,
  customTitle?: string,
  customCaption?: string
): PublicPortfolio {
  const current = getStoredMockPortfolio();
  const photos = order.images || [];

  if (photos.length === 0) {
    return current;
  }

  // Find finished photo (Delivered or Ready or latest)
  const deliveredPhoto =
    photos.find((p) => p.stage === 'Delivered') ||
    photos.find((p) => p.stage === 'Ready') ||
    photos[photos.length - 1];
  const storyPhotos = photos.filter((p) => p.url !== deliveredPhoto.url).map((p) => p.url);

  const newOutfit: PortfolioOutfit = {
    id: `order-outfit-${order.id}`,
    title:
      customTitle ||
      order.styleName ||
      (order.orderDetails ? order.orderDetails.slice(0, 32) : 'Bespoke Commission'),
    category: 'Bespoke',
    startingPrice: order.totalBill || 250000,
    materials:
      order.materialSuppliedBy === 'customer'
        ? 'Client Hand-Selected Fabric'
        : 'Atelier Stock Material',
    displayPhotos: [{ url: deliveredPhoto.url, angle: 'front' }],
    storyModeEnabled: true,
    storyCaption:
      customCaption ||
      `Bespoke commission for ${order.customerName || 'Bespoke Client'}. Pattern drafted and cut on the shears, with progress tracked through cutting, sewing, and fitting stages.`,
    storyPhotos: storyPhotos.length > 0 ? storyPhotos : [deliveredPhoto.url],
  };

  const updated: PublicPortfolio = {
    ...current,
    outfits: [newOutfit, ...current.outfits.filter((o) => o.id !== newOutfit.id)],
    photos: [{ url: deliveredPhoto.url }, ...current.photos],
    stats: {
      ...current.stats,
      stylesCount: (current.outfits?.length || 0) + 1,
    },
  };

  saveMockPortfolio(updated);
  return updated;
}
