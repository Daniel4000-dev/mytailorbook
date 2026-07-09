import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '../../.env.staging.local') });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export interface E2ETenant {
  ownerUid: string;
  ownerEmail: string;
  password: string;
  shopId: string;
  customerId: string;
}

const PASSWORD = 'e2e-smoke-test-pw-123';

export async function seedTenant(label: string): Promise<E2ETenant> {
  const email = `e2e-${label}-${Date.now()}@mytailorbook.test`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authError || !authData.user) throw new Error(`Failed to create e2e test user: ${authError?.message}`);
  const ownerUid = authData.user.id;

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({ name: `E2E Test Shop ${label}`, owner_id: ownerUid })
    .select()
    .single();
  if (shopError || !shop) throw new Error(`Failed to create e2e test shop: ${shopError?.message}`);

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: ownerUid, name: `E2E Owner ${label}`, email, role: 'Owner', shop_id: shop.id });
  if (profileError) throw new Error(`Failed to create e2e test profile: ${profileError.message}`);

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .insert({ shop_id: shop.id, full_name: `E2E Customer ${label}`, whatsapp_number: '2348000000001', gender: 'male' })
    .select()
    .single();
  if (customerError || !customer) throw new Error(`Failed to create e2e test customer: ${customerError?.message}`);

  return { ownerUid, ownerEmail: email, password: PASSWORD, shopId: shop.id, customerId: customer.id };
}

export async function cleanupTenant(tenant: E2ETenant) {
  await admin.from('orders').delete().eq('shop_id', tenant.shopId);
  await admin.from('customers').delete().eq('shop_id', tenant.shopId);
  await admin.from('profiles').delete().eq('id', tenant.ownerUid);
  await admin.from('shops').delete().eq('id', tenant.shopId);
  await admin.auth.admin.deleteUser(tenant.ownerUid);
}
