import { describe, it, expect } from 'vitest';
import { getBalanceOwed, isOverdue, isDueSoon } from '@/lib/types';
import type { Order } from '@/lib/types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    shopId: 'shop-1',
    customerId: 'customer-1',
    customerName: 'Test Customer',
    orderDetails: 'Agbada',
    totalBill: 30000,
    depositPaid: 10000,
    status: 'Cutting',
    priority: 'normal',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('getBalanceOwed', () => {
  it('subtracts deposit paid from the total bill', () => {
    expect(getBalanceOwed(makeOrder({ totalBill: 30000, depositPaid: 10000 }))).toBe(20000);
  });

  it('returns 0 when fully paid', () => {
    expect(getBalanceOwed(makeOrder({ totalBill: 30000, depositPaid: 30000 }))).toBe(0);
  });
});

describe('isOverdue', () => {
  it('is false when there is no due date', () => {
    expect(isOverdue(makeOrder({ dueDate: undefined }))).toBe(false);
  });

  it('is false for a Completed order even if the due date has passed', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(makeOrder({ status: 'Completed', dueDate: yesterday.toISOString() }))).toBe(false);
  });

  it('is true when the due date has passed and the order is not completed', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(makeOrder({ status: 'Sewing', dueDate: yesterday.toISOString() }))).toBe(true);
  });

  it('is false when the due date is in the future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isOverdue(makeOrder({ status: 'Sewing', dueDate: tomorrow.toISOString() }))).toBe(false);
  });
});

describe('isDueSoon', () => {
  it('is true when the due date is within the given window', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDueSoon(makeOrder({ status: 'Sewing', dueDate: tomorrow.toISOString() }), 2)).toBe(true);
  });

  it('is false when the due date is beyond the window', () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    expect(isDueSoon(makeOrder({ status: 'Sewing', dueDate: nextWeek.toISOString() }), 2)).toBe(false);
  });

  it('is false for a Completed order', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDueSoon(makeOrder({ status: 'Completed', dueDate: tomorrow.toISOString() }), 2)).toBe(false);
  });

  it('is false when there is no due date', () => {
    expect(isDueSoon(makeOrder({ dueDate: undefined }))).toBe(false);
  });
});
