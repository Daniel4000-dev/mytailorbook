import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TodayPrioritiesWidget from '@/app/(app)/dashboard/_components/TodayPrioritiesWidget';
import type { OpenLoop } from '@/app/(app)/dashboard/_hooks/useOpenLoops';
import type { CalendarEvent, Customer, Order, Shop } from '@/lib/types';

// Mock calendar action
vi.mock('@/app/actions/calendar', () => ({
  updateEventStatus: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock DataContext
const mockCalendarEvents: CalendarEvent[] = [];
const mockCustomers: Customer[] = [];
const mockOrders: Order[] = [];
const mockShop: Shop = {
  id: 'shop-1',
  slug: 'test-shop',
  name: 'Crown Tailors',
  currency: 'NGN',
  ownerUid: 'owner-1',
  orgId: 'org-1',
  isPrimary: true,
  portfolioTemplate: 'editorial',
  portfolioAccent: 'sand',
  subscriptionStatus: 'active',
  defaultTrackingLinkEnabled: true,
  createdAt: '2026-01-01',
};

let mockContextValue = {
  calendarEvents: mockCalendarEvents,
  customers: mockCustomers,
  orders: mockOrders,
  currentShop: mockShop,
  isLoaded: true,
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => mockContextValue,
}));

describe('TodayPrioritiesWidget Component Mount & Truncation Tests', () => {
  const onNavigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Rich Data State: renders full appointments and loops with long titles truncated via title attributes', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    mockContextValue = {
      calendarEvents: [
        {
          id: 'evt-1',
          shopId: 'shop-1',
          type: 'fitting',
          title: 'Fitting Session for Chief Adeleke - Royal Hand-Woven Agbada with Gold Threading Embroidery',
          date: todayStr,
          startTime: '14:30',
          endTime: '15:30',
          status: 'pending',
          relatedCustomerId: 'cust-1',
          createdAt: '2026-01-01',
        },
      ],
      customers: [
        {
          id: 'cust-1',
          fullName: 'Chief Adeleke',
          gender: 'male',
          whatsappNumber: '+2348012345678',
          shopId: 'shop-1',
          createdAt: '2026-01-01',
        },
      ],
      orders: [],
      currentShop: mockShop,
      isLoaded: true,
    };

    const richLoops: OpenLoop[] = [
      {
        id: 'loop-1',
        category: 'production',
        urgency: 'high',
        title: 'Overdue Cutting Slip #1042 - Double Breasted Senator Suit with Custom Lapel Width',
        subtitle: 'Promised delivery date was yesterday · Cutter Tunde needs urgent fabric allocation',
        actionText: 'Assign Cutter',
        href: '/production/order-1042',
        amountAtStake: 85000,
        whatsappUrl: 'https://wa.me/2348012345678',
      },
    ];

    render(<TodayPrioritiesWidget loops={richLoops} onNavigate={onNavigateMock} />);

    // Verifies cash at stake and action count
    expect(screen.getByText(/₦85,000 at stake/i)).toBeDefined();
    expect(screen.getByText(/2 actions/i)).toBeDefined();

    // Verifies title tooltip attribute exists on the truncated elements
    const eventTitle = screen.getByTitle('Fitting Session for Chief Adeleke - Royal Hand-Woven Agbada with Gold Threading Embroidery');
    expect(eventTitle).toBeDefined();

    const loopTitle = screen.getByTitle('Overdue Cutting Slip #1042 - Double Breasted Senator Suit with Custom Lapel Width');
    expect(loopTitle).toBeDefined();

    const loopSubtitle = screen.getByTitle('Promised delivery date was yesterday · Cutter Tunde needs urgent fabric allocation');
    expect(loopSubtitle).toBeDefined();

    // Verifies navigation on row click
    const loopRow = screen.getByText('Assign Cutter').closest('[role="button"]');
    expect(loopRow).toBeDefined();
    if (loopRow) {
      fireEvent.click(loopRow);
      expect(onNavigateMock).toHaveBeenCalledWith('/production/order-1042');
    }
  });

  it('2. Sparse Data State: renders minimal loop without subtitle and appointment without start time cleanly', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    mockContextValue = {
      calendarEvents: [
        {
          id: 'evt-sparse',
          shopId: 'shop-1',
          type: 'fitting',
          title: 'Quick Fitting',
          date: todayStr,
          status: 'pending',
          createdAt: '2026-01-01',
        },
      ],
      customers: [],
      orders: [],
      currentShop: mockShop,
      isLoaded: true,
    };

    const sparseLoops: OpenLoop[] = [
      {
        id: 'loop-sparse',
        category: 'measurements',
        urgency: 'medium',
        title: 'Missing Inseam',
        actionText: 'Enter Specs',
        href: '/customers/cust-2',
      },
    ];

    render(<TodayPrioritiesWidget loops={sparseLoops} onNavigate={onNavigateMock} />);

    expect(screen.getByTitle('Quick Fitting')).toBeDefined();
    expect(screen.getByTitle('Client Fitting')).toBeDefined();
    expect(screen.getByTitle('Missing Inseam')).toBeDefined();
  });

  it('3. Edge-Case Data State: handles excessively long continuous unbroken string without crashing DOM', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const extremeUnbrokenText = 'A'.repeat(160);

    mockContextValue = {
      calendarEvents: [
        {
          id: 'evt-edge',
          shopId: 'shop-1',
          type: 'fitting',
          title: extremeUnbrokenText,
          date: todayStr,
          status: 'pending',
          createdAt: '2026-01-01',
        },
      ],
      customers: [],
      orders: [],
      currentShop: mockShop,
      isLoaded: true,
    };

    const edgeLoops: OpenLoop[] = [
      {
        id: 'loop-edge',
        category: 'balances',
        urgency: 'high',
        title: extremeUnbrokenText,
        subtitle: extremeUnbrokenText,
        actionText: 'Collect',
        href: '/collections',
      },
    ];

    render(<TodayPrioritiesWidget loops={edgeLoops} onNavigate={onNavigateMock} />);

    const titles = screen.getAllByTitle(extremeUnbrokenText);
    expect(titles.length).toBeGreaterThanOrEqual(2);
  });
});

