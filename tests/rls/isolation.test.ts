// The go/no-go gate for the future org/branch tenant redesign (Phase 2 of
// the scale roadmap). Signs in as two real, separate, dedicated fixture
// tenants (seeded by scripts/seed-rls-fixtures.mjs — never real users) via
// their own anon-key sessions (not the service-role admin client), then
// asserts tenant A's authenticated client can never read or write tenant
// B's rows. Always runs against the STAGING Supabase project, never
// production — requires the fixtures to already be seeded there and the
// following env vars present (see .env.staging.local): RLS_TENANT_A_*, RLS_TENANT_B_*.
import { beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import WebSocket from 'ws';

// Locally, load staging's keys from .env.staging.local. In CI, that file
// doesn't exist (gitignored) — the same vars arrive as real env vars from
// GitHub Actions secrets instead, so there's nothing to load.
if (existsSync('.env.staging.local')) config({ path: '.env.staging.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL not set — RLS isolation tests must run against staging, not prod.');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const A = {
  email: process.env.RLS_TENANT_A_EMAIL!,
  password: process.env.RLS_TENANT_A_PASSWORD!,
  shopId: process.env.RLS_TENANT_A_SHOP_ID!,
  customerId: process.env.RLS_TENANT_A_CUSTOMER_ID!,
  orderId: process.env.RLS_TENANT_A_ORDER_ID!,
};
const B = {
  email: process.env.RLS_TENANT_B_EMAIL!,
  password: process.env.RLS_TENANT_B_PASSWORD!,
  shopId: process.env.RLS_TENANT_B_SHOP_ID!,
  customerId: process.env.RLS_TENANT_B_CUSTOMER_ID!,
  orderId: process.env.RLS_TENANT_B_ORDER_ID!,
};

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as never },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe('RLS tenant isolation', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  beforeAll(async () => {
    [clientA, clientB] = await Promise.all([
      signedInClient(A.email, A.password),
      signedInClient(B.email, B.password),
    ]);
  });

  it('sanity check: tenant A can see its own shop/customer/order', async () => {
    const { data: shop } = await clientA.from('shops').select('id').eq('id', A.shopId).maybeSingle();
    expect(shop?.id).toBe(A.shopId);

    const { data: customer } = await clientA.from('customers').select('id').eq('id', A.customerId).maybeSingle();
    expect(customer?.id).toBe(A.customerId);

    const { data: order } = await clientA.from('orders').select('id').eq('id', A.orderId).maybeSingle();
    expect(order?.id).toBe(A.orderId);
  });

  it('tenant A cannot read tenant B shop row', async () => {
    const { data } = await clientA.from('shops').select('id').eq('id', B.shopId).maybeSingle();
    expect(data).toBeNull();
  });

  it('tenant A cannot read tenant B customer row', async () => {
    const { data } = await clientA.from('customers').select('id').eq('id', B.customerId).maybeSingle();
    expect(data).toBeNull();
  });

  it('tenant A cannot read tenant B order row', async () => {
    const { data } = await clientA.from('orders').select('id').eq('id', B.orderId).maybeSingle();
    expect(data).toBeNull();
  });

  it('tenant A cannot list any of tenant B rows via unfiltered select', async () => {
    const { data: customers } = await clientA.from('customers').select('id').eq('shop_id', B.shopId);
    expect(customers).toEqual([]);

    const { data: orders } = await clientA.from('orders').select('id').eq('shop_id', B.shopId);
    expect(orders).toEqual([]);
  });

  it('tenant A cannot update tenant B order', async () => {
    const { data, error } = await clientA
      .from('orders')
      .update({ total_bill: 999999 })
      .eq('id', B.orderId)
      .select();

    // RLS silently filters the row out of the update's visibility rather
    // than erroring — either shape is an acceptable "did not succeed", but
    // zero affected rows is the load-bearing assertion.
    expect(data ?? []).toEqual([]);

    const { data: unchanged } = await clientB.from('orders').select('total_bill').eq('id', B.orderId).single();
    expect(unchanged?.total_bill).not.toBe(999999);
    if (error) expect(error).toBeTruthy();
  });

  it('tenant A cannot delete tenant B customer', async () => {
    await clientA.from('customers').delete().eq('id', B.customerId);

    const { data: stillExists } = await clientB
      .from('customers')
      .select('id')
      .eq('id', B.customerId)
      .maybeSingle();
    expect(stillExists?.id).toBe(B.customerId);
  });

  it('tenant A cannot insert an order into tenant B shop', async () => {
    const { error } = await clientA.from('orders').insert({
      shop_id: B.shopId,
      customer_id: B.customerId,
      customer_name: 'Cross-tenant injection attempt',
      order_details: 'Should be rejected by RLS',
      total_bill: 1000,
      deposit_paid: 0,
      status: 'Documented',
      priority: 'normal',
      status_history: [],
    });
    expect(error).toBeTruthy();
  });
});
