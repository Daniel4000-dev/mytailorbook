export interface NotificationPreferences {
  /** When true, suppresses automated reminders about ready orders with unpaid balance */
  mute_balance_reminders?: boolean;
  /** When true, suppresses alerts about orders sitting in a stage for >3 days */
  mute_stagnant_alerts?: boolean;
  /** When true, suppresses Tailor Circle colleague morning sewing nudges */
  mute_circle_nudges?: boolean;
  /** When true, suppresses automated morning workshop kickstart and streak reminders */
  mute_daily_kickstarts?: boolean;
  /** When true, internal staff handoffs (cutting, sewing, ironing) are in-app only, skipping mobile lockscreen push vibrations */
  mute_staff_push?: boolean;
  /** When true, holds non-emergency push notifications during quiet night hours (10:00 PM - 7:00 AM) */
  quiet_hours_enabled?: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mute_balance_reminders: false,
  mute_stagnant_alerts: false,
  mute_circle_nudges: false,
  mute_daily_kickstarts: false,
  mute_staff_push: false,
  quiet_hours_enabled: false,
};

/**
 * Extracts notification preferences from a shop's portfolio_settings or metadata.
 */
export function getShopNotificationPreferences(
  portfolioSettings?: Record<string, unknown> | null,
): NotificationPreferences {
  const prefs = (portfolioSettings?.notification_preferences as Record<string, unknown>) || {};
  return {
    mute_balance_reminders: Boolean(prefs.mute_balance_reminders),
    mute_stagnant_alerts: Boolean(prefs.mute_stagnant_alerts),
    mute_circle_nudges: Boolean(prefs.mute_circle_nudges),
    mute_daily_kickstarts: Boolean(prefs.mute_daily_kickstarts),
    mute_staff_push: Boolean(prefs.mute_staff_push),
    quiet_hours_enabled: Boolean(prefs.quiet_hours_enabled),
  };
}
