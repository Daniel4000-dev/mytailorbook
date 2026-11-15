'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStitchWrapData } from '@/lib/wrap/wrapQueries';
import type { StitchWrapData } from '@/lib/wrap/types';

export async function fetchStitchWrapAction(
  targetYear?: number
): Promise<{ data?: StitchWrapData; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Please sign in to view your Stitch Wrap.' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    let shopId = profile?.shop_id;

    if (!shopId) {
      // Fallback: Check if user owns any shop directly
      const { data: ownedShop } = await admin
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();
      shopId = ownedShop?.id;
    }

    if (!shopId) {
      return { error: 'No active workshop found for this account.' };
    }

    const year = targetYear || new Date().getFullYear();
    const wrapData = await getStitchWrapData(shopId, year);

    if (!wrapData) {
      return { error: 'Unable to calculate Stitch Wrap metrics for this workshop.' };
    }

    return { data: wrapData };
  } catch (err: unknown) {
    console.error('[fetchStitchWrapAction] Error:', err);
    return {
      error: err instanceof Error ? err.message : 'Failed to generate Stitch Wrap.',
    };
  }
}
