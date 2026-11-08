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
  verifiedTrackingViews?: number;
}

export const ATELIER_BADGES_CATALOG: Omit<AtelierBadge, 'unlocked' | 'progress'>[] = [
  // -------------------------------------------------------------
  // 1. Foundational Gateway Badges (Required for 90-Day Industrial Machine)
  // -------------------------------------------------------------
  {
    id: 'punctual_needle',
    category: 'discipline',
    name: 'Always On Time',
    tagline: '10 customer clothes delivered on schedule',
    description: 'Deliver 10 customer clothes strictly on or before the agreed date. (Gateway Badge 1 of 3 for 90-Day Challenge)',
    icon: 'verified',
    iconColor: '#10B981',
    tier: 1,
    maxProgress: 10,
    clientVisible: true,
  },
  {
    id: 'master_tape',
    category: 'milestone',
    name: 'Master of the Tape',
    tagline: '20 customer measurement profiles safely archived',
    description: 'Record complete anatomical body measurements for 20 different customers. (Gateway Badge 2 of 3 for 90-Day Challenge)',
    icon: 'straighten',
    iconColor: '#6366F1',
    tier: 2,
    maxProgress: 20,
    clientVisible: true,
  },
  {
    id: 'iron_discipline_30',
    category: 'speed',
    name: '30-Day Master Streak',
    tagline: '30 consecutive days of active workshop craft',
    description: 'Keep your workshop active and log tailoring progress for 30 consecutive work days. (Gateway Badge 3 of 3 for 90-Day Challenge)',
    icon: 'bolt',
    iconColor: '#F59E0B',
    tier: 3,
    maxProgress: 30,
    clientVisible: true,
  },

  // -------------------------------------------------------------
  // 2. Elite Master Atelier Badges (High-Value, Scarce, Tough)
  // -------------------------------------------------------------
  {
    id: 'verified_communicator',
    category: 'discipline',
    name: 'Client Verified Atelier',
    tagline: '25 live tracking links opened & verified by clients',
    description: 'Share live order tracking links that have been opened and verified by at least 25 different customers.',
    icon: 'share',
    iconColor: '#06B6D4',
    tier: 3,
    maxProgress: 25,
    clientVisible: true,
  },
  {
    id: 'reliable_couture',
    category: 'discipline',
    name: 'Most Trusted Tailor',
    tagline: '50 orders delivered on schedule without delay',
    description: 'Deliver 50 orders on time for your customers.',
    icon: 'emoji_events',
    iconColor: '#F59E0B',
    tier: 3,
    maxProgress: 50,
    clientVisible: true,
  },
  {
    id: 'centurion_cutter',
    category: 'discipline',
    name: 'Centurion Couturier',
    tagline: '100 on-time bespoke deliveries',
    description: 'Complete and deliver 100 customer garments strictly on or before the due date.',
    icon: 'workspace_premium',
    iconColor: '#EAB308',
    tier: 4,
    maxProgress: 100,
    clientVisible: true,
  },
  {
    id: 'grand_archivist',
    category: 'milestone',
    name: '100 Customer Vault',
    tagline: '100 complete customer measurement profiles',
    description: 'Safely archive complete measurements for 100 different customers.',
    icon: 'inventory_2',
    iconColor: '#8B5CF6',
    tier: 4,
    maxProgress: 100,
    clientVisible: false,
  },
  {
    id: 'vault_of_250',
    category: 'milestone',
    name: 'Grand Master Vault (250)',
    tagline: '250 customer measurement profiles locked in',
    description: 'Store full measurement records for 250 customers. Elite enterprise atelier status.',
    icon: 'lock',
    iconColor: '#EC4899',
    tier: 5,
    maxProgress: 250,
    clientVisible: true,
  },
  {
    id: 'iron_discipline_100',
    category: 'speed',
    name: '100-Day Iron Discipline',
    tagline: '100 consecutive active workshop days',
    description: 'Maintain an unbroken 100-day operational streak in your atelier.',
    icon: 'local_fire_department',
    iconColor: '#EF4444',
    tier: 5,
    maxProgress: 100,
    clientVisible: true,
  },
  {
    id: 'golden_ledger',
    category: 'milestone',
    name: 'The Golden Ledger',
    tagline: '50 orders 100% paid with zero debtor backlog',
    description: 'Deliver 50 orders where the client bill is completely settled and recorded.',
    icon: 'payments',
    iconColor: '#10B981',
    tier: 4,
    maxProgress: 50,
    clientVisible: false,
  },
  {
    id: 'grand_master_5k',
    category: 'special',
    name: 'Diamond Machine',
    tagline: '5,000 Points Master Tailor Milestone',
    description: 'Reach Diamond Machine rank (5,000 Points). Qualifies for the 90-Day Industrial Sewing Machine grant.',
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
 * Counts orders where a customer has verified opened the live tracking link
 */
export function countVerifiedTrackingViews(orders: Order[] = []): number {
  return orders.filter((o) => {
    const meta = o.metadata as Record<string, unknown> | undefined;
    return Boolean(meta?.clientViewedAt || ((meta?.clientViewsCount as number) || 0) > 0);
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
      case 'centurion_cutter':
        progress = stats.onTimeDeliveries;
        break;
      case 'master_tape':
      case 'grand_archivist':
      case 'vault_of_250':
        progress = stats.totalCustomers;
        break;
      case 'iron_discipline_30':
      case 'iron_discipline_100':
        progress = Math.max(stats.streakCurrent, stats.streakBest);
        break;
      case 'verified_communicator':
        progress = stats.verifiedTrackingViews || 0;
        break;
      case 'golden_ledger':
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
