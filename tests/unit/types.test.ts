import { describe, it, expect } from 'vitest';
import { getBalanceOwed, getMargin, hasCostData, hasUnreadComment, isOverdue, isDueSoon, canSendReminder } from '@/lib/types';
import type { Order } from '@/lib/types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    shopId: 'shop-1',
    customerId: 'customer-1',
    customerName: 'Chioma Eze',
    orderDetails: 'Agbada',
    totalBill: 50000,
    depositPaid: 20000,
    status: 'Cutting',
    priority: 'normal',
    statusHistory: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getBalanceOwed', () => {
  it('subtracts deposit paid from the total bill', () => {
    expect(getBalanceOwed(makeOrder({ totalBill: 50000, depositPaid: 20000 }))).toBe(30000);
  });

  it('returns zero when fully paid', () => {
    expect(getBalanceOwed(makeOrder({ totalBill: 50000, depositPaid: 50000 }))).toBe(0);
  });

  it('can go negative on an overpayment (not clamped)', () => {
    expect(getBalanceOwed(makeOrder({ totalBill: 50000, depositPaid: 60000 }))).toBe(-10000);
  });
});

describe('hasCostData', () => {
  it('is false when no cost fields are set', () => {
    expect(hasCostData(makeOrder())).toBe(false);
  });

  it('is true when material cost is set', () => {
    expect(hasCostData(makeOrder({ materialCost: 12000 }))).toBe(true);
  });

  it('is true when other costs is set', () => {
    expect(hasCostData(makeOrder({ otherCosts: 1500 }))).toBe(true);
  });

  it('is false when both are explicitly zero', () => {
    expect(hasCostData(makeOrder({ materialCost: 0, otherCosts: 0 }))).toBe(false);
  });
});

describe('getMargin', () => {
  it('subtracts material and other costs from the total bill', () => {
    expect(getMargin(makeOrder({ totalBill: 50000, materialCost: 15000, otherCosts: 2000 }))).toBe(33000);
  });

  it('treats missing cost fields as zero', () => {
    expect(getMargin(makeOrder({ totalBill: 50000 }))).toBe(50000);
  });

  it('can go negative when costs exceed the total bill', () => {
    expect(getMargin(makeOrder({ totalBill: 10000, materialCost: 8000, otherCosts: 5000 }))).toBe(-3000);
  });
});

describe('hasUnreadComment', () => {
  it('is false when there has never been a comment', () => {
    expect(hasUnreadComment(makeOrder())).toBe(false);
  });

  it('is true when a comment landed and was never marked seen', () => {
    expect(hasUnreadComment(makeOrder({ lastCommentAt: '2026-01-05T00:00:00Z' }))).toBe(true);
  });

  it('is false when the comment was seen after it arrived', () => {
    expect(
      hasUnreadComment(
        makeOrder({ lastCommentAt: '2026-01-05T00:00:00Z', commentsSeenAt: '2026-01-06T00:00:00Z' })
      )
    ).toBe(false);
  });

  it('is true when a newer comment arrived after the last seen timestamp', () => {
    expect(
      hasUnreadComment(
        makeOrder({ lastCommentAt: '2026-01-10T00:00:00Z', commentsSeenAt: '2026-01-06T00:00:00Z' })
      )
    ).toBe(true);
  });
});

describe('isOverdue', () => {
  it('is false with no due date set', () => {
    expect(isOverdue(makeOrder({ dueDate: undefined }))).toBe(false);
  });

  it('is true when the due date is in the past and the order is not completed', () => {
    expect(isOverdue(makeOrder({ dueDate: '2020-01-01T00:00:00Z', status: 'Sewing' }))).toBe(true);
  });

  it('is false once the order is marked Completed, even past due', () => {
    expect(isOverdue(makeOrder({ dueDate: '2020-01-01T00:00:00Z', status: 'Completed' }))).toBe(false);
  });

  it('is false when the due date is in the future', () => {
    expect(isOverdue(makeOrder({ dueDate: '2099-01-01T00:00:00Z', status: 'Sewing' }))).toBe(false);
  });
});

describe('isDueSoon', () => {
  it('is true when due within the default 2-day window', () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueSoon(makeOrder({ dueDate: soon, status: 'Sewing' }))).toBe(true);
  });

  it('is false when due further out than the window', () => {
    const later = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueSoon(makeOrder({ dueDate: later, status: 'Sewing' }))).toBe(false);
  });

  it('is false once already overdue (negative diff)', () => {
    const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueSoon(makeOrder({ dueDate: past, status: 'Sewing' }))).toBe(false);
  });

  it('respects a custom window size', () => {
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueSoon(makeOrder({ dueDate: inFiveDays, status: 'Sewing' }), 7)).toBe(true);
    expect(isDueSoon(makeOrder({ dueDate: inFiveDays, status: 'Sewing' }), 2)).toBe(false);
  });

  it('is false once the order is Completed', () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueSoon(makeOrder({ dueDate: soon, status: 'Completed' }))).toBe(false);
  });
});

describe('canSendReminder', () => {
  it('is true when no reminder has ever been sent', () => {
    expect(canSendReminder({ lastReminderAt: undefined })).toBe(true);
  });

  it('is false when a reminder was already sent earlier today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    expect(canSendReminder({ lastReminderAt: `${todayStr}T00:00:01Z` })).toBe(false);
  });

  it('is true once a full calendar day has passed', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(canSendReminder({ lastReminderAt: yesterday })).toBe(true);
  });
});
