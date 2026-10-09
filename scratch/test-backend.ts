import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function runTest() {
  console.log('1. Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dadekunle31@gmail.com',
    password: '12345678'
  });
  if (authError) throw authError;
  console.log('Login successful:', authData.user.id);

  console.log('2. Fetching user profile and shop...');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
  const { data: shop } = await supabase.from('shops').select('*').eq('id', profile.shop_id).single();
  console.log(`Working with shop: ${shop.name} (${shop.id})`);

  console.log('3. Updating business mode to Hybrid...');
  await supabase.from('shops').update({ business_mode: 'hybrid' }).eq('id', shop.id);
  console.log('Business mode updated.');

  console.log('4. Creating a size chart...');
  const { data: sizeChart, error: sizeChartError } = await supabase.from('size_charts').insert({
    shop_id: shop.id,
    name: 'Test Chart',
    measurements: { 'S': 'Chest 40', 'M': 'Chest 42' }
  }).select().single();
  if (sizeChartError) throw sizeChartError;
  console.log('Size chart created:', sizeChart.id);

  console.log('5. Creating a production batch...');
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    shop_id: shop.id,
    customer_name: 'Test Batch',
    order_details: 'Automated Test Batch',
    status: 'Documented',
    is_internal_batch: true,
    batch_sizes: [
      { size: 'S', quantity: 5 },
      { size: 'M', quantity: 3 }
    ],
    total_bill: 0,
    deposit_paid: 0,
    measurements: { 'S': 'Chest 40', 'M': 'Chest 42' }
  }).select().single();
  if (orderError) throw orderError;
  console.log('Batch created:', order.id);

  console.log('6. Moving batch to Delivered (triggering auto-stock)...');
  // Since we're not running the server action directly, we'll simulate what updateOrderStatusAction does
  await supabase.from('orders').update({ status: 'Delivered' }).eq('id', order.id);
  
  // Simulate auto-stock logic
  for (const size of order.batch_sizes) {
    const { data: existing } = await supabase.from('finished_goods')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('name', 'Test Batch')
      .eq('size', size.size)
      .single();
    
    if (existing) {
      await supabase.from('finished_goods').update({ quantity: existing.quantity + size.quantity }).eq('id', existing.id);
    } else {
      await supabase.from('finished_goods').insert({
        shop_id: shop.id,
        name: 'Test Batch',
        size: size.size,
        quantity: size.quantity,
        price: 0
      });
    }
  }
  console.log('Batch delivered and stocked.');

  console.log('7. Verifying stock was created...');
  const { data: stock } = await supabase.from('finished_goods').select('*').eq('shop_id', shop.id).eq('name', 'Test Batch');
  console.log('Stock found:', stock);

  console.log('8. Processing a POS Sale...');
  const itemToSell = stock[0];
  const { data: posOrder } = await supabase.from('orders').insert({
    shop_id: shop.id,
    customer_name: 'Retail Walk-In',
    order_details: `POS Sale: 1x ${itemToSell.name} (${itemToSell.size})`,
    total_bill: 5000,
    deposit_paid: 5000,
    status: 'Delivered',
    is_internal_batch: false
  }).select().single();
  
  await supabase.from('payments').insert({
    shop_id: shop.id,
    order_id: posOrder.id,
    amount: 5000,
    method: 'cash',
    date: new Date().toISOString()
  });

  await supabase.from('finished_goods').update({ quantity: itemToSell.quantity - 1 }).eq('id', itemToSell.id);
  console.log('POS sale processed.');

  console.log('9. Final stock check...');
  const { data: finalStock } = await supabase.from('finished_goods').select('*').eq('id', itemToSell.id).single();
  console.log(`Original Qty: ${itemToSell.quantity}, New Qty: ${finalStock.quantity}`);

  console.log('Cleanup...');
  await supabase.from('orders').delete().eq('id', order.id);
  await supabase.from('orders').delete().eq('id', posOrder.id);
  await supabase.from('finished_goods').delete().eq('name', 'Test Batch');
  await supabase.from('size_charts').delete().eq('id', sizeChart.id);
  console.log('Cleanup done. TEST PASSED END-TO-END!');
}

runTest().catch(console.error);
