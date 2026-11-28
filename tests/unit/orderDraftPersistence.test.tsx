import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('@/app/actions/payments', () => ({
  confirmSubscriptionPayment: vi.fn(),
  confirmFreeTrial: vi.fn(),
  initializeSubscription: vi.fn(),
  startFreeTrial: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      }),
    },
  }),
}));

import UnifiedNewOrderForm from '@/app/(app)/orders/new/_components/UnifiedNewOrderForm';

// Mock contexts
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-test-1', name: 'Master Tailor' },
  }),
}));

const mockCurrentShop: any = {
  id: 'shop-test-1',
  name: 'Crown Bespoke',
  currency: 'NGN',
  subscriptionStatus: 'active',
};

const mockCustomers = [
  {
    id: 'cust-1',
    shopId: 'shop-test-1',
    fullName: 'Chief Adeleke Babatunde',
    whatsappNumber: '+2348031234567',
    gender: 'male' as const,
    createdAt: '2026-01-01',
    measurements: { chest: 44, waist: 38 },
  },
];

const mockAddOrderBatch = vi.fn();

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    customers: mockCustomers,
    orders: [],
    staffMembers: [],
    currentShop: mockCurrentShop,
    addOrderBatch: mockAddOrderBatch,
    addCustomer: vi.fn(),
    updateCustomerStyleProfile: vi.fn(),
    updateCustomerMeasurements: vi.fn(),
    updateCustomerProfile: vi.fn(),
    isLoaded: true,
    refreshShop: vi.fn(),
  }),
}));

describe('UnifiedNewOrderForm Order Draft Persistence & Recovery Suite', () => {
  const DRAFT_STORAGE_KEY = 'mtb_new_order_draft';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /* -------------------------------------------------------------------------
     1. Rich / Full Data State: Restores in-progress draft with banner
     ------------------------------------------------------------------------- */
  it('automatically detects saved draft on mount, displays restore banner, and allows continuing draft', async () => {
    const savedDraft = {
      selectedCustomer: mockCustomers[0],
      customerSearch: '',
      garments: [
        {
          id: 'g-test-1',
          styleName: 'Senator Suit',
          isCustomStyle: false,
          price: '45,000',
          measures: { chest: '44', waist: '38' },
          measurementNotes: 'Relaxed fit around shoulders',
          isFitLoaded: true,
          showTweakMeasurements: false,
          fabricImage: null,
          styleReferenceImage: null,
          uploadingFabric: false,
          uploadingStyleRef: false,
          materialSuppliedBy: 'customer',
          fabricNotes: 'Navy blue wool blend',
        },
      ],
      dueDate: '2026-12-15',
      depositPaid: '25,000',
      manualTotalBill: '45,000',
      priority: 'high',
      showInlineNewCustomer: false,
      newCustomerName: '',
      newCustomerPhone: '',
      newCustomerGender: 'male',
      timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    render(<UnifiedNewOrderForm />);

    // Verify Draft Restored Banner is visible
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/Resumed draft:/i)).toBeDefined();
    expect(screen.getAllByText('Chief Adeleke Babatunde').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/1 outfit/i)).toBeDefined();

    // Verify fields were rehydrated into the form
    expect(screen.getByDisplayValue('45,000')).toBeDefined();
    expect(screen.getByDisplayValue('25,000')).toBeDefined();

    // Dismiss banner keeps draft intact
    const dismissBtn = screen.getByTitle('Keep working');
    fireEvent.click(dismissBtn);
    expect(screen.queryByText(/Resumed draft:/i)).toBeNull();
    // Data remains in form
    expect(screen.getByDisplayValue('45,000')).toBeDefined();
  });

  /* -------------------------------------------------------------------------
     2. Discard / Start Fresh State: User resets unwanted abandoned draft
     ------------------------------------------------------------------------- */
  it('allows the tailor to purge an unwanted draft with a single click and start fresh', async () => {
    const abandonedDraft = {
      selectedCustomer: null,
      customerSearch: 'Some random inquiry',
      garments: [
        {
          id: 'g-abandoned',
          styleName: 'Kaftan',
          isCustomStyle: false,
          price: '30,000',
          measures: { chest: '40' },
          measurementNotes: '',
          isFitLoaded: false,
          showTweakMeasurements: true,
          fabricImage: null,
          styleReferenceImage: null,
          uploadingFabric: false,
          uploadingStyleRef: false,
          materialSuppliedBy: 'customer',
          fabricNotes: '',
        },
      ],
      dueDate: '2026-12-10',
      depositPaid: '',
      manualTotalBill: '30,000',
      priority: 'normal',
      showInlineNewCustomer: true,
      newCustomerName: 'Walk-in Prospect',
      newCustomerPhone: '+2348000000000',
      newCustomerGender: 'male',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(abandonedDraft));

    render(<UnifiedNewOrderForm />);

    // Draft banner shows walk-in prospect
    expect(screen.getByText('Walk-in Prospect')).toBeDefined();

    // Tailor clicks "Start Fresh"
    const startFreshBtn = screen.getByTitle('Discard this draft and start a fresh order');
    fireEvent.click(startFreshBtn);

    // Verify draft was deleted from localStorage
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    // Banner is dismissed
    expect(screen.queryByText('Walk-in Prospect')).toBeNull();

    // Toast notification given
    expect(mockShowToast).toHaveBeenCalledWith('Draft discarded. Ready for a new order.', 'info');
  });

  /* -------------------------------------------------------------------------
     3. Edge-Case / Corrupted or Expired Draft State
     ------------------------------------------------------------------------- */
  it('gracefully ignores expired drafts (>48 hours) or corrupted JSON without throwing errors', () => {
    // Stale draft from 3 days ago
    const staleDraft = {
      selectedCustomer: mockCustomers[0],
      garments: [],
      timestamp: Date.now() - 1000 * 60 * 60 * 72, // 72 hours ago
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(staleDraft));

    render(<UnifiedNewOrderForm />);

    // Expired draft should not show banner
    expect(screen.queryByRole('status')).toBeNull();

    // Test corrupted JSON in localStorage
    localStorage.setItem(DRAFT_STORAGE_KEY, '{invalid-json:::');
    cleanup();

    expect(() => render(<UnifiedNewOrderForm />)).not.toThrow();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
