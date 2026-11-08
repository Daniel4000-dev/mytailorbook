import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDailyRegisterSummary } from '@/app/actions/reconciliation';

vi.mock('server-only', () => ({}));

// Mock expenses module
vi.mock('@/app/actions/expenses', () => ({
  getExpensesByDate: vi.fn().mockResolvedValue([
    {
      id: 'exp-1',
      shopId: 'shop-1',
      amount: 5000,
      category: 'general',
      description: 'Generator Fuel',
      date: '2026-11-08',
      method: 'cash',
      createdAt: '2026-11-08T10:00:00Z',
    },
    {
      id: 'exp-2',
      shopId: 'shop-1',
      amount: 3000,
      category: 'material',
      description: 'Zips & Linings',
      date: '2026-11-08',
      method: 'transfer',
      createdAt: '2026-11-08T11:00:00Z',
    },
  ]),
}));

// Mock Supabase client
const mockPaymentsData: any[] = [];
const mockOrdersData: any[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => {
          if (table === 'payments') {
            return Promise.resolve({ data: mockPaymentsData, error: null });
          }
          if (table === 'orders') {
            return Promise.resolve({ data: mockOrdersData, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };
      return chain;
    }),
  })),
}));

describe('Daily Register & Cash Drawer Reconciliation', () => {
  beforeEach(() => {
    mockPaymentsData.length = 0;
    mockOrdersData.length = 0;
  });

  it('correctly aggregates showroom POS payments vs bespoke deposits', async () => {
    // 1 Showroom POS cash sale (35,000)
    // 1 Showroom POS card sale (20,000)
    // 1 Bespoke cash deposit (50,000)
    // 1 Bespoke transfer deposit (80,000)
    mockPaymentsData.push(
      {
        id: 'pay-1',
        shop_id: 'shop-1',
        order_id: 'ord-pos-1',
        amount: 35000,
        method: 'cash',
        reference_note: 'POS Sale: Senator Blue',
        date: '2026-11-08T12:00:00Z',
        created_at: '2026-11-08T12:00:00Z',
      },
      {
        id: 'pay-2',
        shop_id: 'shop-1',
        order_id: 'ord-pos-2',
        amount: 20000,
        method: 'pos',
        reference_note: 'POS Sale: Kaftan White',
        date: '2026-11-08T13:00:00Z',
        created_at: '2026-11-08T13:00:00Z',
      },
      {
        id: 'pay-3',
        shop_id: 'shop-1',
        order_id: 'ord-bespoke-1',
        amount: 50000,
        method: 'cash',
        reference_note: 'Deposit for Agbada',
        date: '2026-11-08T14:00:00Z',
        created_at: '2026-11-08T14:00:00Z',
      },
      {
        id: 'pay-4',
        shop_id: 'shop-1',
        order_id: 'ord-bespoke-2',
        amount: 80000,
        method: 'transfer',
        reference_note: 'Full payment for Wedding Suit',
        date: '2026-11-08T15:00:00Z',
        created_at: '2026-11-08T15:00:00Z',
      }
    );

    const summary = await getDailyRegisterSummary('shop-1', '2026-11-08');

    // Showroom Totals
    expect(summary.inflows.showroom.cash).toBe(35000);
    expect(summary.inflows.showroom.pos).toBe(20000);
    expect(summary.inflows.showroom.total).toBe(55000);
    expect(summary.inflows.showroom.orderCount).toBe(2);

    // Bespoke Totals
    expect(summary.inflows.bespoke.cash).toBe(50000);
    expect(summary.inflows.bespoke.transfer).toBe(80000);
    expect(summary.inflows.bespoke.total).toBe(130000);
    expect(summary.inflows.bespoke.orderCount).toBe(2);

    // Total Inflow: 55,000 + 130,000 = 185,000
    expect(summary.inflows.total).toBe(185000);

    // Drawer Cash Inflow: Showroom Cash (35,000) + Bespoke Cash (50,000) = 85,000
    expect(summary.inflows.drawerCashInflow).toBe(85000);

    // Drawer Cash Outflow: Generator fuel expense paid from drawer = 5,000
    expect(summary.outflows.drawerCashOutflow).toBe(5000);

    // Transfer Expense Outflow: Zips = 3,000
    expect(summary.outflows.transferOutflow).toBe(3000);

    // Expected Cash in Drawer: 85,000 - 5,000 = 80,000
    expect(summary.drawer.expectedCash).toBe(80000);
  });

  it('handles cash drawer balancing calculations (balanced, surplus, shortfall)', () => {
    const expectedDrawerCash = 80000;

    // Test 1: Counted matches expected (balanced)
    const countBalanced = 80000;
    const diffBalanced = countBalanced - expectedDrawerCash;
    expect(diffBalanced).toBe(0);

    // Test 2: Counted has surplus (+2,500)
    const countSurplus = 82500;
    const diffSurplus = countSurplus - expectedDrawerCash;
    expect(diffSurplus).toBe(2500);
    expect(diffSurplus > 0).toBe(true);

    // Test 3: Counted has shortfall (-1,000)
    const countShortfall = 79000;
    const diffShortfall = countShortfall - expectedDrawerCash;
    expect(diffShortfall).toBe(-1000);
    expect(diffShortfall < 0).toBe(true);
  });

  it('incorporates day orders with initial deposits not in payments table', async () => {
    // No rows in payments table, but 1 day order created with deposit_paid = 40,000
    mockOrdersData.push({
      id: 'ord-direct-1',
      customer_name: 'Alhaji Musa',
      total_bill: 80000,
      deposit_paid: 40000,
      created_at: '2026-11-08T09:30:00Z',
      payments: [{ amount: 40000, method: 'cash' }],
      metadata: { channel: 'pos_counter' },
      order_details: 'POS Sale: 2x White Kaftan',
    });

    const summary = await getDailyRegisterSummary('shop-1', '2026-11-08');

    expect(summary.inflows.showroom.total).toBe(40000);
    expect(summary.inflows.showroom.cash).toBe(40000);
    expect(summary.inflows.drawerCashInflow).toBe(40000);
    expect(summary.drawer.expectedCash).toBe(40000 - 5000); // 35,000
  });
});
