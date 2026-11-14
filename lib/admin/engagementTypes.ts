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
  lastRefreshedAt: string;
}
