import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addStockGarmentsAction,
  updateStockPriceAction,
  updateStockQuantityAction,
  quickRestockSizeAction,
  deleteStockGarmentAction,
  getStockAction,
  processSaleAction,
  getShowroomFinancialsAction,
  getPublicShowroomStockAction
} from '@/app/actions/stock';
import { formatShowroomWhatsAppOrderMessage } from '@/lib/formatters';
import { NAV_ITEMS } from '@/lib/constants';
import { isXpSystemEnabled } from '@/lib/xp';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { computeOpenLoops } from '@/app/(app)/dashboard/_hooks/useOpenLoops';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Mock audit log
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined)
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
let currentIlikeData: any[] = [];

const createChainable = () => {
  const chain: any = {
    eq: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    order: mockOrder.mockReturnValue({
      data: [
        {
          id: 'item-1',
          shop_id: 'shop-123',
          name: 'Royal Blue Senator',
          size: 'L',
          quantity: 3,
          price: 35000,
          created_at: '2026-11-08T10:00:00Z',
          metadata: {
            category: 'Senator',
            color: 'Royal Blue',
            fabric: 'Cashmere',
            costPrice: 18000,
            rackLocation: 'Rack A1',
            parentGarmentName: 'Royal Blue Senator'
          }
        }
      ],
      error: null
    }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'order-pos-123', quantity: 5, name: 'Senator Suit', size: 'L', org_id: 'org-1' },
      error: null
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    then: (resolve: any) => resolve({ data: currentIlikeData, error: null })
  };
  return chain;
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })
    },
    from: vi.fn((table: string) => {
      const builder: any = {};
      builder.insert = mockInsert.mockImplementation(() => {
        const promise: any = Promise.resolve({
          data: [{ id: 'fg-1' }, { id: 'fg-2' }],
          error: null
        });
        promise.select = vi.fn().mockImplementation(() => {
          const selectPromise: any = Promise.resolve({
            data: [{ id: 'fg-1' }, { id: 'fg-2' }],
            error: null
          });
          selectPromise.single = vi.fn().mockResolvedValue({
            data: { id: 'order-pos-123' },
            error: null
          });
          return selectPromise;
        });
        return promise;
      });
      builder.update = mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null })
      });
      builder.delete = mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null })
      });
      builder.select = mockSelect.mockImplementation(() => createChainable());
      builder.eq = mockEq.mockResolvedValue({ error: null });
      return builder;
    })
  }))
}));

describe('Ready-to-Wear Stock Management & Garment Intake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentIlikeData = [];
    mockIlike.mockResolvedValue({ data: [], error: null });
  });

  describe('addStockGarmentsAction input validation', () => {
    it('rejects missing shop ID', async () => {
      const res = await addStockGarmentsAction('', {
        name: 'Senator',
        price: 25000,
        sizes: [{ size: 'L', quantity: 1 }]
      });
      expect(res.error).toBe('Shop ID is required');
    });

    it('rejects empty garment name', async () => {
      const res = await addStockGarmentsAction('shop-123', {
        name: '   ',
        price: 25000,
        sizes: [{ size: 'L', quantity: 1 }]
      });
      expect(res.error).toBe('Garment style name is required');
    });

    it('rejects negative selling price', async () => {
      const res = await addStockGarmentsAction('shop-123', {
        name: 'Senator',
        price: -500,
        sizes: [{ size: 'L', quantity: 1 }]
      });
      expect(res.error).toBe('Valid selling price is required');
    });

    it('rejects when no sizes have quantity greater than zero', async () => {
      const res = await addStockGarmentsAction('shop-123', {
        name: 'Senator',
        price: 25000,
        sizes: [
          { size: 'M', quantity: 0 },
          { size: 'L', quantity: 0 }
        ]
      });
      expect(res.error).toBe('Please specify at least one size with quantity greater than zero');
    });

    it('successfully processes multi-size garment intake with rich metadata', async () => {
      mockIlike.mockResolvedValue({ data: [], error: null });

      const res = await addStockGarmentsAction('shop-123', {
        name: 'Emerald Kaftan',
        category: 'Kaftan',
        price: 32000,
        costPrice: 15000,
        color: 'Emerald Green',
        fabric: 'Italian Wool',
        rackLocation: 'Section B',
        sku: 'KAF-EM-01',
        sizes: [
          { size: 'M', quantity: 2 },
          { size: 'XL', quantity: 1 }
        ]
      });

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);

      // Verify the batch inserted into finished_goods
      expect(mockInsert).toHaveBeenCalledWith([
        {
          shop_id: 'shop-123',
          name: 'Emerald Kaftan',
          size: 'M',
          quantity: 2,
          price: 32000,
          metadata: {
            category: 'Kaftan',
            color: 'Emerald Green',
            fabric: 'Italian Wool',
            costPrice: 15000,
            rackLocation: 'Section B',
            sku: 'KAF-EM-01',
            parentGarmentName: 'Emerald Kaftan'
          }
        },
        {
          shop_id: 'shop-123',
          name: 'Emerald Kaftan',
          size: 'XL',
          quantity: 1,
          price: 32000,
          metadata: {
            category: 'Kaftan',
            color: 'Emerald Green',
            fabric: 'Italian Wool',
            costPrice: 15000,
            rackLocation: 'Section B',
            sku: 'KAF-EM-01',
            parentGarmentName: 'Emerald Kaftan'
          }
        }
      ]);
    });

    it('intelligently restocks existing showroom items by incrementing quantities instead of creating duplicates', async () => {
      currentIlikeData = [
        {
          id: 'existing-l-1',
          name: 'Royal Blue Senator',
          size: 'L',
          quantity: 3,
          metadata: { category: 'Senator', parentGarmentName: 'Royal Blue Senator' }
        }
      ];

      const res = await addStockGarmentsAction('shop-123', {
        name: 'Royal Blue Senator',
        category: 'Senator',
        price: 38000,
        sizes: [
          { size: 'L', quantity: 4 } // Adding 4 more to existing 3
        ]
      });

      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      // Verify update was called with merged quantity (3 + 4 = 7)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 7,
          price: 38000
        })
      );
    });
  });

  describe('getStockAction', () => {
    it('fetches and maps finished goods with metadata and sku', async () => {
      const stock = await getStockAction('shop-123');
      expect(Array.isArray(stock)).toBe(true);
      if (Array.isArray(stock)) {
        expect(stock.length).toBe(1);
        expect(stock[0].name).toBe('Royal Blue Senator');
        expect(stock[0].metadata?.category).toBe('Senator');
        expect(stock[0].metadata?.costPrice).toBe(18000);
      }
    });
  });

  describe('updateStockPriceAction and updateStockQuantityAction', () => {
    it('updates stock price', async () => {
      mockEq.mockResolvedValue({ error: null });
      const res = await updateStockPriceAction('fg-1', 40000);
      expect(res.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith({ price: 40000 });
    });

    it('updates stock quantity without letting it go below zero', async () => {
      mockEq.mockResolvedValue({ error: null });
      const res = await updateStockQuantityAction('fg-1', 5);
      expect(res.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 5 });
    });

    it('quickRestockSizeAction increments existing rack stock', async () => {
      mockSelect.mockImplementationOnce(() => ({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { quantity: 4 },
            error: null
          })
        })
      }));
      mockEq.mockResolvedValue({ error: null });

      const res = await quickRestockSizeAction('fg-1', 2);
      expect(res.success).toBe(true);
      expect(res.newQuantity).toBe(6);
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 6 });
    });

    it('quickRestockSizeAction clamps at zero when decrementing beyond stock', async () => {
      mockSelect.mockImplementationOnce(() => ({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { quantity: 1 },
            error: null
          })
        })
      }));
      mockEq.mockResolvedValue({ error: null });

      const res = await quickRestockSizeAction('fg-1', -5);
      expect(res.success).toBe(true);
      expect(res.newQuantity).toBe(0);
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 0 });
    });
  });

  describe('deleteStockGarmentAction', () => {
    it('deletes garment item from finished_goods', async () => {
      mockEq.mockResolvedValue({ error: null });
      const res = await deleteStockGarmentAction('fg-1');
      expect(res.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('processSaleAction (POS / Instant Counter Checkout)', () => {
    const sampleItems = [
      { goodId: 'fg-1', quantity: 2, priceAtSale: 25000, name: 'Senator Suit', size: 'L' }
    ];

    it('rejects sale with missing shop ID', async () => {
      const res = await processSaleAction('', sampleItems, 'card', 'user-1');
      expect(res.error).toBe('Shop ID is required');
    });

    it('rejects sale with no cart items', async () => {
      const res = await processSaleAction('shop-123', [], 'card', 'user-1');
      expect(res.error).toBe('No items in cart to sell');
    });

    it('processes standard retail walk-in sale and decrements finished_goods stock', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'pos', 'user-1');

      expect(res.success).toBe(true);
      expect(res.orderId).toBe('order-pos-123');
      expect(res.totalAmount).toBe(50000);

      // Verify order creation with valid receipt-compatible payment record
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          shop_id: 'shop-123',
          customer_name: 'Retail Walk-In',
          status: 'Delivered',
          total_bill: 50000,
          deposit_paid: 50000,
          payments: [
            expect.objectContaining({
              amount: 50000,
              method: 'pos',
              recordedByName: 'Showroom Cashier',
              timestamp: expect.any(String),
              id: expect.any(String)
            })
          ],
          metadata: expect.objectContaining({
            channel: 'pos_counter',
            order_type: 'rtw_counter_sale'
          })
        })
      );

      // Verify insertion into payments table
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          shop_id: 'shop-123',
          order_id: 'order-pos-123',
          amount: 50000,
          method: 'pos'
        })
      );
    });

    it('applies discount amount correctly to total bill and deposit paid', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'transfer', 'user-1', {
        discountAmount: 5000
      });

      expect(res.success).toBe(true);
      expect(res.totalAmount).toBe(45000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          total_bill: 45000,
          deposit_paid: 45000,
          order_details: expect.stringContaining('Discount: -5000')
        })
      );
    });

    it('attaches VIP client details and normalizes phone number when provided', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'pos', 'user-1', {
        customerName: 'Senator Adeleke',
        customerPhone: '08031234567',
        notes: 'VIP customer fitting'
      });

      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Senator Adeleke',
          order_details: expect.stringContaining('VIP customer fitting')
        })
      );
    });

    it('attaches client directly when customerId is provided', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'pos', 'user-1', {
        customerId: 'cust-direct-123',
        customerName: 'Chief Okonkwo'
      });

      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'cust-direct-123',
          customer_name: 'Chief Okonkwo'
        })
      );
    });

    it('attaches client by name without phone without colliding with retail walk-in placeholder', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'cash', 'user-1', {
        customerName: 'Hajia Aisha'
      });

      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Hajia Aisha'
        })
      );
    });

    it('rejects checkout when item has zero or negative quantity', async () => {
      const invalidItems = [
        { goodId: 'fg-1', quantity: 0, priceAtSale: 25000, name: 'Senator Suit', size: 'L' }
      ];
      const res = await processSaleAction('shop-123', invalidItems, 'pos', 'user-1');
      expect(res.error).toContain('Invalid quantity');
    });

    it('rejects checkout when requested quantity exceeds available rack stock', async () => {
      const excessItems = [
        { goodId: 'fg-1', quantity: 999, priceAtSale: 25000, name: 'Senator Suit', size: 'L' }
      ];
      const res = await processSaleAction('shop-123', excessItems, 'pos', 'user-1');
      expect(res.error).toContain('Insufficient stock');
    });

    it('safely handles 100% discount zero-amount sale without inserting zero-amount row into payments table', async () => {
      mockInsert.mockClear();
      const res = await processSaleAction('shop-123', sampleItems, 'pos', 'user-1', {
        discountAmount: 50000 // 100% discount
      });

      expect(res.success).toBe(true);
      expect(res.totalAmount).toBe(0);

      // Verify order created with 0 total bill and empty payments array
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          total_bill: 0,
          deposit_paid: 0,
          payments: []
        })
      );

      // Verify payments table was NOT inserted with amount: 0
      const paymentTableCalls = mockInsert.mock.calls.filter(
        call => call[0] && call[0].amount !== undefined && call[0].order_id !== undefined
      );
      expect(paymentTableCalls.length).toBe(0);
    });

    it('consolidates duplicate cart item lines before verifying rack availability', async () => {
      // Mock rack stock has quantity: 5
      // 2 items of quantity 3 each = 6, which should exceed 5
      const duplicateLines = [
        { goodId: 'fg-1', quantity: 3, priceAtSale: 25000, name: 'Senator Suit', size: 'L' },
        { goodId: 'fg-1', quantity: 3, priceAtSale: 25000, name: 'Senator Suit', size: 'L' }
      ];
      const res = await processSaleAction('shop-123', duplicateLines, 'pos', 'user-1');
      expect(res.error).toContain('Insufficient stock');
    });
  });

  describe('getShowroomFinancialsAction', () => {
    it('returns structured stock valuation and showroom sales velocity metrics', async () => {
      currentIlikeData = [
        {
          id: 'item-1',
          name: 'Royal Blue Senator',
          size: 'L',
          quantity: 4,
          price: 35000,
          metadata: { costPrice: 18000 }
        }
      ];

      const res = await getShowroomFinancialsAction('shop-123', 30);
      expect(res).toBeDefined();
      expect(res.data).toBeDefined();
      expect(res.data?.totalPieces).toBe(4);
      expect(res.data?.retailValuation).toBe(140000); // 4 * 35000
      expect(res.data?.costValuation).toBe(72000); // 4 * 18000
    });
  });

  describe('formatShowroomWhatsAppOrderMessage', () => {
    it('formats a clean WhatsApp reservation message without accessories', () => {
      const msg = formatShowroomWhatsAppOrderMessage({
        shopName: 'Victoria Atelier',
        styleName: 'Emerald Silk Boubou',
        size: 'L',
        price: 45000,
        currency: 'NGN',
        publicUrl: 'https://mytailorbook.com/catalogue/victoria?view=rack&item=item-1'
      });

      expect(msg).toContain('Victoria Atelier');
      expect(msg).toContain('Emerald Silk Boubou (Size: L)');
      expect(msg).toContain('45,000');
      expect(msg).toContain('Ensemble Total: ₦45,000');
      expect(msg).toContain('Reference: https://mytailorbook.com/catalogue/victoria?view=rack&item=item-1');
      expect(msg).toContain('available for pickup or delivery?');
    });

    it('formats ensemble order with multiple paired accessories and dynamic sum', () => {
      const msg = formatShowroomWhatsAppOrderMessage({
        shopName: 'Kano Royal Tailors',
        styleName: 'Navy Agbada 3-Piece',
        size: 'XL',
        price: 85000,
        currency: 'NGN',
        accessories: [
          { name: 'Embroidered Fila Cap', price: 15000 },
          { name: 'Coral Beads Wristlet', price: 10000 }
        ]
      });

      expect(msg).toContain('Navy Agbada 3-Piece (Size: XL)');
      expect(msg).toContain('Style With Accessories:');
      expect(msg).toContain('+ Embroidered Fila Cap - ₦15,000');
      expect(msg).toContain('+ Coral Beads Wristlet - ₦10,000');
      // 85000 + 15000 + 10000 = 110000
      expect(msg).toContain('Ensemble Total: ₦110,000');
    });
  });

  describe('getPublicShowroomStockAction', () => {
    it('validates missing slug or shop parameter', async () => {
      const res = await getPublicShowroomStockAction('');
      expect('error' in res).toBe(true);
      if ('error' in res) {
        expect(res.error).toContain('required');
      }
    });
  });

  describe('Business Mode Navigation & Flow Separation', () => {
    it('filters out Bespoke-only items (Fittings, Customers) and retains Stock/POS in pure RTW mode', () => {
      const mode: string = 'rtw';
      const visible = NAV_ITEMS.filter((item) => {
        if (item.hideFromBottomNav) return false;
        if (mode === 'bespoke' && item.rtwOnly) return false;
        if (mode === 'rtw' && item.bespokeOnly) return false;
        return true;
      });

      const labels = visible.map((i) => i.label);
      expect(labels).toContain('Stock / POS');
      expect(labels).not.toContain('Fittings');
      expect(labels).not.toContain('Customers');
    });

    it('filters out RTW-only items (Stock/POS) and retains Bespoke items (Fittings, Customers) in pure Bespoke mode', () => {
      const mode: string = 'bespoke';
      const visible = NAV_ITEMS.filter((item) => {
        if (item.hideFromBottomNav) return false;
        if (mode === 'bespoke' && item.rtwOnly) return false;
        if (mode === 'rtw' && item.bespokeOnly) return false;
        return true;
      });

      const labels = visible.map((i) => i.label);
      expect(labels).not.toContain('Stock / POS');
      expect(labels).toContain('Fittings');
      expect(labels).toContain('Customers');
    });

    it('retains both Bespoke and RTW navigation items in Hybrid mode without collision', () => {
      const mode: string = 'hybrid';
      const visible = NAV_ITEMS.filter((item) => {
        if (item.hideFromBottomNav) return false;
        if (mode === 'bespoke' && item.rtwOnly) return false;
        if (mode === 'rtw' && item.bespokeOnly) return false;
        return true;
      });

      const labels = visible.map((i) => i.label);
      expect(labels).toContain('Stock / POS');
      expect(labels).toContain('Fittings');
      expect(labels).toContain('Customers');
    });

    it('filters out Tailor Circle for RTW in sidebar, but preserves it for Bespoke and Hybrid', () => {
      const rtwSidebar = NAV_ITEMS.filter((item) => !(item.bespokeOnly && 'rtw' === 'rtw'));
      expect(rtwSidebar.map((i) => i.label)).not.toContain('Tailor Circle');

      const bespokeSidebar = NAV_ITEMS.filter((item) => !(item.rtwOnly && 'bespoke' === 'bespoke'));
      expect(bespokeSidebar.map((i) => i.label)).toContain('Tailor Circle');

      const hybridSidebar = NAV_ITEMS.filter((item) => {
        const mode: string = 'hybrid';
        if (item.bespokeOnly && mode === 'rtw') return false;
        if (item.rtwOnly && mode === 'bespoke') return false;
        return true;
      });
      expect(hybridSidebar.map((i) => i.label)).toContain('Tailor Circle');
    });
  });

  describe('Mode Separation: XP and Streak System Isolation', () => {
    it('strictly disables XP and gamification for ready-to-wear (rtw) mode', () => {
      expect(isXpSystemEnabled('rtw')).toBe(false);
    });

    it('strictly disables XP and gamification for hybrid mode', () => {
      expect(isXpSystemEnabled('hybrid')).toBe(false);
    });

    it('governs bespoke mode strictly by FEATURE_FLAGS.xpSystem', () => {
      expect(isXpSystemEnabled('bespoke')).toBe(Boolean(FEATURE_FLAGS.xpSystem));
      expect(isXpSystemEnabled()).toBe(Boolean(FEATURE_FLAGS.xpSystem));
    });
  });

  describe('Mode Separation: RTW Dashboard & Open Loops Focus', () => {
    it('generates stockout and debtor alerts for RTW without bespoke cutting or measurement noise', () => {
      const mockOrders: any[] = [
        {
          id: 'pos-1',
          status: 'Delivered',
          totalBill: 50000,
          depositPaid: 20000, // 30,000 balance owed
          customerId: 'cust-1',
          styleName: 'Senator Suit',
          measurements: {}, // Missing measurements, but RTW should NOT care
        },
      ];
      const mockCustomers: any[] = [{ id: 'cust-1', fullName: 'Chidi Okafor' }];

      const loops = computeOpenLoops(mockOrders, mockCustomers, [], 'rtw', {
        outOfStockCount: 2,
        lowStockCount: 4,
      });
      const titles = loops.map((l) => l.title);

      // Verify RTW-specific priorities are present
      expect(titles.some((t) => t.includes('sold out on your rack'))).toBe(true);
      expect(titles.some((t) => t.includes('2 or fewer pieces left'))).toBe(true);
      expect(titles.some((t) => t.includes('unpaid counter balances'))).toBe(true);

      // Verify Bespoke noise is completely absent
      expect(titles.some((t) => t.includes('missing measurements'))).toBe(false);
      expect(titles.some((t) => t.includes('cutting table'))).toBe(false);
      expect(titles.some((t) => t.includes('need an update today'))).toBe(false);
    });
  });
});
