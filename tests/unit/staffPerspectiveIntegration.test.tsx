import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import StaffDashboard from '@/app/(app)/dashboard/_components/StaffDashboard';
import { NAV_ITEMS } from '@/lib/constants';
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

// Mock TodaysAgendaWidget
vi.mock('@/app/(app)/dashboard/_components/TodaysAgendaWidget', () => ({
  default: () => <div data-testid="todays-agenda-widget" />,
}));

// Mock DataContext
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

let mockStaffMembers: User[] = [];

const mockDataContext = {
  get currentShop() {
    return mockCurrentShop;
  },
  get staffMembers() {
    return mockStaffMembers;
  },
  calendarEvents: [],
  orders: [] as Order[],
  customers: [] as Customer[],
  isLoaded: true,
};

vi.mock('@/contexts/DataContext', () => ({
  useData: () => mockDataContext,
}));

describe('Staff POV & Artisan Workbench Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. RICH / FULL DATA STATE (Piece-Rate Tailor) ──
  it('renders staff workbench with craft role, piece-rate earnings, workload KPIs, and anti-poaching customer masking', () => {
    const handleNavigate = vi.fn();
    const tailorUid = 'staff-machinist-01';

    mockStaffMembers = [
      {
        uid: tailorUid,
        name: 'Ibrahim Machinist',
        email: 'ibrahim@workshop.com',
        role: 'Staff',
        craftRole: 'tailor',
        payrollType: 'piece_rate',
        payrollAmount: 7500, // ₦7,500 per completed garment
        shopId: 'shop-test-1',
        orgId: 'org-1',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const sampleOrders: Order[] = [
      // Active order due today
      {
        id: 'ord-today-1',
        shopId: 'shop-test-1',
        customerId: 'cust-1',
        customerName: 'Chief Babatunde Adeleke',
        styleName: 'Senator 2-Piece',
        orderDetails: 'Navy Blue Senator',
        priority: 'normal',
        status: 'Sewing',
        assignedTo: tailorUid,
        dueDate: todayStr,
        totalBill: 85000,
        depositPaid: 50000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
      },
      // Active overdue order with rush priority
      {
        id: 'ord-overdue-2',
        shopId: 'shop-test-1',
        customerId: 'cust-2',
        customerName: 'Senator Alabi Gold',
        styleName: 'Royal Agbada',
        orderDetails: 'Gold Silk Agbada',
        priority: 'rush',
        status: 'Cutting',
        assignedTo: tailorUid,
        dueDate: '2020-01-01', // Overdue
        totalBill: 160000,
        depositPaid: 100000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
      },
      // Completed garment within last 7 days (earns piece rate)
      {
        id: 'ord-completed-3',
        shopId: 'shop-test-1',
        customerId: 'cust-3',
        customerName: 'Engr. Dapo',
        styleName: 'Kaftan',
        orderDetails: 'White Kaftan',
        priority: 'normal',
        status: 'Delivered',
        assignedTo: tailorUid,
        totalBill: 70000,
        depositPaid: 70000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), // Today (within 7 days)
        statusHistory: [],
      },
      // Order assigned to another tailor (should not appear in my workbench)
      {
        id: 'ord-other-4',
        shopId: 'shop-test-1',
        customerId: 'cust-4',
        customerName: 'Dr. Chidi',
        styleName: 'Safari Suit',
        orderDetails: 'Olive Safari',
        priority: 'normal',
        status: 'Sewing',
        assignedTo: 'staff-cutter-99',
        totalBill: 90000,
        depositPaid: 90000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
      },
    ];

    render(
      <StaffDashboard
        orders={sampleOrders}
        userUid={tailorUid}
        onNavigate={handleNavigate}
      />
    );

    // 1. Staff Identity & Craft Role Badge
    expect(screen.getByText('Ibrahim Machinist')).toBeDefined();
    expect(screen.getByText('Tailor / Machinist')).toBeDefined();
    expect(screen.getByText('Crown Craft Workshop Floor Workbench')).toBeDefined();

    // 2. Weekly Piece-Rate Earnings Calculation (1 completed piece * ₦7,500 = ₦7,500)
    expect(screen.getByText('Weekly Earnings')).toBeDefined();
    expect(screen.getByText('₦7,500')).toBeDefined();
    expect(screen.getByText('1 piece completed')).toBeDefined();

    // 3. Workload Counters
    expect(screen.getByText('Active Orders')).toBeDefined();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Active and Overdue counters
    expect(screen.getByText('Due Today')).toBeDefined();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Due Today counter
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeDefined();

    // 4. Anti-Poaching Name Masking Check
    // "Chief Babatunde Adeleke" -> "Chief B."
    expect(screen.getByText('Chief B.')).toBeDefined();
    expect(screen.queryByText('Chief Babatunde Adeleke')).toBeNull();

    // "Senator Alabi Gold" -> "Senator A."
    expect(screen.getByText('Senator A.')).toBeDefined();
    expect(screen.queryByText('Senator Alabi Gold')).toBeNull();

    // 5. Verify Unassigned Order is not shown
    expect(screen.queryByText('Dr. Chidi')).toBeNull();
    expect(screen.queryByText('Dr. C.')).toBeNull();

    // 6. Navigation Check on Row Click
    const firstRow = screen.getByText('Senator A.').closest('button');
    expect(firstRow).toBeDefined();
    fireEvent.click(firstRow!);
    expect(handleNavigate).toHaveBeenCalledWith('/production?order=ord-overdue-2');
  });

  // ── 2. SPARSE / MINIMAL DATA STATE (Empty Workbench) ──
  it('renders clean empty state when tailor has no assigned floor tasks', () => {
    const handleNavigate = vi.fn();
    const apprenticeUid = 'staff-apprentice-01';

    mockStaffMembers = [
      {
        uid: apprenticeUid,
        name: 'Emeka Trainee',
        email: 'emeka@workshop.com',
        role: 'Staff',
        craftRole: 'apprentice',
        payrollType: 'none',
        shopId: 'shop-test-1',
        orgId: 'org-1',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <StaffDashboard
        orders={[]}
        userUid={apprenticeUid}
        onNavigate={handleNavigate}
      />
    );

    // Identity and Apprentice Craft Role
    expect(screen.getByText('Emeka Trainee')).toBeDefined();
    expect(screen.getByText('Apprentice / Trainee')).toBeDefined();

    // No payroll banner since payrollType is 'none'
    expect(screen.queryByText('Weekly Earnings')).toBeNull();

    // Zero metrics
    expect(screen.getByText('Active Orders')).toBeDefined();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);

    // Empty state container
    expect(screen.getByText('No assigned orders')).toBeDefined();
    expect(screen.getByText('No orders currently assigned to your workbench queue.')).toBeDefined();
  });

  // ── 3. EDGE-CASE / CORRUPTED DATA & ACCESS RESTRICTIONS ──
  it('handles salaried staff, missing client names safely, and verifies role navigation filtering', () => {
    const handleNavigate = vi.fn();
    const finisherUid = 'staff-finisher-01';

    mockStaffMembers = [
      {
        uid: finisherUid,
        name: 'Taiwo Presser',
        email: 'taiwo@workshop.com',
        role: 'Staff',
        craftRole: 'finisher',
        payrollType: 'salary',
        payrollAmount: 60000,
        shopId: 'shop-test-1',
        orgId: 'org-1',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const corruptedOrders: Order[] = [
      {
        id: 'ord-corrupted-1',
        shopId: 'shop-test-1',
        customerId: '',
        customerName: '', // Empty customer name
        styleName: 'Trouser Hemming',
        orderDetails: '',
        priority: 'normal',
        status: 'Ready',
        assignedTo: finisherUid,
        totalBill: 15000,
        depositPaid: 15000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
      },
      {
        id: 'ord-single-name-2',
        shopId: 'shop-test-1',
        customerId: 'cust-single',
        customerName: 'Kemi', // Single name without surname
        styleName: 'Boubou Pressing',
        orderDetails: 'Silk Boubou',
        priority: 'normal',
        status: 'Sewing',
        assignedTo: finisherUid,
        totalBill: 20000,
        depositPaid: 10000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
      },
    ];

    render(
      <StaffDashboard
        orders={corruptedOrders}
        userUid={finisherUid}
        onNavigate={handleNavigate}
      />
    );

    // Salaried wage presentation
    expect(screen.getByText('Taiwo Presser')).toBeDefined();
    expect(screen.getByText('Finisher / Presser')).toBeDefined();
    expect(screen.getByText('Weekly Earnings')).toBeDefined();
    expect(screen.getByText('₦60,000')).toBeDefined();

    // Fallback for empty customer name -> 'Workshop Client'
    expect(screen.getByText('Workshop Client')).toBeDefined();

    // Single name stays intact without crashing
    expect(screen.getByText('Kemi')).toBeDefined();

    // ── Staff Navigation Tree Restrictive Filter Check ──
    // When isOwner is false, ownerOnly routes MUST be filtered out
    const isOwner = false;
    const staffVisibleNav = NAV_ITEMS.filter((item) => {
      if (item.ownerOnly && !isOwner) return false;
      return true;
    });

    const staffHrefs = staffVisibleNav.map((i) => i.href);

    // Owner-restricted routes must NOT be in staff navigation
    expect(staffHrefs).not.toContain('/settings');
    expect(staffHrefs).not.toContain('/reconciliation');
    expect(staffHrefs).not.toContain('/collections');
    expect(staffHrefs).not.toContain('/customers');
    expect(staffHrefs).not.toContain('/catalogues');

    // Workshop execution routes MUST be present
    expect(staffHrefs).toContain('/dashboard');
    expect(staffHrefs).toContain('/production');
    expect(staffHrefs).toContain('/fabrics');
    expect(staffHrefs).toContain('/calendar');
  });
});
