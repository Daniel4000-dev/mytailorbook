import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addStockGarmentsAction,
  updateStockPriceAction,
  updateStockQuantityAction,
  quickRestockSizeAction,
  deleteStockGarmentAction,
  getStockAction,
  processSaleAction
} from '@/app/actions/stock';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();

const createChainable = () => {
  const chain: any = {
    eq: vi.fn(() => chain),
    ilike: mockIlike,
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
      data: { id: 'order-pos-123', quantity: 5, org_id: 'org-1' },
      error: null
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: null
    })
  };
  return chain;
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
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
      mockIlike.mockResolvedValue({
        data: [
          {
            id: 'existing-l-1',
            name: 'Royal Blue Senator',
            size: 'L',
            quantity: 3,
            metadata: { category: 'Senator', parentGarmentName: 'Royal Blue Senator' }
          }
        ],
        error: null
      });

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
      const res = await processSaleAction('shop-123', sampleItems, 'cash', 'user-1');

      expect(res.success).toBe(true);
      expect(res.orderId).toBe('order-pos-123');
      expect(res.totalAmount).toBe(50000);

      // Verify order creation
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
              method: 'cash'
            })
          ]
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

    it('attaches VIP client details when customer name and phone are provided', async () => {
      const res = await processSaleAction('shop-123', sampleItems, 'card', 'user-1', {
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
  });
});
