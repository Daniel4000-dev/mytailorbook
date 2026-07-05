'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Runs the first time someone signs in with Google — since OAuth gives us
 * no form to collect a shop name before the auth account exists, we let
 * Supabase create the (profile-less) account first, then complete the
 * bootstrap here once they tell us their shop's name.
 *
 * Uses the request-scoped server client to confirm who's actually calling
 * (never trust a client-supplied user id for this), then the admin client
 * to do the actual insert — same bootstrap reasoning as new-shop signup.
 */
export async function completeGoogleOnboarding(name: string, shopName: string) {
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
    .insert({ id: user.id, shop_id: shop.id, name, role: 'Owner', email: user.email });
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
export async function createStaffAccount(shopId: string, name: string, email: string, tempPassword: string) {
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Could not create staff account');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: authData.user.id, shop_id: shopId, name, role: 'Staff', email });
  if (profileError) {
    throw new Error(profileError.message);
  }

  return { userId: authData.user.id as string };
}
