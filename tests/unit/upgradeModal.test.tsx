import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import UpgradeModal from '@/components/settings/UpgradeModal/UpgradeModal';

// Mock contexts
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const mockRefreshShop = vi.fn();
let mockCurrentShop: any = {
  id: 'shop-test-1',
  name: 'Savile Row Atelier',
  subscriptionStatus: 'free',
  trialUsedAt: null,
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    currentShop: mockCurrentShop,
    refreshShop: mockRefreshShop,
  }),
}));

// Mock payment actions
const mockInitializeSubscription = vi.fn();
const mockStartFreeTrial = vi.fn();

vi.mock('@/app/actions/payments', () => ({
  initializeSubscription: (...args: any[]) => mockInitializeSubscription(...args),
  startFreeTrial: (...args: any[]) => mockStartFreeTrial(...args),
}));

describe('UpgradeModal Component Mount & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentShop = {
      id: 'shop-test-1',
      name: 'Savile Row Atelier',
      subscriptionStatus: 'free',
      trialUsedAt: null,
    };
    mockStartFreeTrial.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/trial-test-url',
    });
    mockInitializeSubscription.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/sub-test-url',
    });
  });

  afterEach(() => {
    cleanup();
  });

  /* -------------------------------------------------------------------------
     1. Rich / Full Data State: Trial-Eligible Shop with Interval Toggling
     ------------------------------------------------------------------------- */
  it('renders rich trial-eligible modal with benefits, switches billing intervals, and triggers checkout', async () => {
    const onBeforeRedirectMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <UpgradeModal
        isOpen={true}
        onClose={onCloseMock}
        onBeforeRedirect={onBeforeRedirectMock}
        returnPath="/orders/new?payment=success"
      />
    );

    // Hero title and context
    expect(screen.getByText('Unlock Unlimited Orders')).toBeDefined();
    expect(screen.getByText(/You have reached your free plan's monthly order limit/i)).toBeDefined();

    // Premium features list
    expect(screen.getByText(/Unlimited bespoke orders & multi-outfit intake/i)).toBeDefined();
    expect(screen.getByText(/Cutting table shears queue with bolt yardage tracking/i)).toBeDefined();
    expect(screen.getByText(/Live customer order tracking portal with WhatsApp updates/i)).toBeDefined();
    expect(screen.getByText(/Complete client measurement snapshots & fitting verdicts/i)).toBeDefined();

    // Trial banner for eligible shop
    expect(screen.getByText(/Includes 30-day free trial. ₦0 today, cancel anytime./i)).toBeDefined();

    // Default Monthly price (PREMIUM_MONTHLY_PRICE_NGN = 2,699)
    expect(screen.getByText(/2,699/)).toBeDefined();

    // Switch to Yearly interval (PREMIUM_YEARLY_PRICE_NGN = 26,990)
    const yearlyBtn = screen.getByText('Yearly');
    fireEvent.click(yearlyBtn);
    expect(screen.getByText('Save 20%')).toBeDefined();
    expect(screen.getByText(/26,990/)).toBeDefined();

    // Click primary trial action button
    const ctaBtn = screen.getByText('Start 30-Day Free Trial');
    fireEvent.click(ctaBtn);

    expect(onBeforeRedirectMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockStartFreeTrial).toHaveBeenCalledWith('yearly', '/orders/new?payment=success');
    });
  });

  /* -------------------------------------------------------------------------
     2. Sparse / Non-Trial Shop State with Direct Subscription
     ------------------------------------------------------------------------- */
  it('renders modal for non-trial shop with direct upgrade CTA and dismisses cleanly', async () => {
    mockCurrentShop = {
      id: 'shop-test-2',
      name: 'Victoria Island Tailoring',
      subscriptionStatus: 'free',
      trialUsedAt: '2026-01-15T00:00:00Z', // Trial already consumed
    };

    const onCloseMock = vi.fn();

    render(
      <UpgradeModal
        isOpen={true}
        onClose={onCloseMock}
        title="Custom Upgrade Title"
        reason="Your trial has expired. Upgrade to keep adding garments."
      />
    );

    expect(screen.getByText('Custom Upgrade Title')).toBeDefined();
    expect(screen.getByText('Your trial has expired. Upgrade to keep adding garments.')).toBeDefined();

    // Should NOT show trial callout
    expect(screen.queryByText(/Includes 30-day free trial/i)).toBeNull();

    // Should show Upgrade to Premium button
    const upgradeBtn = screen.getByText('Upgrade to Premium');
    expect(upgradeBtn).toBeDefined();

    // Dismiss button keeps draft
    const dismissBtn = screen.getByText('I will upgrade later (keep draft)');
    fireEvent.click(dismissBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  /* -------------------------------------------------------------------------
     3. Edge-Case / Failure Handling State
     ------------------------------------------------------------------------- */
  it('handles payment initialization errors gracefully and displays error toast', async () => {
    mockCurrentShop = {
      id: 'shop-test-3',
      name: 'Test Shop',
      subscriptionStatus: 'free',
      trialUsedAt: '2026-01-15T00:00:00Z',
    };

    mockInitializeSubscription.mockRejectedValue(new Error('Paystack gateway timeout'));

    render(
      <UpgradeModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const upgradeBtn = screen.getByText('Upgrade to Premium');
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Paystack gateway timeout', 'error');
    });
  });
});
