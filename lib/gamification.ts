export type TailorTier = {
  name: string;
  icon: string;
  minXp: number;
  color: string;
};

export const TAILOR_TIERS: TailorTier[] = [
  { name: 'Bronze Needle', icon: 'needle', minXp: 0, color: '#CD7F32' },
  { name: 'Silver Scissors', icon: 'content_cut', minXp: 500, color: '#C0C0C0' },
  { name: 'Gold Spool', icon: 'thread', minXp: 2000, color: '#FFD700' },
  { name: 'Diamond Machine', icon: 'dry_cleaning', minXp: 5000, color: '#b9f2ff' },
];

export const CHALLENGE_GOAL_XP = 5000;
export const TOTAL_EQUIPMENT_GRANTS = 3;

export interface ChallengeTask {
  id: string;
  category: 'daily' | 'fulfillment' | 'growth';
  title: string;
  xpReward: number;
  description: string;
  icon: string;
}

export const CHALLENGE_TASKS: ChallengeTask[] = [
  {
    id: 'intake',
    category: 'daily',
    title: 'New Customer Order',
    xpReward: 20,
    description: 'Record a new customer order with their measurements & price',
    icon: 'assignment_add',
  },
  {
    id: 'measurements',
    category: 'daily',
    title: 'Customer Measurements',
    xpReward: 15,
    description: 'Add or update complete body measurements for a customer',
    icon: 'straighten',
  },
  {
    id: 'cutting_sewing',
    category: 'fulfillment',
    title: 'Cutting or Sewing',
    xpReward: 15,
    description: 'Move an order into Cutting or Sewing on your board',
    icon: 'content_cut',
  },
  {
    id: 'payment',
    category: 'fulfillment',
    title: 'Record Deposit / Payment',
    xpReward: 20,
    description: 'Record a cash or transfer payment on an active order',
    icon: 'payments',
  },
  {
    id: 'delivery',
    category: 'fulfillment',
    title: 'Complete & Deliver',
    xpReward: 20,
    description: 'Mark finished clothes as Ready or Delivered to the customer',
    icon: 'check_circle',
  },
  {
    id: 'rest_day',
    category: 'daily',
    title: 'Rest Day',
    xpReward: 10,
    description: 'Take a break (up to 2 days a week) without losing your streak',
    icon: 'spa',
  },
  {
    id: 'daily_share',
    category: 'daily',
    title: 'Share Daily Status Card',
    xpReward: 15,
    description: 'Post your 9:16 shop status card to WhatsApp or Instagram (1x daily)',
    icon: 'share',
  },
  {
    id: 'buddy_coop',
    category: 'growth',
    title: 'Tailor Partner Streak',
    xpReward: 15,
    description: 'Both you and your tailor partner work on the same day',
    icon: 'group',
  },
  {
    id: 'referral',
    category: 'growth',
    title: 'Invite a Tailor Friend',
    xpReward: 100,
    description: 'Invite a fellow tailor. Earn points when they record their first order',
    icon: 'share',
  },
];

export function getTierForXp(xp: number): TailorTier {
  for (let i = TAILOR_TIERS.length - 1; i >= 0; i--) {
    if (xp >= TAILOR_TIERS[i].minXp) {
      return TAILOR_TIERS[i];
    }
  }
  return TAILOR_TIERS[0];
}

export function getNextTierProgress(xp: number) {
  const currentTierIndex = TAILOR_TIERS.findIndex(t => t.name === getTierForXp(xp).name);
  if (currentTierIndex === TAILOR_TIERS.length - 1) {
    return { nextTier: null, progress: 100, xpNeeded: 0 };
  }
  
  const currentTier = TAILOR_TIERS[currentTierIndex];
  const nextTier = TAILOR_TIERS[currentTierIndex + 1];
  
  const xpInTier = xp - currentTier.minXp;
  const tierRange = nextTier.minXp - currentTier.minXp;
  const progress = Math.min(100, Math.max(0, (xpInTier / tierRange) * 100));
  const xpNeeded = nextTier.minXp - xp;
  
  return { nextTier, progress, xpNeeded };
}
