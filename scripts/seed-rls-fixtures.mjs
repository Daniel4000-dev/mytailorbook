// One-time (idempotent) fixture setup for the RLS isolation test harness —
// two entirely separate dedicated test tenants (A and B), never real users'
// accounts. tests/rls/isolation.test.ts signs in as each and asserts tenant
// A's authenticated client can never read/write tenant B's rows.
// Run with: node scripts/seed-rls-fixtures.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import WebSocket from 'ws';

if (existsSync('.env.local')) config({ path: '.env.local' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: WebSocket } }
);

const TENANTS = [
  {
    label: 'A',
    email: 'rls-fixture-a@mystitchbook.test',
    password: 'RLS-fixture-pw-a-7h2k9',
    shopName: 'RLS Fixture Shop A',
    ownerName: 'RLS Fixture Owner A',
    customerName: 'RLS Fixture Customer A',
    orderDetails: 'RLS Fixture Gown A',
  },
  {
    label: 'B',
    email: 'rls-fixture-b@mystitchbook.test',
    password: 'RLS-fixture-pw-b-3q8m1',
    shopName: 'RLS Fixture Shop B',
    ownerName: 'RLS Fixture Owner B',
    customerName: 'RLS Fixture Customer B',
    orderDetails: 'RLS Fixture Gown B',
  },
];

async function seedTenant(t) {
  let userId;
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === t.email);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: t.email,
      password: t.password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const { data: existingProfile } = await admin.from('profiles').select('id, shop_id').eq('id', userId).single();
  let shopId;

  if (existingProfile) {
    shopId = existingProfile.shop_id;
  } else {
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .insert({ name: t.shopName, owner_id: userId })
      .select()
      .single();
    if (shopError) throw shopError;
    shopId = shop.id;

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, shop_id: shopId, name: t.ownerName, role: 'Owner', email: t.email });
    if (profileError) throw profileError;
  }

  const { data: existingCustomer } = await admin
    .from('customers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('full_name', t.customerName)
    .maybeSingle();
  let customerId;

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .insert({ shop_id: shopId, full_name: t.customerName, whatsapp_number: '2348000000000', gender: 'female' })
      .select()
      .single();
    if (customerError) throw customerError;
    customerId = customer.id;
  }

  const { data: existingOrder } = await admin
    .from('orders')
    .select('id')
    .eq('shop_id', shopId)
    .eq('order_details', t.orderDetails)
    .maybeSingle();
  let orderId;

  if (existingOrder) {
    orderId = existingOrder.id;
  } else {
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        customer_name: t.customerName,
        order_details: t.orderDetails,
        total_bill: 50000,
        deposit_paid: 20000,
        status: 'Documented',
        priority: 'normal',
        status_history: [{ from: null, to: 'Documented', changedBy: userId, changedByName: t.ownerName, timestamp: new Date().toISOString() }],
      })
      .select()
      .single();
    if (orderError) throw orderError;
    orderId = order.id;
  }

  return { userId, shopId, customerId, orderId };
}

async function main() {
  const [a, b] = await Promise.all(TENANTS.map(seedTenant));

  console.log('\n--- RLS fixtures ready ---');
  console.log('RLS_TENANT_A_EMAIL=' + TENANTS[0].email);
  console.log('RLS_TENANT_A_PASSWORD=' + TENANTS[0].password);
  console.log('RLS_TENANT_A_SHOP_ID=' + a.shopId);
  console.log('RLS_TENANT_A_CUSTOMER_ID=' + a.customerId);
  console.log('RLS_TENANT_A_ORDER_ID=' + a.orderId);
  console.log('RLS_TENANT_B_EMAIL=' + TENANTS[1].email);
  console.log('RLS_TENANT_B_PASSWORD=' + TENANTS[1].password);
  console.log('RLS_TENANT_B_SHOP_ID=' + b.shopId);
  console.log('RLS_TENANT_B_CUSTOMER_ID=' + b.customerId);
  console.log('RLS_TENANT_B_ORDER_ID=' + b.orderId);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
