export interface NotificationTemplatesConfig {
  orderIntake: string;
  cuttingAndSewing: string;
  fittingReady: string;
  readyForPickup: string;
  paymentReminder: string;
}

export interface FeatureFlagsConfig {
  rtwModuleStatus: 'active' | 'beta_only' | 'disabled';
  streakGamificationEnabled: boolean;
  publicLookbookEnabled: boolean;
  whatsappDirectEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  theme: 'info' | 'amber' | 'green' | 'red';
  actionUrl: string;
  actionText: string;
}

export interface PlanLimitsConfig {
  freeOrdersPerMonth: number;
  freeCustomersLimit: number;
  freeStaffSeats: number;
  gracePeriodDays: number;
  starterPriceNgn: number;
  growthPriceNgn: number;
  proPriceNgn: number;
}

export interface PlatformSettings {
  featureFlags: FeatureFlagsConfig;
  notificationTemplates: NotificationTemplatesConfig;
  announcementBar: AnnouncementBarConfig;
  planLimits: PlanLimitsConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  featureFlags: {
    rtwModuleStatus: 'active',
    streakGamificationEnabled: true,
    publicLookbookEnabled: true,
    whatsappDirectEnabled: true,
    maintenanceMode: false,
    maintenanceMessage:
      'We are currently performing routine maintenance to upgrade your workshop tools. We will be back online shortly!',
  },
  notificationTemplates: {
    orderIntake:
      'Hello {customer_name}! Your custom order for {garment_type} has been received at {shop_name}. Initial deposit: {deposit_amount}. We are now preparing your fabric patterns.',
    cuttingAndSewing:
      'Great news {customer_name}! The fabric for your {garment_type} has been precision-cut and is currently at the sewing station at {shop_name}.',
    fittingReady:
      'Hello {customer_name}! Your {garment_type} is basted and ready for your fitting consultation at {shop_name}. Please let us know your preferred time to stop by.',
    readyForPickup:
      'Exciting update {customer_name}! Your {garment_type} has passed final inspection and pressing, and is ready for pickup or delivery from {shop_name}!',
    paymentReminder:
      'Hello {customer_name}, this is a gentle reminder that an outstanding balance of {balance_due} for your order #{order_id} is due upon collection at {shop_name}.',
  },
  announcementBar: {
    enabled: false,
    text: '✂️ End-of-Year Tailoring Rush: Ensure order deadlines are marked properly on your workshop production board!',
    theme: 'amber',
    actionUrl: '/dashboard/production',
    actionText: 'Open Production Board',
  },
  planLimits: {
    freeOrdersPerMonth: 15,
    freeCustomersLimit: 30,
    freeStaffSeats: 2,
    gracePeriodDays: 7,
    starterPriceNgn: 4900,
    growthPriceNgn: 14900,
    proPriceNgn: 39900,
  },
};
