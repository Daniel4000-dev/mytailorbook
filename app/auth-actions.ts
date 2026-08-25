'use server';

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { isOrgPremium } from '@/lib/subscription';
import { isOwnerLikeRole } from '@/lib/types';

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

  await attributeReferral(admin, shop.org_id);
}

/**
 * Best-effort affiliate attribution, kept out of the shop/profile insert
 * above deliberately: `organizations` is created implicitly by the
 * `shops_auto_create_org()` trigger (see
 * supabase/migrations/0020_org_branch_tenant_redesign.sql), not an
 * explicit insert this function controls, so the referral code can only
 * be attached as a follow-up update once `shop.org_id` comes back. Never
 * throws — a missing/invalid ref code should never block onboarding.
 */
async function attributeReferral(admin: ReturnType<typeof createAdminClient>, orgId: string) {
  const ref = (await cookies()).get('mtb_ref')?.value;
  if (!ref) return;

  const { data: affiliate } = await admin
    .from('affiliates')
    .select('id')
    .eq('code', ref)
    .eq('active', true)
    .maybeSingle();

  await admin
    .from('organizations')
    .update({ referred_by_affiliate_id: affiliate?.id ?? null, referral_code_raw: ref })
    .eq('id', orgId);
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
  // This function had no caller-authorization check at all — only the admin
  // bypass above, which is about RLS on the *insert* having nothing to
  // check against, not about who's allowed to call this in the first
  // place. Any caller could previously invoke this Server Action directly
  // (it's just a POST endpoint; the client only hiding the "Add staff" UI
  // from non-owners is not a security boundary) with an arbitrary shopId
  // and role, creating an account with attacker-chosen credentials inside
  // any org — including 'Accountant', which has financial-report access.
  // Mirrors the same auth + org-membership pattern every other
  // Owner-gated mutation in this codebase already uses (e.g.
  // addBranchAction in app/actions.ts).
  if (!(['Staff', 'BranchManager', 'Accountant'] as const).includes(role)) {
    return { error: 'Invalid role' };
  }

  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: 'Not authenticated' };

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', caller.id)
    .single();
  if (!callerProfile || !isOwnerLikeRole(callerProfile.role)) {
    return { error: 'Only the Owner can add staff' };
  }

  const admin = createAdminClient();

  const { data: targetShop } = await admin
    .from('shops')
    .select('org_id')
    .eq('id', shopId)
    .single();
  if (!targetShop || targetShop.org_id !== callerProfile.org_id) {
    return { error: 'Only the Owner can add staff' };
  }

  const premium = await isOrgPremium(admin, shopId);
  if (!premium) {
    return { error: 'Adding staff requires a premium subscription. Upgrade from Settings to add team members.' };
  }

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

  const { data: actorProfile } = await admin.from('profiles').select('name').eq('id', caller.id).single();
  await logAudit({
    shopId,
    actorId: caller.id,
    actorName: actorProfile?.name || 'Unknown',
    action: 'staff.created',
    entityType: 'profile',
    entityId: authData.user.id,
    diff: { staffName: name, email },
  });

  return { userId: authData.user.id };
}
