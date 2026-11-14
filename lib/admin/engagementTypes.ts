export type TailorCraftCategory =
  | 'cutting'
  | 'sewing'
  | 'measurement'
  | 'fitting'
  | 'pickup'
  | 'payment'
  | 'order'
  | 'client'
  | 'streak'
  | 'system';

export interface LiveCraftAction {
  id: string;
  shopId: string;
  shopName: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  actorName: string;
  actionRaw: string;
  actionLabel: string;
  category: TailorCraftCategory;
  categoryIcon: string;
  details?: string;
  createdAt: string;
}

export interface AtRiskShop {
  shopId: string;
  shopName: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  ownerName: string;
  ownerEmail: string | null;
  subscriptionStatus: string;
  lastActiveAt: string | null;
  daysInactive: number;
  pendingOrdersCount: number;
  overdueOrdersCount: number;
  riskReason: string;
}

export interface StreakChampion {
  shopId: string;
  shopName: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  currentStreak: number;
  longestStreak: number;
  freezesRemaining: number;
  xpPoints: number;
  lastActiveAt: string | null;
}

export interface PowerWorkshop {
  shopId: string;
  shopName: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  totalActions7d: number;
  activityGrade: 'High' | 'Medium' | 'Low';
  actionBreakdown: { label: string; count: number }[];
  customerCount: number;
  orderCount: number;
}

export interface CirclePodMember {
  shopId: string;
  shopName: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  streakCurrent: number;
  lastActiveAt: string | null;
  isActiveToday: boolean;
  isSabbatical: boolean;
  sabbaticalReason?: string;
}

export interface CirclePod {
  id: string;
  members: CirclePodMember[];
  sharedStreak: number;
  isCoOpSecuredToday: boolean;
  status: 'active' | 'partial' | 'sabbatical' | 'dormant';
  createdAt?: string;
}

export interface CircleTelemetry {
  totalPods: number;
  pairedWorkshopsCount: number;
  coOpSecuredTodayCount: number;
  sabbaticalCount: number;
  pods: CirclePod[];
}

export interface XpLedgerEntry {
  id: string;
  shopId: string;
  shopName: string;
  orgId: string;
  amount: number;
  actionType: string;
  description: string | null;
  createdAt: string;
}

export interface XpTierDistribution {
  apprenticeCount: number;   // < 500 XP
  artisanCount: number;      // 500 - 1,499 XP
  seniorCount: number;       // 1,500 - 3,499 XP
  masterTailorCount: number; // 3,500+ XP
  totalXpCirculating: number;
}

export interface XpTelemetry {
  tierDistribution: XpTierDistribution;
  recentLedger: XpLedgerEntry[];
}

export interface AdminShopLookup {
  id: string;
  name: string;
  orgId: string;
  businessMode: 'bespoke' | 'rtw' | 'hybrid';
  streakCurrent: number;
  streakBest: number;
  streakFreezes: number;
  xpPoints: number;
}

export interface EngagementTelemetry {
  stickinessRatio: number; // DAU/MAU %
  onlineNow: number;       // active in last 15m
  dailyActive: number;     // DAU (last 24h)
  weeklyActive: number;    // WAU (last 7d)
  monthlyActive: number;   // MAU (last 30d)
  atRiskCount: number;
  activeStreaksCount: number;
  liveFeed: LiveCraftAction[];
  atRiskShops: AtRiskShop[];
  streakChampions: StreakChampion[];
  powerWorkshops: PowerWorkshop[];
  roleEngagement: { role: string; count: number }[];
  actionDistribution: { action: string; label: string; count: number }[];
  circleTelemetry: CircleTelemetry;
  xpTelemetry: XpTelemetry;
  allShopsList: AdminShopLookup[];
  lastRefreshedAt: string;
}

