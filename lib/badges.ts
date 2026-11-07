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
    name: 'Always On Time',
    tagline: 'Delivers customer clothes right on time',
    description: 'Deliver 10 customer clothes on or before the agreed date.',
    icon: 'verified',
    iconColor: '#10B981',
    tier: 1,
    maxProgress: 10,
    clientVisible: true,
  },
  {
    id: 'reliable_couture',
    category: 'discipline',
    name: 'Most Trusted Tailor',
    tagline: '50 orders delivered without any delay',
    description: 'Deliver 50 orders on time for your customers.',
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
    name: 'Master of the Tape',
    tagline: '20 customer measurements safely recorded',
    description: 'Save complete body measurements for 20 different customers.',
    icon: 'straighten',
    iconColor: '#6366F1',
    tier: 2,
    maxProgress: 20,
    clientVisible: true,
  },
  {
    id: 'grand_archivist',
    category: 'milestone',
    name: '100 Customer Book',
    tagline: '100 customer measurements safely saved',
    description: 'Record measurement details for 100 different customers.',
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
    name: '7-Day Work Streak',
    tagline: '7 straight days of active tailoring',
    description: 'Keep your shop active and record work for 7 days in a row.',
    icon: 'local_fire_department',
    iconColor: '#EF4444',
    tier: 1,
    maxProgress: 7,
    clientVisible: false,
  },
  {
    id: 'iron_discipline_30',
    category: 'speed',
    name: '30-Day Master Streak',
    tagline: '30 straight days of consistent tailoring',
    description: 'Keep your shop active and record updates for 30 straight work days.',
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
    name: 'Zero Debt Shop',
    tagline: '25 orders delivered with full payment collected',
    description: 'Deliver 25 orders with the full balance collected and recorded.',
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
    name: 'Master Tailor',
    tagline: '5,000 Points Master Tailor Milestone',
    description: 'Reach Diamond Machine rank (5,000 Points). Qualify for the sewing machine giveaway!',
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
