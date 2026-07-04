'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Runs after a new Owner signs up. Creates their auth account (pre-confirmed,
 * so there's no email-verification step blocking their first login), then
 * the shop they own, then their profile linking the two together.
 *
 * Uses the admin client because a brand-new user has no shop yet, so the
 * normal Row Level Security policies (which check "is this your shop?")
 * have nothing to check against — this is the one place that has to
 * bypass RLS deliberately.
 */
export async function signupOwner(name: string, email: string, password: string, shopName: string) {
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Could not create account');
  }

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({ name: shopName, owner_id: authData.user.id })
    .select()
    .single();
  if (shopError || !shop) {
    throw new Error(shopError?.message || 'Could not create shop');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: authData.user.id, shop_id: shop.id, name, role: 'Owner', email });
  if (profileError) {
    throw new Error(profileError.message);
  }

  return { userId: authData.user.id as string, shopId: shop.id as string };
}

/**
 * Runs when an Owner registers a new staff member from Settings. Same
 * admin-client reasoning as above — the new staff member's account and
 * profile must exist before any RLS policy could apply to them.
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
