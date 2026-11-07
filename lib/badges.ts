import type { Order, Customer } from '@/lib/types';

export interface AtelierBadge {
  id: string;
  category: 'milestone' | 'discipline' | 'speed' | 'special';
  name: string;
  tagline: string;
  description: string;
  icon: string;
  iconColor: string;
  tier: 1 | 2 | 3 | 4 | 5;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  clientVisible: boolean; // Flex badge on public /track and /studio links
}

export interface BadgeEvaluationContext {
  xp: number;
  streakCurrent: number;
  streakBest: number;
  totalCustomers: number;
  totalOrders: number;
  ordersDelivered: number;
  fullyPaidOrders: number;
  onTimeDeliveries: number;
  restDaysUsed: number;
}

export const ATELIER_BADGES_CATALOG: Omit<AtelierBadge, 'unlocked' | 'progress'>[] = [
  // 1. Client Trust & Punctuality
  {
    id: 'punctual_needle',
    category: 'discipline',
    name: 'Punctual Atelier',
    tagline: 'Delivers on or before the promised deadline',
    description: 'Complete 10 client orders on or before their agreed fitting/delivery date.',
    icon: 'verified',
    iconColor: '#10B981',
    tier: 1,
    maxProgress: 10,
    clientVisible: true,
  },
  {
    id: 'reliable_couture',
    category: 'discipline',
    name: 'Reliable Couturier',
    tagline: 'Flawless 50-order on-time delivery streak',
    description: 'Deliver 50 orders on-time without missing a client event or fitting.',
    icon: 'emoji_events',
    iconColor: '#F59E0B',
    tier: 3,
    maxProgress: 50,
    clientVisible: true,
  },

  // 2. Anatomical Precision & Measurements
  {
    id: 'master_tape',
    category: 'milestone',
    name: 'Master Tape',
    tagline: 'Flawless digital client anatomy vault',
    description: 'Save 20 distinct clients with complete anatomical body measurements.',
    icon: 'straighten',
    iconColor: '#6366F1',
    tier: 2,
    maxProgress: 20,
    clientVisible: true,
  },
  {
    id: 'grand_archivist',
    category: 'milestone',
    name: 'Grand Archivist',
    tagline: '100 client profiles safely preserved',
    description: 'Maintain 100 individual client folders with updated sizes and preferences.',
    icon: 'inventory_2',
    iconColor: '#8B5CF6',
    tier: 4,
    maxProgress: 100,
    clientVisible: false,
  },

  // 3. Operational Discipline & Streaks
  {
    id: 'iron_discipline_7',
    category: 'speed',
    name: 'Unshakable Fire',
    tagline: '7 consecutive days of active studio craft',
    description: 'Maintain a 7-day studio streak without letting the flame die.',
    icon: 'local_fire_department',
    iconColor: '#EF4444',
    tier: 1,
    maxProgress: 7,
    clientVisible: false,
  },
  {
    id: 'iron_discipline_30',
    category: 'speed',
    name: 'Iron Needle Streak',
    tagline: '30-day consistent atelier momentum',
    description: 'Keep your workshop active for 30 consecutive work days.',
    icon: 'bolt',
    iconColor: '#F59E0B',
    tier: 3,
    maxProgress: 30,
    clientVisible: true,
  },

  // 4. Financial & Commercial Mastery
  {
    id: 'debt_slayer',
    category: 'milestone',
    name: 'Debt-Free Atelier',
    tagline: 'Full financial collection upon garment handover',
    description: 'Deliver 25 orders with 100% of the balance collected and recorded.',
    icon: 'payments',
    iconColor: '#10B981',
    tier: 2,
    maxProgress: 25,
    clientVisible: false,
  },

  // 5. Grand Master Craft Status
  {
    id: 'grand_master_5k',
    category: 'special',
    name: 'Grand Couturier',
    tagline: '5,000 XP Master Tailor Milestone',
    description: 'Reach Diamond Machine tier (5,000 Craft Points). Eligible for equipment grants.',
    icon: 'dry_cleaning',
    iconColor: '#38BDF8',
    tier: 5,
    maxProgress: 5000,
    clientVisible: true,
  },
];

/**
 * Calculates strict on-time deliveries:
 * An order is on-time if it was delivered on or before its dueDate.
 * If no dueDate was set, delivering it marks a completed piece.
 */
export function countOnTimeDeliveries(orders: Order[] = []): number {
  return orders.filter((o) => {
    if (o.status !== 'Delivered') return false;
    if (!o.dueDate) return true; // Delivered without a strict deadline constraint

    // Check delivery timestamp from statusHistory
    const deliveredEntry = (o.statusHistory || []).find((h) => h.to === 'Delivered');
    if (!deliveredEntry?.timestamp) return true;

    const deliveredDate = new Date(deliveredEntry.timestamp).toISOString().split('T')[0];
    const dueDate = new Date(o.dueDate).toISOString().split('T')[0];

    return deliveredDate <= dueDate;
  }).length;
}

/**
 * Counts customers who have verified anatomical measurements recorded
 */
export function countMeasuredCustomers(customers: Customer[] = []): number {
  return customers.filter((c) => {
    if (!c.measurements) return false;
    return Object.keys(c.measurements).length >= 3;
  }).length;
}

/**
 * Evaluates which badges a tailor has unlocked based on current studio statistics.
 */
export function evaluateAtelierBadges(stats: BadgeEvaluationContext): AtelierBadge[] {
  return ATELIER_BADGES_CATALOG.map((b) => {
    let progress = 0;

    switch (b.id) {
      case 'punctual_needle':
      case 'reliable_couture':
        progress = stats.onTimeDeliveries;
        break;
      case 'master_tape':
        progress = stats.totalCustomers;
        break;
      case 'grand_archivist':
        progress = stats.totalCustomers;
        break;
      case 'iron_discipline_7':
      case 'iron_discipline_30':
        progress = Math.max(stats.streakCurrent, stats.streakBest);
        break;
      case 'debt_slayer':
        progress = stats.fullyPaidOrders;
        break;
      case 'grand_master_5k':
        progress = stats.xp;
        break;
      default:
        progress = 0;
    }

    const clampedProgress = Math.min(progress, b.maxProgress);
    const unlocked = clampedProgress >= b.maxProgress;

    return {
      ...b,
      progress: clampedProgress,
      unlocked,
    };
  });
}
