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

export interface GrandChampionshipConfig {
  id: string;
  title: string;
  durationDays: number;
  grandPrize: string;
  totalGrants: number;
  requiredXp: number;
  requiredBadgeIds: string[];
}

export const GRAND_CHAMPIONSHIP: GrandChampionshipConfig = {
  id: 'grand_championship_90d',
  title: '90-Day Master Tailor Championship',
  durationDays: 90,
  grandPrize: 'Industrial Sewing Machine',
  totalGrants: 3,
  requiredXp: 5000,
  requiredBadgeIds: ['punctual_needle', 'master_tape', 'iron_discipline_30'],
};

export interface MonthlySprintConfig {
  monthIndex: number;
  name: string;
  theme: string;
  targetDeliveries: number;
  focus: string;
  distinction: string;
}

export const MONTHLY_SPRINTS: MonthlySprintConfig[] = [
  {
    monthIndex: 0,
    name: 'January Jumpstart',
    theme: 'New Year Workshop Launch',
    targetDeliveries: 10,
    focus: 'Onboarding fresh walk-ins and logging initial orders',
    distinction: 'Punctual New Year Couturier',
  },
  {
    monthIndex: 1,
    name: 'February Speed Sprint',
    theme: 'Couples & Valentine Elegance',
    targetDeliveries: 12,
    focus: 'Rapid cutting and prompt fittings without delay',
    distinction: 'Valentine Season Specialist',
  },
  {
    monthIndex: 2,
    name: 'March Season Prep',
    theme: 'Easter & Eid Preparation Sprint',
    targetDeliveries: 15,
    focus: 'Pre-season fabric sourcing and measurement precision',
    distinction: 'Festival Preparation Master',
  },
  {
    monthIndex: 3,
    name: 'April Festivities',
    theme: 'Festival Rush & Timely Delivery',
    targetDeliveries: 15,
    focus: 'Zero-delay deliveries for holiday celebrations',
    distinction: 'Punctual Holiday Couturier',
  },
  {
    monthIndex: 4,
    name: 'May Wedding Season',
    theme: 'Aso-Ebi & Bridal Perfection',
    targetDeliveries: 18,
    focus: 'Bridal party coordination and flawless fittings',
    distinction: 'Bridal Atelier Star',
  },
  {
    monthIndex: 5,
    name: 'June Mid-Year Classic',
    theme: 'Showroom & RTW Collection',
    targetDeliveries: 15,
    focus: 'High-standard garment finishing and customer delight',
    distinction: 'Mid-Year Quality Master',
  },
  {
    monthIndex: 6,
    name: 'July Summer Kaftans',
    theme: 'Senator & Kaftan Precision',
    targetDeliveries: 12,
    focus: 'Sharp collar lines, clean hems, and exact pocket placements',
    distinction: 'Senator Specialist',
  },
  {
    monthIndex: 7,
    name: 'August Back-to-School',
    theme: 'Uniforms & High Volume Orders',
    targetDeliveries: 20,
    focus: 'Efficient batch cutting and organized bulk assembly',
    distinction: 'High Volume Producer',
  },
  {
    monthIndex: 8,
    name: 'September Corporate Rush',
    theme: 'Corporate Bespoke Suits',
    targetDeliveries: 12,
    focus: 'Structured canvas chest pieces and executive trousers',
    distinction: 'Bespoke Suiting Master',
  },
  {
    monthIndex: 9,
    name: 'October Heritage Sprint',
    theme: 'Cultural Attire & Heritage Prints',
    targetDeliveries: 15,
    focus: 'Traditional agbadas, caps, and intricate embroidery work',
    distinction: 'Heritage Couturier',
  },
  {
    monthIndex: 10,
    name: 'November Pre-Holiday Rush',
    theme: 'December Early Bird Deliveries',
    targetDeliveries: 20,
    focus: 'Beating December deadlines by completing early bookings',
    distinction: 'Holiday Readiness Star',
  },
  {
    monthIndex: 11,
    name: 'December Grand Finale',
    theme: 'Zero Delay Holiday Deliveries',
    targetDeliveries: 25,
    focus: 'Flawless execution during the peak tailoring season of the year',
    distinction: 'Master of the Peak Season',
  },
];

export function getCurrentMonthlySprint(): MonthlySprintConfig {
  const currentMonth = new Date().getMonth();
  return MONTHLY_SPRINTS[currentMonth] || MONTHLY_SPRINTS[0];
}

export function evaluateGrandChampionshipQualification(params: {
  xp: number;
  unlockedBadgeIds: string[];
}): { qualified: boolean; xpProgress: number; missingBadges: string[] } {
  const { xp, unlockedBadgeIds } = params;
  const missingBadges = GRAND_CHAMPIONSHIP.requiredBadgeIds.filter(
    (bId) => !unlockedBadgeIds.includes(bId)
  );
  const qualified = xp >= GRAND_CHAMPIONSHIP.requiredXp && missingBadges.length === 0;
  const xpProgress = Math.min(100, Math.round((xp / GRAND_CHAMPIONSHIP.requiredXp) * 100));

  return { qualified, xpProgress, missingBadges };
}
