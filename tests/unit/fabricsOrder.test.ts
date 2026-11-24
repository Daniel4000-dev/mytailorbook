import { describe, it, expect } from 'vitest';
import type { Order } from '@/lib/types';
import { toOrderSlug, findByIdOrSlug } from '@/lib/slugs';
import { ROUTES } from '@/lib/routes';
import { formatDate } from '@/lib/formatters';

describe('Cutting table order navigation and route resolution', () => {
  const mockOrder: Order = {
    id: 'ord-1234-uuid',
    shopId: 'shop-1',
    customerId: 'cust-1',
    customerName: 'Ade Kunle',
    styleName: 'Senator Suit',
    orderDetails: 'Navy Blue Cashmere',
    status: 'Cutting',
    priority: 'rush',
    dueDate: new Date().toISOString(),
    totalBill: 150000,
    depositPaid: 50000,
    images: [{ url: '/test.jpg', stage: 'Cutting', uploadedAt: new Date().toISOString() }],
    statusHistory: [{ from: null, to: 'Cutting', timestamp: new Date().toISOString(), changedBy: 'tailor', changedByName: 'Tailor' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('generates valid productionOrder route for cutting table orders', () => {
    const route = ROUTES.productionOrder(mockOrder);
    expect(route).toBe('/production/ade-kunle-senator-suit-ord-1234-uuid');
  });

  it('findByIdOrSlug resolves the order from the route slug', () => {
    const slug = toOrderSlug(mockOrder);
    const resolved = findByIdOrSlug([mockOrder], slug);
    expect(resolved).toBeDefined();
    expect(resolved?.id).toBe(mockOrder.id);
  });

  it('handles orders with undefined status or non-standard status gracefully', () => {
    const orderWithWeirdStatus: Order = {
      ...mockOrder,
      id: 'ord-weird',
      status: 'documented' as any,
    };
    const slug = toOrderSlug(orderWithWeirdStatus);
    const resolved = findByIdOrSlug([orderWithWeirdStatus], slug);
    expect(resolved?.id).toBe('ord-weird');
  });

  it('formatDate safely formats valid dates and handles empty or invalid values', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('invalid-date')).toBe('invalid-date');
    const validDateStr = new Date(Date.now() - 1000 * 60 * 5).toISOString();
    expect(formatDate(validDateStr)).toBe('5m ago');
  });
});

