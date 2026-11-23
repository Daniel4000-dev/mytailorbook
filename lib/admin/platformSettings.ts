import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  NotificationTemplatesConfig,
  FeatureFlagsConfig,
  AnnouncementBarConfig,
  PlanLimitsConfig,
} from './platformSettingsTypes';

export type {
  PlatformSettings,
  NotificationTemplatesConfig,
  FeatureFlagsConfig,
  AnnouncementBarConfig,
  PlanLimitsConfig,
};
export { DEFAULT_PLATFORM_SETTINGS };

/**
 * Fetch current platform-wide settings.
 * Persisted in admin_audit_log under target_type 'platform' and target_id 'global'.
 * Zero-downtime, safe defaults fallback without requiring new database schema migrations.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('new_data, created_at, actor_email')
      .eq('target_type', 'platform')
      .eq('target_id', 'global')
      .eq('action', 'update_platform_settings')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.new_data) {
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }

    const saved = data.new_data as Partial<PlatformSettings>;
    return {
      featureFlags: {
        ...DEFAULT_PLATFORM_SETTINGS.featureFlags,
        ...(saved.featureFlags || {}),
      },
      notificationTemplates: {
        ...DEFAULT_PLATFORM_SETTINGS.notificationTemplates,
        ...(saved.notificationTemplates || {}),
      },
      announcementBar: {
        ...DEFAULT_PLATFORM_SETTINGS.announcementBar,
        ...(saved.announcementBar || {}),
      },
      planLimits: {
        ...DEFAULT_PLATFORM_SETTINGS.planLimits,
        ...(saved.planLimits || {}),
      },
      updatedAt: data.created_at,
      updatedBy: data.actor_email ?? undefined,
    };
  } catch (err) {
    console.error('[getPlatformSettings] Error loading platform settings:', err);
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

/**
 * Save updated platform settings snapshot to admin_audit_log.
 */
export async function savePlatformSettings(
  settings: PlatformSettings,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const cleanSettings: PlatformSettings = {
      featureFlags: { ...settings.featureFlags },
      notificationTemplates: { ...settings.notificationTemplates },
      announcementBar: { ...settings.announcementBar },
      planLimits: { ...settings.planLimits },
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail || 'system_admin',
    };

    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: null,
      actor_email: actorEmail || 'system_admin',
      action: 'update_platform_settings',
      target_type: 'platform',
      target_id: 'global',
      new_data: cleanSettings,
    });

    if (error) {
      console.error('[savePlatformSettings] Audit log insert failed:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cached admin views
    revalidatePath('/admin/settings');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('[savePlatformSettings] Exception:', err);
    return { success: false, error: err?.message || 'Failed to save settings' };
  }
}
