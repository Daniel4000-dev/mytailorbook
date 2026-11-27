import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import OwnPortfolioPage from '@/app/(app)/portfolio/page';
import OutfitBuilder from '@/app/(app)/settings/portfolio/_components/OutfitBuilder';
import { ToastProvider } from '@/contexts/ToastContext';

// Mocks
const mockRouter = {
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
};

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({ showToast: mockShowToast }),
}));

const { mockShop } = vi.hoisted(() => ({
  mockShop: {
    id: 'shop-crown-01',
    slug: 'crown-tailors',
    name: 'Crown Tailors',
    currency: 'NGN',
    portfolioAccent: 'indigo',
    portfolioSettings: {
      tagline: 'Precision cut, master hand-stitched.',
      bio: 'Bespoke tailoring crafting luxury ceremonial and boardroom attire.',
      foundedYear: 2018,
    },
  },
}));

const mockUpdateShop = vi.fn().mockResolvedValue({});

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    currentShop: mockShop,
    isLoaded: true,
    updateShop: mockUpdateShop,
  }),
}));

const mockUser = { id: 'usr-tailor-01', email: 'owner@crowntailors.com' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isOwner: true,
    loading: false,
  }),
}));

// Actions mocks
const mockGetPortfolioPoolAction = vi.fn();
const mockGetPortfolioOutfitsAction = vi.fn();
const mockDeleteOutfitAction = vi.fn();
const mockDeletePortfolioPhotoAction = vi.fn();
const mockCreateOutfitAction = vi.fn();
const mockUpdateOutfitAction = vi.fn();
const mockAddManualPortfolioPhotoAction = vi.fn();

vi.mock('@/app/(app)/settings/portfolio/actions', () => ({
  syncAutoPortfolioPhotosAction: vi.fn().mockResolvedValue(undefined),
  getPortfolioPoolAction: () => mockGetPortfolioPoolAction(),
  getPortfolioOutfitsAction: () => mockGetPortfolioOutfitsAction(),
  deleteOutfitAction: (id: string) => mockDeleteOutfitAction(id),
  deletePortfolioPhotoAction: (id: string) => mockDeletePortfolioPhotoAction(id),
  createOutfitAction: (input: unknown) => mockCreateOutfitAction(input),
  updateOutfitAction: (id: string, input: unknown) => mockUpdateOutfitAction(id, input),
  addManualPortfolioPhotoAction: (shopId: string, url: string) => mockAddManualPortfolioPhotoAction(shopId, url),
}));

vi.mock('@/app/public-actions', () => ({
  getPublicShopPortfolio: vi.fn().mockResolvedValue({
    shop: mockShop,
    outfits: [],
    stats: { completed: 120, onTimePercent: 98, stylesCount: 15 },
    testimonials: [],
  }),
  getCanonicalPublicUrl: (path: string) => `https://www.mystitchbooks.com${path}`,
}));

vi.mock('@/components/studio/PortfolioView/PortfolioView', () => ({
  default: () => <div data-testid="portfolio-view-stub">Public Storefront Preview Stub</div>,
}));

vi.mock('@/app/(app)/settings/portfolio/_components/TemplatePicker', () => ({
  default: () => <div data-testid="template-picker-stub">Template Accent Picker Stub</div>,
}));

vi.mock('@/app/(app)/settings/portfolio/_components/ReviewsSection', () => ({
  default: () => <div data-testid="reviews-section-stub">Reviews Section Stub</div>,
}));

describe('Unified Portfolio Workspace & Image-First Showcase Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  // State 1: Rich / Full Data
  it('State 1 (Rich Data): mounts unified portfolio, switches between tabs, and displays outfits and photo vault', async () => {
    const mockPool = [
      { id: 'photo-01', imageUrl: '/images/mock/senator-front.jpg', source: 'auto' as const, createdAt: new Date().toISOString(), usedInOutfitIds: ['outfit-01'] },
      { id: 'photo-02', imageUrl: '/images/mock/senator-back.jpg', source: 'manual' as const, createdAt: new Date().toISOString(), usedInOutfitIds: [] },
    ];
    const mockOutfits = [
      {
        id: 'outfit-01',
        title: 'Midnight Emerald Senator',
        storyModeEnabled: true,
        storyCaption: 'Handcrafted with signature embroidery.',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        photos: [
          { photoId: 'photo-01', imageUrl: '/images/mock/senator-front.jpg', kind: 'display' as const, angle: 'front' as const, sortOrder: 0 },
        ],
      },
    ];

    mockGetPortfolioPoolAction.mockResolvedValue(mockPool);
    mockGetPortfolioOutfitsAction.mockResolvedValue(mockOutfits);

    render(
      <ToastProvider>
        <OwnPortfolioPage />
      </ToastProvider>
    );

    // Initial tab: Storefront Preview
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-view-stub')).toBeDefined();
    });

    // Switch to Outfits tab
    const outfitsTabBtn = screen.getByRole('button', { name: /^Outfits/i });
    fireEvent.click(outfitsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Published Outfits')).toBeDefined();
      expect(screen.getByText('Midnight Emerald Senator')).toBeDefined();
    });

    // Switch to Photos tab
    const photosTabBtn = screen.getByRole('button', { name: /^Photos/i });
    fireEvent.click(photosTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Workshop Photo Vault')).toBeDefined();
      expect(screen.getByText('In Outfit')).toBeDefined();
    });

    // Switch to Story & Look tab
    const profileTabBtn = screen.getByRole('button', { name: /^Story & Look/i });
    fireEvent.click(profileTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Studio Brand & Story')).toBeDefined();
      expect(screen.getByTestId('template-picker-stub')).toBeDefined();
      expect(screen.getByTestId('reviews-section-stub')).toBeDefined();
    });
  });

  // State 2: Sparse / Empty Data
  it('State 2 (Sparse Data): renders clean empty states with instant creation CTAs when no outfits exist', async () => {
    mockGetPortfolioPoolAction.mockResolvedValue([]);
    mockGetPortfolioOutfitsAction.mockResolvedValue([]);

    render(
      <ToastProvider>
        <OwnPortfolioPage />
      </ToastProvider>
    );

    // Switch to Outfits tab
    const outfitsTabBtn = await screen.findByRole('button', { name: /^Outfits/i });
    fireEvent.click(outfitsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('No Outfits Published Yet')).toBeDefined();
      expect(screen.getByRole('button', { name: /Publish Your First Outfit/i })).toBeDefined();
    });

    // Switch to Photos tab
    const photosTabBtn = screen.getByRole('button', { name: /^Photos/i });
    fireEvent.click(photosTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Your Photo Vault is Empty')).toBeDefined();
      expect(screen.getByRole('button', { name: /Upload Finished Photos/i })).toBeDefined();
    });
  });

  // State 3: Edge-Case & Interactive OutfitBuilder
  it('State 3 (Interactive OutfitBuilder): mounts builder with direct upload button, angle picker, and publishes look cleanly', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();
    mockCreateOutfitAction.mockResolvedValue({ success: true });

    const poolPhotos = [
      {
        id: 'photo-pool-01',
        imageUrl: '/images/blog/senator-collar.jpg',
        source: 'manual' as const,
        createdAt: new Date().toISOString(),
        usedInOutfitIds: [],
      },
    ];

    render(
      <ToastProvider>
        <OutfitBuilder
          isOpen={true}
          onClose={handleClose}
          shopId={mockShop.id}
          pool={poolPhotos}
          onSaved={handleSaved}
        />
      </ToastProvider>
    );

    expect(screen.getAllByText(/New Outfit/i).length).toBeGreaterThan(0);
    // Direct upload button should be present
    expect(screen.getByText(/Upload/i)).toBeDefined();

    // Select the photo for display
    const buttons = screen.getAllByRole('button');
    const photoBtn = buttons.find((b) => b.className.includes('photoBtn'));
    expect(photoBtn).toBeDefined();
    if (photoBtn) {
      fireEvent.click(photoBtn);
    }

    // Enter title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Emerald Agbada/i);
    fireEvent.change(titleInput, { target: { value: 'Bespoke Sapphire Senator' } });

    // Enable creation story toggle
    const storyCheckbox = screen.getByRole('checkbox');
    fireEvent.click(storyCheckbox);

    // Verify Story Photos section appears
    expect(screen.getByText('Story Photos')).toBeDefined();

    // Publish outfit
    const publishBtn = screen.getByRole('button', { name: /Publish Outfit/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockCreateOutfitAction).toHaveBeenCalledTimes(1);
      expect(handleSaved).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
