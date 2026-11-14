'use server';

import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  savePlatformSettings,
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
} from '@/lib/admin/platformSettings';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function savePlatformSettingsAction(
  settings: PlatformSettings
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const res = await savePlatformSettings(settings, admin.email ?? undefined);
    if (!res.success) {
      return {
        success: false,
        error: res.error || 'Failed to save settings.',
      };
    }

    return {
      success: true,
      message: 'Platform configuration updated successfully.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save settings.',
    };
  }
}

export async function resetPlatformSettingsAction(): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const res = await savePlatformSettings(
      DEFAULT_PLATFORM_SETTINGS,
      admin.email ?? undefined
    );
    if (!res.success) {
      return {
        success: false,
        error: res.error || 'Failed to reset settings.',
      };
    }

    return {
      success: true,
      message: 'Platform configuration reset to workshop defaults.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset settings.',
    };
  }
}
