import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addStockGarmentsAction,
  updateStockPriceAction,
  updateStockQuantityAction,
  deleteStockGarmentAction,
  getStockAction
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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const builder: any = {};
      builder.insert = mockInsert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'fg-1' }, { id: 'fg-2' }],
          error: null
        })
      });
      builder.update = mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null })
      });
      builder.delete = mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null })
      });
      builder.select = mockSelect.mockImplementation(() => {
        return {
          eq: vi.fn().mockReturnValue({
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
            ilike: mockIlike
          })
        };
      });
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
  });

  describe('deleteStockGarmentAction', () => {
    it('deletes garment item from finished_goods', async () => {
      mockEq.mockResolvedValue({ error: null });
      const res = await deleteStockGarmentAction('fg-1');
      expect(res.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
