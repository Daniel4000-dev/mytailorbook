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
    title: 'Order Intake',
    xpReward: 20,
    description: 'Log a new client order with complete measurements & total bill',
    icon: 'assignment_add',
  },
  {
    id: 'measurements',
    category: 'daily',
    title: 'Client Measurements',
    xpReward: 15,
    description: 'Add or update anatomically verified measurements for a client',
    icon: 'straighten',
  },
  {
    id: 'cutting_sewing',
    category: 'fulfillment',
    title: 'Advance to Production',
    xpReward: 15,
    description: 'Move an order into Cutting or Sewing on your workshop board',
    icon: 'content_cut',
  },
  {
    id: 'payment',
    category: 'fulfillment',
    title: 'Record Payment / Deposit',
    xpReward: 20,
    description: 'Log a cash deposit or bank transfer payment on an active order',
    icon: 'payments',
  },
  {
    id: 'delivery',
    category: 'fulfillment',
    title: 'Complete & Deliver Order',
    xpReward: 20,
    description: 'Mark a finished garment as Ready or Delivered to the client',
    icon: 'check_circle',
  },
  {
    id: 'rest_day',
    category: 'daily',
    title: 'Studio Rest Day',
    xpReward: 10,
    description: 'Take a well-deserved break (up to 2x/week) and keep your streak safe',
    icon: 'spa',
  },
  {
    id: 'buddy_coop',
    category: 'growth',
    title: 'Studio Buddy Co-Op Streak',
    xpReward: 15,
    description: 'Both you and your linked colleague log activity on the same workday',
    icon: 'group',
  },
  {
    id: 'referral',
    category: 'growth',
    title: 'Refer a Colleague',
    xpReward: 100,
    description: 'Invite a tailor friend with your referral link when they log their 1st order',
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
