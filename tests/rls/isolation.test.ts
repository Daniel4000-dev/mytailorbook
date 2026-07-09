import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Proves Row Level Security actually enforces tenant isolation — the one
 * thing this whole app's multi-tenant model depends on. This is the gate
 * that must pass before AND after the Organization/Branch tenant redesign
 * (Phase 2): if it ever goes red, current_shop_id()/RLS policies have a
 * cross-tenant leak, which is the worst possible bug this app can ship.
 *
 * Runs against the real staging Supabase project (see tests/rls/setup.ts) —
 * RLS cannot be meaningfully unit-tested/mocked, it has to be proven against
 * real Postgres.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface Tenant {
  ownerUid: string;
  ownerEmail: string;
  shopId: string;
  customerId: string;
  orderId: string;
  client: SupabaseClient;
}

const PASSWORD = 'rls-isolation-test-pw-123';
let tenantA: Tenant;
let tenantB: Tenant;

async function seedTenant(label: string): Promise<Tenant> {
  const email = `rls-test-${label}-${Date.now()}@mytailorbook.test`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authError || !authData.user) throw new Error(`Failed to create test user: ${authError?.message}`);
  const ownerUid = authData.user.id;

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({ name: `RLS Test Shop ${label}`, owner_id: ownerUid })
    .select()
    .single();
  if (shopError || !shop) throw new Error(`Failed to create test shop: ${shopError?.message}`);

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: ownerUid, name: `RLS Owner ${label}`, email, role: 'Owner', shop_id: shop.id });
  if (profileError) throw new Error(`Failed to create test profile: ${profileError.message}`);

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .insert({ shop_id: shop.id, full_name: `RLS Customer ${label}`, whatsapp_number: '2348000000000', gender: 'male' })
    .select()
    .single();
  if (customerError || !customer) throw new Error(`Failed to create test customer: ${customerError?.message}`);

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      shop_id: shop.id,
      customer_id: customer.id,
      customer_name: customer.full_name,
      order_details: `RLS test order ${label}`,
      total_bill: 10000,
      deposit_paid: 0,
      status: 'Documented',
      priority: 'normal',
      images: [],
      status_history: [],
    })
    .select()
    .single();
  if (orderError || !order) throw new Error(`Failed to create test order: ${orderError?.message}`);

  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`Failed to sign in test owner: ${signInError.message}`);

  return { ownerUid, ownerEmail: email, shopId: shop.id, customerId: customer.id, orderId: order.id, client };
}

async function cleanupTenant(tenant: Tenant) {
  await admin.from('orders').delete().eq('shop_id', tenant.shopId);
  await admin.from('customers').delete().eq('shop_id', tenant.shopId);
  await admin.from('profiles').delete().eq('id', tenant.ownerUid);
  await admin.from('shops').delete().eq('id', tenant.shopId);
  await admin.auth.admin.deleteUser(tenant.ownerUid);
}

beforeAll(async () => {
  [tenantA, tenantB] = await Promise.all([seedTenant('A'), seedTenant('B')]);
}, 30000);

afterAll(async () => {
  await Promise.all([cleanupTenant(tenantA), cleanupTenant(tenantB)]);
});

describe('RLS tenant isolation', () => {
  it('a tenant only ever sees its own customers, never another tenant\'s', async () => {
    const { data, error } = await tenantA.client.from('customers').select('*');
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.every((c) => c.shop_id === tenantA.shopId)).toBe(true);
    expect(data!.some((c) => c.id === tenantB.customerId)).toBe(false);
  });

  it('a tenant only ever sees its own orders, never another tenant\'s', async () => {
    const { data, error } = await tenantA.client.from('orders').select('*');
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.every((o) => o.shop_id === tenantA.shopId)).toBe(true);
    expect(data!.some((o) => o.id === tenantB.orderId)).toBe(false);
  });

  it('directly querying another tenant\'s customer by id returns nothing, not an error leak', async () => {
    const { data, error } = await tenantA.client.from('customers').select('*').eq('id', tenantB.customerId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('directly querying another tenant\'s order by id returns nothing', async () => {
    const { data, error } = await tenantA.client.from('orders').select('*').eq('id', tenantB.orderId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('cannot insert a customer scoped to another tenant\'s shop_id', async () => {
    const { error } = await tenantA.client
      .from('customers')
      .insert({ shop_id: tenantB.shopId, full_name: 'Injected Customer', whatsapp_number: '2348011111111', gender: 'male' });
    expect(error).not.toBeNull();
  });

  it('cannot update another tenant\'s order', async () => {
    const { data, error } = await tenantA.client
      .from('orders')
      .update({ status: 'Completed' })
      .eq('id', tenantB.orderId)
      .select();
    // RLS silently filters the row rather than erroring — the meaningful
    // assertion is that nothing was actually changed.
    expect(data).toEqual([]);
    const { data: check } = await admin.from('orders').select('status').eq('id', tenantB.orderId).single();
    expect(check?.status).toBe('Documented');
    expect(error).toBeNull();
  });

  it('cannot delete another tenant\'s customer', async () => {
    const { data } = await tenantA.client.from('customers').delete().eq('id', tenantB.customerId).select();
    expect(data).toEqual([]);
    const { data: check } = await admin.from('customers').select('id').eq('id', tenantB.customerId).single();
    expect(check?.id).toBe(tenantB.customerId);
  });

  it('the reverse also holds — tenant B cannot see tenant A\'s data', async () => {
    const { data } = await tenantB.client.from('customers').select('*');
    expect(data!.some((c) => c.id === tenantA.customerId)).toBe(false);
  });
});
