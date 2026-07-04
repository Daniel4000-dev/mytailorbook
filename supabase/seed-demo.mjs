// One-time utility: copies the app's demo data (1 shop, 3 users, 8 customers,
// 15 orders — the same data that used to live in db.json) into real Supabase
// tables and real Supabase Auth accounts, so the existing demo/walkthrough
// still works once the app is fully wired to Supabase.
//
// Run once with: node --env-file=.env.local supabase/seed-demo.mjs
// Safe to re-run only after wiping the corresponding rows — email uniqueness
// in Supabase Auth will make a second run fail loudly rather than duplicate data.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const db = JSON.parse(readFileSync(new URL('../db.json', import.meta.url)));
const DEMO_PASSWORD = 'password123';

async function main() {
  const userIdMap = {}; // old string uid -> new Supabase auth uuid

  for (const u of db.users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`creating user ${u.email}: ${error.message}`);
    userIdMap[u.uid] = data.user.id;
    console.log(`user ${u.name} -> ${data.user.id}`);
  }

  const shopSeed = db.shops[0];
  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({
      name: shopSeed.name,
      phone: shopSeed.phone,
      address: shopSeed.address,
      owner_id: userIdMap[shopSeed.ownerUid],
    })
    .select()
    .single();
  if (shopError) throw new Error(`creating shop: ${shopError.message}`);
  console.log(`shop ${shop.name} -> ${shop.id}`);

  for (const u of db.users) {
    const { error } = await admin.from('profiles').insert({
      id: userIdMap[u.uid],
      shop_id: shop.id,
      name: u.name,
      role: u.role,
      active: u.active !== false,
    });
    if (error) throw new Error(`creating profile for ${u.name}: ${error.message}`);
  }
  console.log(`${db.users.length} profiles created`);

  const customerIdMap = {}; // old string id -> new uuid
  for (const c of db.customers) {
    const { data, error } = await admin
      .from('customers')
      .insert({
        shop_id: shop.id,
        full_name: c.fullName,
        whatsapp_number: c.whatsappNumber,
        gender: c.gender,
        measurements: c.measurements || null,
      })
      .select()
      .single();
    if (error) throw new Error(`creating customer ${c.fullName}: ${error.message}`);
    customerIdMap[c.id] = data.id;
  }
  console.log(`${db.customers.length} customers created`);

  for (const o of db.orders) {
    const remappedHistory = (o.statusHistory || []).map((h) => ({
      ...h,
      changedBy: userIdMap[h.changedBy] || h.changedBy,
    }));
    const remappedPayments = (o.payments || []).map((p) => ({
      ...p,
      recordedBy: userIdMap[p.recordedBy] || p.recordedBy,
    }));

    const { error } = await admin.from('orders').insert({
      shop_id: shop.id,
      customer_id: customerIdMap[o.customerId],
      customer_name: o.customerName,
      order_details: o.orderDetails,
      total_bill: o.totalBill,
      deposit_paid: o.depositPaid,
      status: o.status,
      assigned_to: o.assignedTo ? userIdMap[o.assignedTo] : null,
      assigned_to_name: o.assignedToName || null,
      due_date: o.dueDate || null,
      priority: o.priority,
      images: o.images || [],
      status_history: remappedHistory,
      payments: remappedPayments,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    });
    if (error) throw new Error(`creating order for ${o.customerName}: ${error.message}`);
  }
  console.log(`${db.orders.length} orders created`);

  console.log('\nDone. Demo logins (all use password: ' + DEMO_PASSWORD + '):');
  for (const u of db.users) console.log(`  ${u.email}  (${u.role})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
