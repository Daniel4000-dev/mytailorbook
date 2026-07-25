// One-time (idempotent) fixture setup for the Playwright smoke suite —
// a dedicated test shop/owner/customer/order, never a real user's account.
// Run with: node scripts/seed-e2e-fixture.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import WebSocket from 'ws';

if (existsSync('.env.local')) config({ path: '.env.local' });

const E2E_EMAIL = 'e2e-fixture@mystitchbook.test';
const E2E_PASSWORD = 'E2E-fixture-pw-9f3k2m';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: WebSocket } }
);

async function main() {
  let userId;
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === E2E_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log('Reusing existing e2e auth user', userId);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created e2e auth user', userId);
  }

  const { data: existingProfile } = await admin.from('profiles').select('id, shop_id').eq('id', userId).single();
  let shopId;

  if (existingProfile) {
    shopId = existingProfile.shop_id;
    console.log('Reusing existing shop', shopId);
  } else {
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .insert({ name: 'E2E Fixture Shop', owner_id: userId })
      .select()
      .single();
    if (shopError) throw shopError;
    shopId = shop.id;

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, shop_id: shopId, name: 'E2E Fixture Owner', role: 'Owner', email: E2E_EMAIL });
    if (profileError) throw profileError;
    console.log('Created shop + profile', shopId);
  }

  const { data: existingCustomer } = await admin
    .from('customers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('full_name', 'E2E Fixture Customer')
    .maybeSingle();
  let customerId;

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .insert({
        shop_id: shopId,
        full_name: 'E2E Fixture Customer',
        whatsapp_number: '2348000000000',
        gender: 'female',
      })
      .select()
      .single();
    if (customerError) throw customerError;
    customerId = customer.id;
  }

  const { data: existingOrder } = await admin
    .from('orders')
    .select('id')
    .eq('shop_id', shopId)
    .eq('order_details', 'E2E Fixture Gown')
    .maybeSingle();
  let orderId;

  if (existingOrder) {
    orderId = existingOrder.id;
    // Reset to a known starting state on every run — the kanban-move test
    // moves this order forward and has no "move back" action to undo it.
    const { error: resetError } = await admin
      .from('orders')
      .update({
        status: 'Documented',
        status_history: [{ from: null, to: 'Documented', changedBy: userId, changedByName: 'E2E Fixture Owner', timestamp: new Date().toISOString() }],
      })
      .eq('id', orderId);
    if (resetError) throw resetError;
  } else {
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        customer_name: 'E2E Fixture Customer',
        order_details: 'E2E Fixture Gown',
        total_bill: 50000,
        deposit_paid: 20000,
        status: 'Documented',
        priority: 'normal',
        status_history: [{ from: null, to: 'Documented', changedBy: userId, changedByName: 'E2E Fixture Owner', timestamp: new Date().toISOString() }],
      })
      .select()
      .single();
    if (orderError) throw orderError;
    orderId = order.id;
  }

  console.log('\n--- Fixture ready ---');
  console.log('E2E_TEST_EMAIL=' + E2E_EMAIL);
  console.log('E2E_TEST_PASSWORD=' + E2E_PASSWORD);
  console.log('E2E_TEST_ORDER_ID=' + orderId);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
