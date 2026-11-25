import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MobileOwnerDashboard from '@/app/(app)/dashboard/_components/mobile/OwnerDashboard';
import DesktopOwnerDashboard from '@/app/(app)/dashboard/_components/desktop/OwnerDashboard';
import type { Order, User, Shop, Customer } from '@/lib/types';

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
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock child widgets that are tested elsewhere
vi.mock('@/app/(app)/dashboard/_components/TodayPrioritiesWidget', () => ({
  default: () => <div data-testid="today-priorities-widget" />,
}));
vi.mock('@/app/(app)/dashboard/_components/ProfileSetupProgress', () => ({
  default: () => <div data-testid="profile-setup-progress" />,
}));
vi.mock('@/app/(app)/dashboard/_components/PodCoOpBanner', () => ({
  default: () => <div data-testid="pod-co-op-banner" />,
}));
vi.mock('@/app/(app)/dashboard/_components/AtelierFirstWinCard', () => ({
  default: () => <div data-testid="atelier-first-win-card" />,
}));
vi.mock('@/app/(app)/dashboard/_components/QuickCommandHub', () => ({
  default: () => <div data-testid="quick-command-hub" />,
}));
vi.mock('@/app/actions/stock', () => ({
  getStockAction: vi.fn().mockResolvedValue([]),
}));

// DataContext mock
let mockCurrentShop: Shop = {
  id: 'shop-test-1',
  slug: 'crown-craft',
  name: 'Crown Craft Workshop',
  currency: 'NGN',
  ownerUid: 'owner-1',
  orgId: 'org-1',
  isPrimary: true,
  portfolioTemplate: 'editorial',
  portfolioAccent: 'sand',
  subscriptionStatus: 'active',
  createdAt: new Date().toISOString(),
  defaultTrackingLinkEnabled: true,
  businessMode: 'bespoke',
};

const mockDataContext = {
  currentShop: mockCurrentShop,
  customers: [] as Customer[],
  exceptions: [],
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    ...mockDataContext,
    currentShop: mockCurrentShop,
  }),
}));

describe('Dashboard Delegation Section & Badges Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentShop = {
      id: 'shop-test-1',
      slug: 'crown-craft',
      name: 'Crown Craft Workshop',
      currency: 'NGN',
      ownerUid: 'owner-1',
      orgId: 'org-1',
      isPrimary: true,
      portfolioTemplate: 'editorial',
      portfolioAccent: 'sand',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString(),
      defaultTrackingLinkEnabled: true,
      businessMode: 'bespoke',
    };
  });

  afterEach(() => {
    cleanup();
  });

  const sampleStaffMembers: User[] = [
    {
      uid: 'staff-bello-01',
      name: 'Master Cutter Bello',
      email: 'bello@workshop.com',
      role: 'Staff',
      craftRole: 'cutter',
      shopId: 'shop-test-1',
      orgId: 'org-1',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      createdAt: new Date().toISOString(),
      active: true,
    },
    {
      uid: 'staff-tunde-02',
      name: 'Apprentice Tunde',
      email: 'tunde@workshop.com',
      role: 'Staff',
      craftRole: 'apprentice',
      shopId: 'shop-test-1',
      orgId: 'org-1',
      createdAt: new Date().toISOString(),
      active: true,
    },
  ];

  const sampleOrders: Order[] = [
    // 3 active orders assigned to Cutter Bello (1 overdue)
    {
      id: 'ord-1',
      shopId: 'shop-test-1',
      customerId: 'cust-1',
      customerName: 'Chief Adeleke',
      styleName: 'Royal Agbada',
      orderDetails: 'Royal Blue Agbada',
      priority: 'normal',
      status: 'Cutting',
      assignedTo: 'staff-bello-01',
      dueDate: '2020-01-01', // Overdue
      totalBill: 120000,
      depositPaid: 60000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    },
    {
      id: 'ord-2',
      shopId: 'shop-test-1',
      customerId: 'cust-2',
      customerName: 'Senator Alabi',
      styleName: 'Senator 2-Piece',
      orderDetails: 'Senator Suit',
      priority: 'normal',
      status: 'Cutting',
      assignedTo: 'staff-bello-01',
      dueDate: '2030-01-01', // Not overdue
      totalBill: 80000,
      depositPaid: 80000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    },
    {
      id: 'ord-3',
      shopId: 'shop-test-1',
      customerId: 'cust-3',
      customerName: 'Engr. Dapo',
      styleName: 'Classic Kaftan',
      orderDetails: 'Linen Kaftan',
      priority: 'normal',
      status: 'Sewing',
      assignedTo: 'staff-bello-01',
      dueDate: '2030-01-01',
      totalBill: 75000,
      depositPaid: 40000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    },
    // 1 completed piece for Cutter Bello
    {
      id: 'ord-4',
      shopId: 'shop-test-1',
      customerId: 'cust-4',
      customerName: 'Barrister Femi',
      styleName: 'Safari Suit',
      orderDetails: 'Brown Safari',
      priority: 'normal',
      status: 'Delivered',
      assignedTo: 'staff-bello-01',
      totalBill: 90000,
      depositPaid: 90000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    },
    // 1 active order for Apprentice Tunde
    {
      id: 'ord-5',
      shopId: 'shop-test-1',
      customerId: 'cust-5',
      customerName: 'Dr. Chidi',
      styleName: 'Linen Trousers',
      orderDetails: 'White Trousers',
      priority: 'normal',
      status: 'Cutting',
      assignedTo: 'staff-tunde-02',
      dueDate: '2030-01-01',
      totalBill: 45000,
      depositPaid: 45000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    },
  ];

  // ── 1. RICH / FULL DATA STATE ──
  it('renders team workload cards with responsive active and overdue badges on mobile', () => {
    const handleNavigate = vi.fn();

    render(
      <MobileOwnerDashboard
        orders={sampleOrders}
        staffMembers={sampleStaffMembers}
        onNavigate={handleNavigate}
      />
    );

    // Verify section header and count badge
    expect(screen.getByText('Team Workload')).toBeDefined();
    expect(screen.getByText(/2 Tailors/i)).toBeDefined();

    // Verify Master Cutter Bello card
    expect(screen.getByText('Master Cutter Bello')).toBeDefined();
    expect(screen.getAllByText('Master Cutter').length).toBeGreaterThan(0);
    expect(screen.getByText('3 Active')).toBeDefined();
    expect(screen.getByText('1 Overdue')).toBeDefined();
    expect(screen.getByText('1 completed piece')).toBeDefined();

    // Verify Apprentice Tunde card
    expect(screen.getByText('Apprentice Tunde')).toBeDefined();
    expect(screen.getAllByText('Apprentice / Trainee').length).toBeGreaterThan(0);
    expect(screen.getByText('1 Active')).toBeDefined();

    // Click card and assert navigation
    const belloCard = screen.getByText('Master Cutter Bello').closest('button');
    expect(belloCard).toBeDefined();
    fireEvent.click(belloCard!);
    expect(handleNavigate).toHaveBeenCalledWith('/production?staff=staff-bello-01');
  });

  it('renders delegation badges on desktop matching mobile logic', () => {
    const handleNavigate = vi.fn();

    render(
      <DesktopOwnerDashboard
        orders={sampleOrders}
        staffMembers={sampleStaffMembers}
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('Team Workload')).toBeDefined();
    expect(screen.getByText('Master Cutter Bello')).toBeDefined();
    expect(screen.getByText('3 Active')).toBeDefined();
    expect(screen.getByText('1 Overdue')).toBeDefined();
  });

  // ── 2. SPARSE / MINIMAL DATA STATE ──
  it('renders empty team invite card when no staff members exist', () => {
    const handleNavigate = vi.fn();

    render(
      <MobileOwnerDashboard
        orders={sampleOrders.slice(0, 1)}
        staffMembers={[]}
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('Delegate to Apprentices & Tailors')).toBeDefined();
    expect(screen.getByText(/Assign garments by craft role/i)).toBeDefined();

    const addTeamBtn = screen.getByRole('button', { name: /Add Team/i });
    expect(addTeamBtn).toBeDefined();
    fireEvent.click(addTeamBtn);
    expect(handleNavigate).toHaveBeenCalledWith('/settings/staff');
  });

  // ── 3. EDGE-CASE / RTW & DEACTIVATED STATE ──
  it('handles RTW mode with clean status badge and deactivated staff members', () => {
    const handleNavigate = vi.fn();
    mockCurrentShop = {
      ...mockCurrentShop,
      businessMode: 'rtw',
    };

    const rtwStaff: User[] = [
      {
        uid: 'staff-sales-01',
        name: 'Chioma Store Lead',
        email: 'chioma@shop.com',
        role: 'Staff',
        craftRole: 'general',
        shopId: 'shop-test-1',
        orgId: 'org-1',
        active: false, // Deactivated
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <MobileOwnerDashboard
        orders={sampleOrders.slice(0, 1)}
        staffMembers={rtwStaff}
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getAllByText('Store Staff').length).toBeGreaterThan(0);
    expect(screen.getByText('Chioma Store Lead')).toBeDefined();
    expect(screen.getByText('Inactive')).toBeDefined();
    expect(screen.getByText('Deactivated')).toBeDefined();
  });
});

