import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import WebSocket from 'ws';

if (existsSync('.env.development.local')) config({ path: '.env.development.local' });
if (existsSync('.env.local')) config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing URL or service key');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

const TARGET_SHOP_ID = '6bd33796-2464-43f9-b140-8f9af54e0699';
const TARGET_ORG_ID = 'c8d30370-75ab-43d5-8c3b-fafaf098ebb2';

async function seed() {
  console.log('Seeding rich Stitch Wrap data for shop:', TARGET_SHOP_ID);

  // 1. Seed or find customers
  const customerNames = [
    { name: 'Chief Babatunde Adeleke', phone: '+2348031112233', gender: 'male' },
    { name: 'Alhaja Folashade Alakija', phone: '+2348032223344', gender: 'female' },
    { name: 'Senator Musa YarAdua', phone: '+2348033334455', gender: 'male' },
    { name: 'Dr. Emeka Okonkwo', phone: '+2348034445566', gender: 'male' },
    { name: 'Engr. Kunle Ogundipe', phone: '+2348035556677', gender: 'male' },
    { name: 'Mrs. Chioma Eze', phone: '+2348036667788', gender: 'female' },
    { name: 'Prince Dapo Abiodun', phone: '+2348037778899', gender: 'male' },
    { name: 'Pastor Segun Awolowo', phone: '+2348038889900', gender: 'male' },
  ];

  const createdCustomers = [];
  for (const c of customerNames) {
    const { data: existing } = await admin
      .from('customers')
      .select('id, full_name')
      .eq('shop_id', TARGET_SHOP_ID)
      .eq('full_name', c.name)
      .maybeSingle();

    if (existing) {
      createdCustomers.push(existing);
    } else {
      const { data: inserted, error } = await admin
        .from('customers')
        .insert({
          shop_id: TARGET_SHOP_ID,
          org_id: TARGET_ORG_ID,
          full_name: c.name,
          whatsapp_number: c.phone,
          gender: c.gender,
          created_at: '2026-10-12T10:00:00.000Z',
        })
        .select('id, full_name')
        .single();
      if (inserted) createdCustomers.push(inserted);
      else console.error('Error inserting customer:', error);
    }
  }

  console.log(`Verified ${createdCustomers.length} clients.`);

  // 2. Orders across October, November, December 2026
  const ordersToSeed = [
    // Chief Babatunde (VIP client: 5 bespoke pieces)
    {
      customerName: 'Chief Babatunde Adeleke',
      styleName: 'Royal Agbada & Fila Set',
      details: 'Hand-embroidered Aso-Oke Agbada 3-piece with matching fila and buba.',
      totalBill: 250000,
      depositPaid: 250000,
      status: 'Delivered',
      created_at: '2026-10-15T14:20:00.000Z',
      due_date: '2026-10-22T18:00:00.000Z',
    },
    {
      customerName: 'Chief Babatunde Adeleke',
      styleName: 'Senator 2-Piece Suit',
      details: 'Navy blue wool-blend Senator suit with geometric chest embroidery.',
      totalBill: 120000,
      depositPaid: 120000,
      status: 'Delivered',
      created_at: '2026-10-28T09:15:00.000Z',
      due_date: '2026-11-04T17:00:00.000Z',
    },
    {
      customerName: 'Chief Babatunde Adeleke',
      styleName: 'Royal Agbada & Fila Set',
      details: 'Ivory damask wedding guest Agbada with golden filigree threadwork.',
      totalBill: 280000,
      depositPaid: 280000,
      status: 'Delivered',
      created_at: '2026-11-12T11:00:00.000Z',
      due_date: '2026-11-19T18:00:00.000Z',
    },
    {
      customerName: 'Chief Babatunde Adeleke',
      styleName: 'Bespoke Kaftan Set',
      details: 'Egyptian cotton Kaftan in deep emerald green.',
      totalBill: 95000,
      depositPaid: 95000,
      status: 'Delivered',
      created_at: '2026-11-25T16:40:00.000Z',
      due_date: '2026-12-02T18:00:00.000Z',
    },
    {
      customerName: 'Chief Babatunde Adeleke',
      styleName: 'Royal Agbada & Fila Set',
      details: 'New Year celebration burgundy jacquard Agbada.',
      totalBill: 260000,
      depositPaid: 260000,
      status: 'Ready',
      created_at: '2026-12-08T10:30:00.000Z',
      due_date: '2026-12-18T18:00:00.000Z',
    },

    // Senator Musa YarAdua
    {
      customerName: 'Senator Musa YarAdua',
      styleName: 'Senator 2-Piece Suit',
      details: 'White Atiku cotton 2-piece set with custom cuff detailing.',
      totalBill: 140000,
      depositPaid: 140000,
      status: 'Delivered',
      created_at: '2026-10-20T11:00:00.000Z',
      due_date: '2026-10-27T18:00:00.000Z',
    },
    {
      customerName: 'Senator Musa YarAdua',
      styleName: 'Bespoke Kaftan Set',
      details: 'Charcoal grey Guinea brocade Kaftan with mandarin collar.',
      totalBill: 110000,
      depositPaid: 110000,
      status: 'Delivered',
      created_at: '2026-11-18T14:00:00.000Z',
      due_date: '2026-11-25T18:00:00.000Z',
    },

    // Dr. Emeka Okonkwo
    {
      customerName: 'Dr. Emeka Okonkwo',
      styleName: 'Bespoke 3-Piece Suit',
      details: 'Midnight blue Italian wool suit, notched lapel with satin piping.',
      totalBill: 220000,
      depositPaid: 220000,
      status: 'Delivered',
      created_at: '2026-10-24T15:30:00.000Z',
      due_date: '2026-11-02T17:00:00.000Z',
    },
    {
      customerName: 'Dr. Emeka Okonkwo',
      styleName: 'Tailored Blazer',
      details: 'Burgundy velvet evening dinner jacket.',
      totalBill: 160000,
      depositPaid: 160000,
      status: 'Delivered',
      created_at: '2026-11-20T12:00:00.000Z',
      due_date: '2026-11-28T18:00:00.000Z',
    },

    // Alhaja Folashade Alakija
    {
      customerName: 'Alhaja Folashade Alakija',
      styleName: 'Grand Boubou Kaftan',
      details: 'Gold silk Swiss voile boubou with stone embellishments.',
      totalBill: 195000,
      depositPaid: 195000,
      status: 'Delivered',
      created_at: '2026-11-05T10:00:00.000Z',
      due_date: '2026-11-14T18:00:00.000Z',
    },
    {
      customerName: 'Alhaja Folashade Alakija',
      styleName: 'Grand Boubou Kaftan',
      details: 'Purple velvet iro and buba with beaded neckline.',
      totalBill: 210000,
      depositPaid: 210000,
      status: 'Delivered',
      created_at: '2026-12-01T14:00:00.000Z',
      due_date: '2026-12-10T18:00:00.000Z',
    },

    // Engr. Kunle Ogundipe
    {
      customerName: 'Engr. Kunle Ogundipe',
      styleName: 'Senator 2-Piece Suit',
      details: 'Olive green cashmere Senator set.',
      totalBill: 115000,
      depositPaid: 115000,
      status: 'Delivered',
      created_at: '2026-11-15T09:00:00.000Z',
      due_date: '2026-11-22T17:00:00.000Z',
    },

    // Mrs. Chioma Eze
    {
      customerName: 'Mrs. Chioma Eze',
      styleName: 'Corset Evening Gown',
      details: 'Emerald green structured corset gown with slit.',
      totalBill: 185000,
      depositPaid: 185000,
      status: 'Delivered',
      created_at: '2026-11-22T13:00:00.000Z',
      due_date: '2026-12-01T18:00:00.000Z',
    },

    // Prince Dapo Abiodun
    {
      customerName: 'Prince Dapo Abiodun',
      styleName: 'Royal Agbada & Fila Set',
      details: 'Royal blue guinea brocade with tonal chain stitch embroidery.',
      totalBill: 240000,
      depositPaid: 240000,
      status: 'Delivered',
      created_at: '2026-11-28T11:00:00.000Z',
      due_date: '2026-12-06T18:00:00.000Z',
    },

    // Pastor Segun Awolowo
    {
      customerName: 'Pastor Segun Awolowo',
      styleName: 'Senator 2-Piece Suit',
      details: 'All-white Italian crepe Senator outfit.',
      totalBill: 130000,
      depositPaid: 130000,
      status: 'Delivered',
      created_at: '2026-12-05T15:00:00.000Z',
      due_date: '2026-12-14T18:00:00.000Z',
    },
  ];

  let insertedCount = 0;
  for (const o of ordersToSeed) {
    const cust = createdCustomers.find((c) => c.full_name === o.customerName);
    const { data: existing } = await admin
      .from('orders')
      .select('id')
      .eq('shop_id', TARGET_SHOP_ID)
      .eq('customer_name', o.customerName)
      .eq('style_name', o.styleName)
      .eq('created_at', o.created_at)
      .maybeSingle();

    if (!existing) {
      const { error } = await admin.from('orders').insert({
        shop_id: TARGET_SHOP_ID,
        customer_id: cust?.id || null,
        customer_name: o.customerName,
        style_name: o.styleName,
        order_details: o.details,
        total_bill: o.totalBill,
        deposit_paid: o.depositPaid,
        status: o.status,
        priority: 'normal',
        created_at: o.created_at,
        due_date: o.due_date,
        status_history: [
          { from: null, to: 'Documented', timestamp: o.created_at, changedBy: 'owner', changedByName: 'Master Tailor' },
          { from: 'Documented', to: 'Cutting', timestamp: o.created_at, changedBy: 'owner', changedByName: 'Master Tailor' },
          { from: 'Cutting', to: 'Sewing', timestamp: o.created_at, changedBy: 'owner', changedByName: 'Master Tailor' },
          { from: 'Sewing', to: o.status, timestamp: o.due_date, changedBy: 'owner', changedByName: 'Master Tailor' },
        ],
      });
      if (error) console.error('Error creating order:', error);
      else insertedCount++;
    }
  }

  console.log(`Seeded ${insertedCount} bespoke garment orders.`);

  // 3. Update workshop streak metrics for impressive display
  const { error: shopUpdateErr } = await admin
    .from('shops')
    .update({
      streak_current: 24,
      streak_best: 28,
      streak_last_counted_at: new Date().toISOString(),
    })
    .eq('id', TARGET_SHOP_ID);

  if (shopUpdateErr) {
    console.error('Error updating shop streak:', shopUpdateErr);
  } else {
    console.log('Updated workshop streak to 24 current / 28 best.');
  }

  console.log('✅ Stitch Wrap test data successfully seeded for dadekunle31@gmail.com!');
}

seed();
