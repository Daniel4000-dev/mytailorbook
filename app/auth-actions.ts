'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

/**
 * Runs for every first-time sign-in, Google or email — neither gives us a
 * form to collect a shop name before the auth account exists (Google has no
 * form at all; email signup no longer asks, to avoid asking twice), so we
 * let Supabase create the (profile-less) account first, then complete the
 * bootstrap here once they tell us their shop's name. `name` comes from
 * whatever the auth account already has in its metadata (Google profile
 * name, or the name given at email signup) rather than being asked again.
 *
 * Uses the request-scoped server client to confirm who's actually calling
 * (never trust a client-supplied user id for this), then the admin client
 * to do the actual insert — same bootstrap reasoning as new-shop signup.
 */
export async function completeOnboarding(shopName: string, nameOverride?: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Not signed in');
  }

  const admin = createAdminClient();

  const { data: existing } = await admin.from('profiles').select('id').eq('id', user.id).single();
  if (existing) {
    throw new Error('Onboarding already completed for this account');
  }

  // Email signups already collected a name in the form — carry that
  // straight through from metadata. Google gives us no form at all, so its
  // (editable) name field on this page is the only chance to confirm it.
  const name = nameOverride || user.user_metadata?.name || user.user_metadata?.full_name || '';

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({ name: shopName, owner_id: user.id })
    .select()
    .single();
  if (shopError || !shop) {
    throw new Error(shopError?.message || 'Could not create shop');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: user.id, shop_id: shop.id, name, role: 'OrgAdmin', email: user.email });
  if (profileError) {
    throw new Error(profileError.message);
  }
}

/**
 * Runs when an Owner registers a new staff member from Settings. Uses the
 * admin client because a brand-new staff account has no profile yet, so
 * the normal Row Level Security policies (which check "is this your shop?")
 * have nothing to check against — this is a deliberate, narrow bypass.
 * (Owner signup itself is handled differently: see
 * supabase/migrations/0004_signup_trigger.sql — it goes through Supabase's
 * real signUp() so a genuine confirmation email gets sent.)
 */
/** Returns `{ error }` rather than throwing for expected failures (e.g. a
 *  duplicate email) — Next.js redacts thrown Server Action errors to a
 *  generic "omitted in production" message before they reach the client,
 *  so a real, actionable message can only get through as a return value. */
export async function createStaffAccount(
  shopId: string,
  name: string,
  email: string,
  tempPassword: string,
  role: 'Staff' | 'BranchManager' | 'Accountant' = 'Staff'
): Promise<{ userId?: string; error?: string }> {
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return { error: authError?.message || 'Could not create staff account' };
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: authData.user.id, shop_id: shopId, name, role, email });
  if (profileError) {
    return { error: profileError.message };
  }

  const supabase = await createClient();
  const { data: { user: actorUser } } = await supabase.auth.getUser();
  let actorName = 'Unknown';
  if (actorUser) {
    const { data: actorProfile } = await admin.from('profiles').select('name').eq('id', actorUser.id).single();
    actorName = actorProfile?.name || actorName;
  }
  await logAudit({
    shopId,
    actorId: actorUser?.id ?? null,
    actorName,
    action: 'staff.created',
    entityType: 'profile',
    entityId: authData.user.id,
    diff: { staffName: name, email },
  });

  return { userId: authData.user.id };
}
