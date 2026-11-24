import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ToastProvider } from '@/contexts/ToastContext';
import FittingVerdictModal from '@/app/(app)/calendar/_components/FittingVerdictModal';
import InventoryDetailSheet from '@/app/(app)/inventory/_components/InventoryDetailSheet';
import RunPayrollSheet from '@/app/(app)/settings/staff/_components/RunPayrollSheet';
import OutfitBuilder from '@/app/(app)/settings/portfolio/_components/OutfitBuilder';
import NotificationDetailSheet from '@/app/(app)/notifications/_components/NotificationDetailSheet';
import type { CalendarEvent, Customer, Order, InventoryItem, User, Shop } from '@/lib/types';
import type { PortfolioPoolPhoto } from '@/app/(app)/settings/portfolio/actions';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/calendar',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock DataContext
const mockAddInventoryItem = vi.fn().mockResolvedValue(undefined);
const mockUpdateInventoryItem = vi.fn().mockResolvedValue(undefined);
const mockDeleteInventoryItem = vi.fn().mockResolvedValue(undefined);

const mockShop: Shop = {
  id: 'shop-test-01',
  slug: 'crown-craft-test',
  name: 'Crown Tailor House',
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

const mockDataContextValue = {
  currentShop: mockShop,
  customers: [],
  orders: [],
  staffMembers: [],
  inventory: [],
  addInventoryItem: mockAddInventoryItem,
  updateInventoryItem: mockUpdateInventoryItem,
  deleteInventoryItem: mockDeleteInventoryItem,
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => mockDataContextValue,
}));

// Mock portfolio actions
const mockCreateOutfitAction = vi.fn().mockResolvedValue({ success: true });
const mockUpdateOutfitAction = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/app/(app)/settings/portfolio/actions', () => ({
  createOutfitAction: (...args: any[]) => mockCreateOutfitAction(...args),
  updateOutfitAction: (...args: any[]) => mockUpdateOutfitAction(...args),
}));

describe('Bespoke Workshop Operations Ecosystem Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleCustomer: Customer = {
    id: 'cust-fittings-01',
    shopId: mockShop.id,
    fullName: 'Chief Adeleke Babatunde',
    whatsappNumber: '+2348031234567',
    gender: 'male',
    createdAt: new Date().toISOString(),
    measurements: {
      chest: 44,
      waist: 38,
      shoulder: 20,
    },
  };

  const sampleOrder: Order = {
    id: 'ord-fittings-01',
    shopId: mockShop.id,
    customerId: sampleCustomer.id,
    customerName: sampleCustomer.fullName,
    styleName: '3-Piece Royal Agbada',
    orderDetails: 'Royal Blue Aso-Oke with gold neck embroidery.',
    status: 'Ready',
    priority: 'rush',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    totalBill: 350000,
    depositPaid: 200000,
    measurements: {
      chest: 44,
      length: 58,
    },
    statusHistory: [
      {
        from: 'Cutting',
        to: 'Ready',
        timestamp: new Date().toISOString(),
        changedBy: 'master',
        changedByName: 'Master Cutter',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleCalendarEvent: CalendarEvent = {
    id: 'evt-fit-01',
    shopId: mockShop.id,
    title: 'First Garment Try-On: Agbada Fit Check',
    description: 'Checking shoulder drape and agbada neck slope.',
    type: 'fitting',
    date: '2026-11-25',
    startTime: '14:00',
    endTime: '15:00',
    relatedOrderId: sampleOrder.id,
    relatedCustomerId: sampleCustomer.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // ── 1. CALENDAR & FITTING VERDICT MODAL ──
  describe('Calendar & Fitting Verdict Modal', () => {
    it('mounts fitting verdict modal and records approved perfect fit', async () => {
      const handleClose = vi.fn();
      const handleApproved = vi.fn().mockResolvedValue(undefined);
      const handleAlterations = vi.fn().mockResolvedValue(undefined);

      render(
        <ToastProvider>
          <FittingVerdictModal
            isOpen={true}
            onClose={handleClose}
            event={sampleCalendarEvent}
            customer={sampleCustomer}
            order={sampleOrder}
            onVerdictApproved={handleApproved}
            onVerdictAlterations={handleAlterations}
          />
        </ToastProvider>
      );

      // Verify title and client name
      expect(screen.getAllByText(/Fitting Session Outcome/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Chief Adeleke Babatunde/i).length).toBeGreaterThan(0);

      // Submit approved fit
      const confirmBtn = screen.getByRole('button', { name: /Confirm Perfect Fit & Mark Approved/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(handleApproved).toHaveBeenCalledTimes(1);
      });
      expect(handleAlterations).not.toHaveBeenCalled();
    });

    it('switches to alteration mode, applies touch adjustment chips, and records alteration instructions', async () => {
      const handleClose = vi.fn();
      const handleApproved = vi.fn().mockResolvedValue(undefined);
      const handleAlterations = vi.fn().mockResolvedValue(undefined);

      render(
        <ToastProvider>
          <FittingVerdictModal
            isOpen={true}
            onClose={handleClose}
            event={sampleCalendarEvent}
            customer={sampleCustomer}
            order={sampleOrder}
            onVerdictApproved={handleApproved}
            onVerdictAlterations={handleAlterations}
          />
        </ToastProvider>
      );

      // Click "Needs Alteration" choice card
      const alterationCard = screen.getByText(/Needs Alteration/i);
      fireEvent.click(alterationCard);

      // Tap quick touch chips
      const waistChip = await screen.findByRole('button', { name: /\+ Take in Waist/i });
      fireEvent.click(waistChip);

      const magChip = screen.getByRole('button', { name: /-1\.0"/i });
      fireEvent.click(magChip);

      // Submit alteration verdict
      const submitAlterationsBtn = screen.getByRole('button', { name: /Send Back to Sewing with Alterations/i });
      fireEvent.click(submitAlterationsBtn);

      await waitFor(() => {
        expect(handleAlterations).toHaveBeenCalledWith(expect.stringContaining('Take in Waist'));
      });
      expect(handleApproved).not.toHaveBeenCalled();
    });
  });

  // ── 2. INVENTORY & MATERIALS DETAIL SHEET ──
  describe('Inventory & Materials Detail Sheet', () => {
    it('mounts in new item mode, applies tailoring presets, and adds material to stock', async () => {
      const handleClose = vi.fn();
      const handleSaved = vi.fn();

      render(
        <ToastProvider>
          <InventoryDetailSheet
            isOpen={true}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Add Material to Inventory/i).length).toBeGreaterThan(0);

      // Click Collar Stay / Canvas preset
      const presetBtn = screen.getByRole('button', { name: /\+ Collar Stay \/ Canvas/i });
      fireEvent.click(presetBtn);

      // Save material
      const submitBtn = screen.getByRole('button', { name: /Save Material to Inventory/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockAddInventoryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            itemName: 'Collar Stay / Canvas',
            quantity: 10,
            unit: 'yards',
          })
        );
      });
    });

    it('mounts in edit mode with existing material and updates stock quantities', async () => {
      const existingMaterial: InventoryItem = {
        id: 'inv-silk-01',
        shopId: mockShop.id,
        itemName: 'Satin Silk Inner Lining',
        quantity: 25.5,
        unit: 'yards',
        lowStockThreshold: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const handleClose = vi.fn();
      const handleSaved = vi.fn();

      render(
        <ToastProvider>
          <InventoryDetailSheet
            item={existingMaterial}
            isOpen={true}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Edit Material/i).length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('Satin Silk Inner Lining')).toBeDefined();

      const saveBtn = screen.getByRole('button', { name: /Update Material/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateInventoryItem).toHaveBeenCalledWith(
          'inv-silk-01',
          expect.objectContaining({
            itemName: 'Satin Silk Inner Lining',
            quantity: 25.5,
          })
        );
      });
    });
  });

  // ── 3. STAFF & RUN PAYROLL SHEET ──
  describe('Staff Administration & Run Payroll Sheet', () => {
    it('computes piece-rate and salary pay based on completed garments in the last 7 days', () => {
      const handleClose = vi.fn();

      const sampleStaff: User[] = [
        {
          uid: 'staff-master-01',
          email: 'cutter@tailorhouse.com',
          name: 'Master Cutter Bello',
          shopId: mockShop.id,
          orgId: mockShop.orgId,
          role: 'Staff',
          craftRole: 'cutter',
          payrollType: 'piece_rate',
          payrollAmount: 5000, // 5,000 NGN per completed garment
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'staff-tailor-02',
          email: 'machinist@tailorhouse.com',
          name: 'Tailor Chinedu',
          shopId: mockShop.id,
          orgId: mockShop.orgId,
          role: 'Staff',
          craftRole: 'tailor',
          payrollType: 'salary',
          payrollAmount: 45000, // Fixed 45,000 NGN weekly salary
          createdAt: new Date().toISOString(),
        },
      ];

      // Order completed recently assigned to Master Cutter
      const completedOrder: Order = {
        ...sampleOrder,
        id: 'ord-comp-01',
        assignedTo: 'staff-master-01',
        assignedToName: 'Master Cutter Bello',
        status: 'Ready',
        updatedAt: new Date().toISOString(),
      };

      render(
        <ToastProvider>
          <RunPayrollSheet
            isOpen={true}
            onClose={handleClose}
            staffMembers={sampleStaff}
            orders={[completedOrder]}
            currency="NGN"
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Staff Pay & Piece-Rate/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Master Cutter Bello')).toBeDefined();
      expect(screen.getByText('Tailor Chinedu')).toBeDefined();

      // Total payroll is 5,000 (piece rate) + 45,000 (salary) = 50,000
      expect(screen.getAllByText(/50,000/i).length).toBeGreaterThan(0);
    });
  });

  // ── 4. SETTINGS & PORTFOLIO OUTFIT BUILDER ──
  describe('Portfolio & Outfit Builder Sheet', () => {
    it('mounts with available pool photos, sets title, selects display photo, and publishes outfit', async () => {
      const handleClose = vi.fn();
      const handleSaved = vi.fn();

      const poolPhotos: PortfolioPoolPhoto[] = [
        {
          id: 'photo-pool-01',
          imageUrl: '/images/blog/senator-collar.jpg',
          source: 'auto',
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

      // Select photo from pool (find photo tile button)
      const buttons = screen.getAllByRole('button');
      const photoBtn = buttons.find((b) => b.className.includes('photoBtn'));
      expect(photoBtn).toBeDefined();
      if (photoBtn) {
        fireEvent.click(photoBtn);
      }

      // Click publish outfit
      const publishBtn = screen.getByRole('button', { name: /Publish Outfit/i });
      fireEvent.click(publishBtn);

      await waitFor(() => {
        expect(mockCreateOutfitAction).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── 5. NOTIFICATIONS & DETAIL SHEET ──
  describe('Notifications & Detail Sheet', () => {
    it('mounts notification detail sheet and triggers navigation to related workshop order', () => {
      const handleClose = vi.fn();
      const handleNavigate = vi.fn();

      const notification = {
        id: 'notif-01',
        title: 'New Fitting Session Scheduled',
        message: 'Chief Adeleke Babatunde is scheduled for try-on tomorrow at 2:00 PM.',
        category: 'production' as const,
        tone: 'info' as const,
        timestamp: new Date().toISOString(),
        orderId: 'ord-fittings-01',
        read: false,
      };

      render(
        <ToastProvider>
          <NotificationDetailSheet
            isOpen={true}
            onClose={handleClose}
            notification={notification}
            onNavigate={handleNavigate}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Production Update/i).length).toBeGreaterThan(0);
      expect(screen.getByText('New Fitting Session Scheduled')).toBeDefined();

      const actionBtn = screen.getByRole('button', { name: /View Order in Workshop/i });
      fireEvent.click(actionBtn);

      expect(mockPush).toHaveBeenCalledWith('/production?order=ord-fittings-01');
    });
  });
});
