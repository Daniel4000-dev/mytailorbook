import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@/contexts/ToastContext';
import FabricCard from '@/app/(app)/fabrics/_components/FabricCard';
import CuttingSlipModal from '@/app/(app)/production/_components/CuttingSlipModal';
import type { Order, Customer, Shop } from '@/lib/types';
import { ROUTES } from '@/lib/routes';
import { toOrderSlug, toCustomerSlug, findByIdOrSlug } from '@/lib/slugs';
import { filterFabricOrders } from '@/app/(app)/fabrics/utils';
import { validatePhoneNumber } from '@/lib/phoneValidation';
import { formatDate, formatCurrency, getOrderProgressMessage } from '@/lib/formatters';

describe('Bespoke Flow Lifecycle & Component Mount Suite', () => {
  const mockShop: Shop = {
    id: 'shop-heritage-01',
    slug: 'crown-tailors-heritage',
    name: 'Crown Tailors',
    currency: 'NGN',
    ownerUid: 'owner-01',
    orgId: 'org-01',
    isPrimary: true,
    portfolioTemplate: 'editorial',
    portfolioAccent: 'sand',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
    defaultTrackingLinkEnabled: true,
  };

  const mockCustomer: Customer = {
    id: 'cust-uuid-01',
    shopId: mockShop.id,
    fullName: 'Chief Adeleke Babatunde',
    whatsappNumber: '+2348031234567',
    gender: 'male',
    createdAt: new Date().toISOString(),
    measurements: {
      chest: 44,
      waist: 38,
      shoulder: 20.5,
      neck: 17.5,
      trouserLength: 42,
    },
  };

  const mockOrder: Order = {
    id: 'ord-uuid-01',
    shopId: mockShop.id,
    customerId: mockCustomer.id,
    customerName: mockCustomer.fullName,
    styleName: '3-Piece Royal Agbada',
    orderDetails: 'Hand-Woven Royal Blue Aso-Oke (7.0 yds). Gold embroidery on chest piece.',
    status: 'Documented',
    priority: 'rush',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    totalBill: 350000,
    depositPaid: 200000,
    images: [
      {
        url: '/images/blog/agbada-embroidery-detail.jpg',
        stage: 'Documented',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      chest: 45, // Customized for loose Agbada drape
      length: 58,
      sleeveLength: 26,
    },
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date().toISOString(),
        changedBy: 'master',
        changedByName: 'Master Cutter',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ── 1. CUSTOMER ONBOARDING & PHONE VALIDATION ──
  describe('Phase 1: Customer Onboarding & Fitting Specifications', () => {
    it('enforces strict country phone validation during customer intake', () => {
      // Valid Nigerian local & international numbers
      expect(validatePhoneNumber('08031234567').isValid).toBe(true);
      expect(validatePhoneNumber('+2348031234567').isValid).toBe(true);

      // Incomplete numbers caught before saving
      expect(validatePhoneNumber('080312345').isValid).toBe(false);
      expect(validatePhoneNumber('+234803123').isValid).toBe(false);

      // UK and US format tests
      expect(validatePhoneNumber('+12025550123').isValid).toBe(true);
      expect(validatePhoneNumber('+447911123456').isValid).toBe(true);
    });

    it('generates reproducible, SEO-friendly customer slugs and matches canonical IDs', () => {
      const slug = toCustomerSlug(mockCustomer);
      expect(slug).toContain('chief-adeleke-babat');
      const resolved = findByIdOrSlug([mockCustomer], slug);
      expect(resolved?.id).toBe(mockCustomer.id);
    });
  });

  // ── 2. ORDER INTAKE & CANONICAL ROUTING ──
  describe('Phase 2: Order Intake, Routing & Public Artifacts', () => {
    it('constructs deterministic production and public tracking routes', () => {
      const prodUrl = ROUTES.productionOrder(mockOrder);
      expect(prodUrl).toContain('/production/');
      expect(prodUrl).toContain('chief-adeleke');

      const trackUrl = ROUTES.track(mockOrder);
      expect(trackUrl).toContain('/track/');

      const receiptUrl = ROUTES.receipt(mockOrder);
      expect(receiptUrl).toContain('/receipt/');
    });

    it('resolves the order by human slug and canonical ID', () => {
      const slug = toOrderSlug(mockOrder);
      const match = findByIdOrSlug([mockOrder], slug);
      expect(match?.id).toBe(mockOrder.id);
    });
  });

  // ── 3. CUTTING TABLE & FABRIC CARD MOUNTING ──
  describe('Phase 3: Cutting Table Shears Queue & Swatch Cards', () => {
    it('filters orders by stage and prioritizes rush/urgent garments', () => {
      const normalOrder: Order = {
        ...mockOrder,
        id: 'ord-normal',
        priority: 'normal',
      };
      const orders = [normalOrder, mockOrder];
      const filtered = filterFabricOrders(orders, { search: '', stageFilter: 'all', showNoPhoto: true });

      expect(filtered[0].id).toBe(mockOrder.id); // Rush order comes first
    });

    it('renders FabricCard component in the DOM and handles card clicks to open the order', () => {
      const handleClick = vi.fn();
      const handleOpenSlip = vi.fn();

      render(
        <FabricCard
          order={mockOrder}
          onClick={handleClick}
          onOpenSlip={handleOpenSlip}
        />
      );

      // Verify client details, tag, yardage and swatch information are displayed
      expect(screen.getByText('Chief Adeleke Babatunde')).toBeDefined();
      expect(screen.getByText('3-Piece Royal Agbada')).toBeDefined();
      expect(screen.getByText('7.0 yds')).toBeDefined();
      expect(screen.getByText('Client Cloth')).toBeDefined();

      // Trigger card click (direct navigation to order)
      const card = screen.getByRole('button', { name: /view fabric/i });
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Trigger quick slip button click without bubbling
      const slipBtn = screen.getByRole('button', { name: /open workshop cutting slip/i });
      fireEvent.click(slipBtn);
      expect(handleOpenSlip).toHaveBeenCalledTimes(1);
    });
  });

  // ── 4. CUTTING SLIP MODAL & WORKSHOP DIMENSIONS ──
  describe('Phase 4: Cutting Slip Modal Component Mount', () => {
    it('renders CuttingSlipModal with customer and order specifications cleanly without throwing', () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <CuttingSlipModal
            isOpen={true}
            onClose={handleClose}
            order={mockOrder}
            customer={mockCustomer}
          />
        </ToastProvider>
      );

      // Header and order references
      expect(screen.getByText(/Workshop Cutting Slip/i)).toBeDefined();
      expect(screen.getAllByText(/Chief Adeleke Babatunde/i).length).toBeGreaterThan(0);

      // Garment details
      expect(screen.getAllByText(/3-Piece Royal Agbada/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Gold embroidery on chest piece/i)).toBeDefined();

      // Overridden order measurements vs customer baseline
      expect(screen.getAllByText(/Chest/i).length).toBeGreaterThan(0);
    });
  });

  // ── 5. STAGE TRANSITIONS & PIPELINE RESILIENCE ──
  describe('Phase 5: Stage Transitions & Edge-Case Resilience', () => {
    it('generates proper stage WhatsApp notification messages', () => {
      const msg = getOrderProgressMessage({
        customerName: mockCustomer.fullName,
        shopName: mockShop.name,
        status: 'Cutting',
        trackingUrl: 'https://mytailorbook.com/track/test-token',
        includeTrackingLink: true,
      });

      expect(msg).toContain('Crown Tailors');
      expect(msg).toContain('cutting stage');
      expect(msg).toContain('https://mytailorbook.com/track/test-token');
    });

    it('handles sparse orders with missing photos, no due date, and unassigned tailor without crashing', () => {
      const sparseOrder: Order = {
        id: 'ord-sparse-99',
        shopId: mockShop.id,
        customerId: 'cust-sparse',
        customerName: 'Anonymous Walk-in',
        orderDetails: '',
        status: 'Cutting',
        priority: 'normal',
        totalBill: 50000,
        depositPaid: 25000,
        statusHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const handleClick = vi.fn();

      render(
        <FabricCard
          order={sparseOrder}
          onClick={handleClick}
        />
      );

      expect(screen.getByText('Anonymous Walk-in')).toBeDefined();
      expect(screen.getByText('Swatch Pending')).toBeDefined();
      expect(screen.getByText('Currently Cutting')).toBeDefined();
    });

    it('safely formats financial balances across currencies', () => {
      expect(formatCurrency(150000, 'NGN')).toContain('150,000');
      expect(formatCurrency(250, 'USD')).toContain('250');
      expect(formatCurrency(180, 'GBP')).toContain('180');
    });
  });
});

