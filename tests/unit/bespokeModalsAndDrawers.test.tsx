import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ToastProvider } from '@/contexts/ToastContext';
import HandoverPaymentSheet from '@/app/(app)/production/[orderId]/_components/HandoverPaymentSheet';
import WhatsAppOptionsSheet from '@/app/(app)/production/[orderId]/_components/WhatsAppOptionsSheet';
import ScheduleFittingPromptModal from '@/app/(app)/production/_components/ScheduleFittingPromptModal';
import OrderMeasurementsSheet from '@/app/(app)/production/[orderId]/_components/OrderMeasurementsSheet';
import AddCustomerSheet from '@/app/(app)/customers/_components/AddCustomerSheet';
import EditCustomerSheet from '@/app/(app)/customers/_components/EditCustomerSheet';
import MeasurementHistorySheet from '@/app/(app)/customers/_components/MeasurementHistorySheet';
import StyleProfileSheet from '@/app/(app)/customers/_components/StyleProfileSheet';
import FabricDetailSheet from '@/app/(app)/fabrics/_components/FabricDetailSheet';
import type { Order, Customer, Shop } from '@/lib/types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/production/ord-test-01',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock DataContext
const mockAddCustomer = vi.fn().mockResolvedValue({ id: 'cust-new-01' });
const mockUpdateCustomerProfile = vi.fn().mockResolvedValue(undefined);
const mockUpdateCustomerMeasurements = vi.fn().mockResolvedValue(undefined);
const mockUpdateCustomerStyleProfile = vi.fn().mockResolvedValue(undefined);
const mockDeleteCustomerStyleProfile = vi.fn().mockResolvedValue(undefined);

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
  addCustomer: mockAddCustomer,
  updateCustomerProfile: mockUpdateCustomerProfile,
  updateCustomerMeasurements: mockUpdateCustomerMeasurements,
  updateCustomerStyleProfile: mockUpdateCustomerStyleProfile,
  deleteCustomerStyleProfile: mockDeleteCustomerStyleProfile,
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => mockDataContextValue,
  DataProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id', email: 'tailor@example.com' },
    role: 'owner',
    shop: mockShop,
  }),
}));

// Mock Supabase client
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

describe('Bespoke Flow Modals & Drawers Component Mount Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleCustomer: Customer = {
    id: 'cust-full-01',
    shopId: mockShop.id,
    fullName: 'Alhaji Musa Danladi',
    whatsappNumber: '+2348021234567',
    gender: 'male',
    address: '14 Victoria Island, Lagos',
    birthdate: '1985-06-15',
    preferredStyles: ['Senator', 'Kaftan'],
    createdAt: new Date().toISOString(),
    measurements: {
      chest: 42,
      waist: 36,
      shoulder: 19,
      trouserLength: 41,
    },
    styleMeasurements: {
      Senator: {
        measurements: {
          chest: 42,
          length: 38,
        },
        updatedAt: new Date().toISOString(),
      },
    },
    measurementsUpdatedAt: '2026-11-01T10:00:00.000Z',
    measurementsHistory: [
      {
        date: '2026-10-01T10:00:00.000Z',
        measurements: {
          chest: 41.5,
          waist: 35.5,
          shoulder: 19,
        },
      },
    ],
  };

  const sampleOrder: Order = {
    id: 'ord-full-01',
    shopId: mockShop.id,
    customerId: sampleCustomer.id,
    customerName: sampleCustomer.fullName,
    styleName: 'Senator',
    orderDetails: 'Midnight navy cashmere wool. Double chest pocket with tonal stitching.',
    status: 'Ready',
    priority: 'rush',
    materialSuppliedBy: 'customer',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    totalBill: 120000,
    depositPaid: 70000, // Balance due: 50,000
    images: [
      {
        url: '/images/blog/senator-collar.jpg',
        stage: 'Cutting',
        uploadedAt: new Date().toISOString(),
      },
    ],
    measurements: {
      chest: 42.5,
      length: 38,
      sleeveLength: 25,
    },
    statusHistory: [
      {
        from: null,
        to: 'Documented',
        timestamp: new Date().toISOString(),
        changedBy: 'master',
        changedByName: 'Master Cutter',
      },
      {
        from: 'Documented',
        to: 'Cutting',
        timestamp: new Date().toISOString(),
        changedBy: 'master',
        changedByName: 'Master Cutter',
      },
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

  // ── 1. HANDOVER PAYMENT SHEET ──
  describe('HandoverPaymentSheet', () => {
    it('mounts with rich order data, renders balance due, and triggers single payment settlement', async () => {
      const handleClose = vi.fn();
      const handlePayment = vi.fn().mockResolvedValue(undefined);
      const handleSplit = vi.fn().mockResolvedValue(undefined);
      const handleDeliverDue = vi.fn().mockResolvedValue(undefined);

      render(
        <ToastProvider>
          <HandoverPaymentSheet
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            customer={sampleCustomer}
            balanceOwed={50000}
            currency="NGN"
            walletBalance={0}
            onRecordPaymentAndDeliver={handlePayment}
            onRecordSplitPaymentAndDeliver={handleSplit}
            onDeliverWithBalanceDue={handleDeliverDue}
          />
        </ToastProvider>
      );

      // Verify header and balance owed
      expect(screen.getAllByText(/Handover & Balance/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/50,000/i).length).toBeGreaterThan(0);

      // Find record & deliver button
      const deliverBtn = screen.getByRole('button', { name: /Record.*& Deliver/i });
      expect(deliverBtn).toBeDefined();

      fireEvent.click(deliverBtn);
      await waitFor(() => {
        expect(handlePayment).toHaveBeenCalledWith(50000, 'transfer', undefined);
      });
    });

    it('mounts under split payment mode, splits balance evenly, and supports delivery with balance due', async () => {
      const handleClose = vi.fn();
      const handlePayment = vi.fn().mockResolvedValue(undefined);
      const handleSplit = vi.fn().mockResolvedValue(undefined);
      const handleDeliverDue = vi.fn().mockResolvedValue(undefined);

      render(
        <ToastProvider>
          <HandoverPaymentSheet
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            customer={sampleCustomer}
            balanceOwed={50000}
            currency="NGN"
            walletBalance={0}
            onRecordPaymentAndDeliver={handlePayment}
            onRecordSplitPaymentAndDeliver={handleSplit}
            onDeliverWithBalanceDue={handleDeliverDue}
          />
        </ToastProvider>
      );

      // Toggle split payment
      const splitToggle = screen.getByRole('button', { name: /Split Tender/i });
      fireEvent.click(splitToggle);

      // Verify split items (25,000 each)
      await waitFor(() => {
        expect(screen.getAllByText(/25,000/i).length).toBeGreaterThan(0);
      });

      // Deliver with balance due action
      const dueBtn = screen.getByRole('button', { name: /Deliver with.*Balance Due/i });
      fireEvent.click(dueBtn);
      await waitFor(() => {
        expect(handleDeliverDue).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── 2. WHATSAPP OPTIONS SHEET ──
  describe('WhatsAppOptionsSheet', () => {
    it('mounts with Ready status and provides both progress update and client event photo request links', () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <WhatsAppOptionsSheet
            isOpen={true}
            onClose={handleClose}
            customerName={sampleCustomer.fullName}
            whatsappNumber={sampleCustomer.whatsappNumber}
            progressMessage="Your order is ready for pickup"
            orderStatus="Ready"
            garmentName="Senator Suit"
            shopName="Crown Tailors"
            orderRef="CT-889"
          />
        </ToastProvider>
      );

      expect(screen.getByText(/Message Alhaji/i)).toBeDefined();
      expect(screen.getAllByText(/Send Progress Report/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Request Client Event Photos/i)).toBeDefined();
    });

    it('hides event photos option when order is still in progress (Cutting stage)', () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <WhatsAppOptionsSheet
            isOpen={true}
            onClose={handleClose}
            customerName={sampleCustomer.fullName}
            whatsappNumber={sampleCustomer.whatsappNumber}
            progressMessage="Cutting fabric"
            orderStatus="Cutting"
            garmentName="Senator"
            shopName="Crown Tailors"
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Send Progress Report/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Request Client Event Photos/i)).toBeNull();
    });
  });

  // ── 3. SCHEDULE FITTING PROMPT MODAL ──
  describe('ScheduleFittingPromptModal', () => {
    it('mounts with date and time presets and handles appointment scheduling', async () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      const handleSkip = vi.fn();

      render(
        <ToastProvider>
          <ScheduleFittingPromptModal
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            customer={sampleCustomer}
            onConfirmSchedule={handleConfirm}
            onSkipFitting={handleSkip}
          />
        </ToastProvider>
      );

      // Verify modal headers and preset chips
      expect(screen.getAllByText(/Garment Ready for Try-On/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Tomorrow/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /This Saturday/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /10:00 AM/i })).toBeDefined();

      // Submit schedule
      const confirmBtn = screen.getByRole('button', { name: /Schedule Fitting & Mark Ready/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('triggers onSkipFitting when user skips appointment scheduling', () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      const handleSkip = vi.fn();

      render(
        <ToastProvider>
          <ScheduleFittingPromptModal
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            customer={sampleCustomer}
            onConfirmSchedule={handleConfirm}
            onSkipFitting={handleSkip}
          />
        </ToastProvider>
      );

      const skipBtn = screen.getByRole('button', { name: /Skip/i });
      fireEvent.click(skipBtn);
      expect(handleSkip).toHaveBeenCalledTimes(1);
    });

    it('handles sparse customer with no phone number cleanly', () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      const handleSkip = vi.fn();

      const sparseCust: Customer = {
        id: 'cust-sparse',
        shopId: mockShop.id,
        fullName: 'Walk-in Client',
        whatsappNumber: '',
        gender: 'male',
        createdAt: new Date().toISOString(),
      };

      const sparseOrder: Order = {
        ...sampleOrder,
        id: 'ord-sparse-02',
        customerId: sparseCust.id,
        customerName: sparseCust.fullName,
        orderDetails: '',
      };

      render(
        <ToastProvider>
          <ScheduleFittingPromptModal
            isOpen={true}
            onClose={handleClose}
            order={sparseOrder}
            customer={sparseCust}
            onConfirmSchedule={handleConfirm}
            onSkipFitting={handleSkip}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Garment Ready for Try-On/i).length).toBeGreaterThan(0);
    });
  });

  // ── 4. ORDER MEASUREMENTS SHEET ──
  describe('OrderMeasurementsSheet', () => {
    it('mounts with order measurements and calls onSave with updated values', async () => {
      const handleClose = vi.fn();
      const handleSave = vi.fn().mockResolvedValue(undefined);

      render(
        <ToastProvider>
          <OrderMeasurementsSheet
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            customer={sampleCustomer}
            currentShop={mockShop}
            onSave={handleSave}
          />
        </ToastProvider>
      );

      // Verify title contains style name
      expect(screen.getAllByText(/Edit Senator Measurements/i).length).toBeGreaterThan(0);

      // Save measurements
      const saveBtn = screen.getByRole('button', { name: /Save Measurements/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledTimes(1);
      });
    });

    it('handles sparse order with no style and empty measurements', async () => {
      const handleClose = vi.fn();
      const handleSave = vi.fn().mockResolvedValue(undefined);

      const sparseOrder: Order = {
        ...sampleOrder,
        styleName: '',
        measurements: {},
      };

      render(
        <ToastProvider>
          <OrderMeasurementsSheet
            isOpen={true}
            onClose={handleClose}
            order={sparseOrder}
            customer={null}
            currentShop={null}
            onSave={handleSave}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Edit Order Measurements/i).length).toBeGreaterThan(0);
    });
  });

  // ── 5. ADD CUSTOMER SHEET & STRICT PHONE VALIDATION ──
  describe('AddCustomerSheet', () => {
    it('renders customer form and prevents saving when phone number is incomplete', async () => {
      const handleClose = vi.fn();
      const handleCreated = vi.fn();

      render(
        <ToastProvider>
          <AddCustomerSheet
            isOpen={true}
            onClose={handleClose}
            onCustomerCreated={handleCreated}
          />
        </ToastProvider>
      );

      // Form inputs
      const nameInput = screen.getByPlaceholderText(/e\.g\. Chief Adebayo/i);
      const phoneInput = screen.getByPlaceholderText(/080 1234 5678/i);
      const saveBtn = screen.getByRole('button', { name: /Save Client/i });

      // Enter valid name but incomplete phone number (less than required digits)
      fireEvent.change(nameInput, { target: { value: 'Engr. Emeka Obi' } });
      fireEvent.change(phoneInput, { target: { value: '080312345' } }); // Incomplete Nigerian number

      fireEvent.click(saveBtn);

      // Expect validation error to appear and addCustomer NOT to be called
      await waitFor(() => {
        expect(screen.getAllByText(/Incomplete.*phone number/i).length).toBeGreaterThan(0);
      });
      expect(mockAddCustomer).not.toHaveBeenCalled();
    });

    it('successfully validates complete Nigerian number and saves customer', async () => {
      const handleClose = vi.fn();
      const handleCreated = vi.fn();

      render(
        <ToastProvider>
          <AddCustomerSheet
            isOpen={true}
            onClose={handleClose}
            onCustomerCreated={handleCreated}
          />
        </ToastProvider>
      );

      const nameInput = screen.getByPlaceholderText(/e\.g\. Chief Adebayo/i);
      const phoneInput = screen.getByPlaceholderText(/080 1234 5678/i);
      const saveBtn = screen.getByRole('button', { name: /Save Client/i });

      // Complete 11-digit phone number
      fireEvent.change(nameInput, { target: { value: 'Engr. Emeka Obi' } });
      fireEvent.change(phoneInput, { target: { value: '08031234567' } });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockAddCustomer).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── 6. EDIT CUSTOMER SHEET ──
  describe('EditCustomerSheet', () => {
    it('pre-fills customer data and allows updating client details', async () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <EditCustomerSheet
            isOpen={true}
            onClose={handleClose}
            customer={sampleCustomer}
          />
        </ToastProvider>
      );

      // Verify pre-filled name and phone
      expect(screen.getByDisplayValue('Alhaji Musa Danladi')).toBeDefined();
      expect(screen.getByDisplayValue(/802.*123.*4567/)).toBeDefined();

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerProfile).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── 7. MEASUREMENT HISTORY SHEET ──
  describe('MeasurementHistorySheet', () => {
    it('renders measurement history timeline and supports snapshot restoration', async () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <MeasurementHistorySheet
            isOpen={true}
            onClose={handleClose}
            customer={sampleCustomer}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Measurement History/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Current/i).length).toBeGreaterThan(0);

      // Expand older history item (second toggle button)
      const buttons = screen.getAllByRole('button');
      const olderEntryBtn = buttons.find((b) => b.textContent?.includes('Oct') || b.textContent?.includes('10'));
      if (olderEntryBtn) {
        fireEvent.click(olderEntryBtn);
      }

      // Find restore button from historical entry
      const restoreBtn = await screen.findByRole('button', { name: /Use as active measurements/i });
      fireEvent.click(restoreBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerMeasurements).toHaveBeenCalledTimes(1);
      });
    });

    it('renders cleanly when customer has no measurement history', () => {
      const handleClose = vi.fn();
      const sparseCustomer: Customer = {
        ...sampleCustomer,
        measurements: {},
        measurementsHistory: [],
      };

      render(
        <ToastProvider>
          <MeasurementHistorySheet
            isOpen={true}
            onClose={handleClose}
            customer={sparseCustomer}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Measurement History/i).length).toBeGreaterThan(0);
    });
  });

  // ── 8. STYLE PROFILE SHEET ──
  describe('StyleProfileSheet', () => {
    it('mounts with selected style and saves profile measurements', async () => {
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <StyleProfileSheet
            isOpen={true}
            onClose={handleClose}
            customer={sampleCustomer}
            initialStyle="Senator"
          />
        </ToastProvider>
      );

      // Verify style form renders
      expect(screen.getAllByText(/Senator Measurements/i).length).toBeGreaterThan(0);

      // Save button
      const saveBtn = screen.getByRole('button', { name: /Save Measurements/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerStyleProfile).toHaveBeenCalled();
      });
    });
  });

  // ── 9. FABRIC DETAIL SHEET ──
  describe('FabricDetailSheet', () => {
    it('mounts with full order details, yardage, fabric provenance, and cutting slip trigger', () => {
      const handleClose = vi.fn();
      const handleOpenSlip = vi.fn();

      render(
        <ToastProvider>
          <FabricDetailSheet
            isOpen={true}
            onClose={handleClose}
            order={sampleOrder}
            onOpenCuttingSlip={handleOpenSlip}
          />
        </ToastProvider>
      );

      // Client name and outfit
      expect(screen.getAllByText(/Alhaji Musa Danladi/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Senator/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Client Cloth/i)).toBeDefined();

      // Trigger cutting slip button
      const slipBtn = screen.getByRole('button', { name: /Cutting Slip/i });
      fireEvent.click(slipBtn);
      expect(handleOpenSlip).toHaveBeenCalledTimes(1);
    });

    it('mounts with sparse order without crashing on missing photos, notes, or dates', () => {
      const handleClose = vi.fn();
      const sparseOrder: Order = {
        id: 'ord-sparse',
        shopId: mockShop.id,
        customerId: 'cust-sparse',
        customerName: 'Anonymous Client',
        orderDetails: '',
        status: 'Documented',
        priority: 'normal',
        totalBill: 30000,
        depositPaid: 0,
        statusHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <ToastProvider>
          <FabricDetailSheet
            isOpen={true}
            onClose={handleClose}
            order={sparseOrder}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Anonymous Client/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Waiting to Cut/i).length).toBeGreaterThan(0);
    });
  });
});
