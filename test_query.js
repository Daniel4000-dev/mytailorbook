const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  const c1 = await supabase.from('customers').select('id, organizations!inner(owner_id)', { count: 'exact', head: true }).not('organizations.owner_id', 'is', null);
  console.log('Customers count:', c1.count, c1.error);
  
  const c2 = await supabase.from('orders').select('id, shops!inner(owner_id)', { count: 'exact', head: true }).not('shops.owner_id', 'is', null);
  console.log('Orders count:', c2.count, c2.error);
  
  const c3 = await supabase.from('organizations').select('id', { count: 'exact', head: true }).not('owner_id', 'is', null);
  console.log('Organizations count:', c3.count, c3.error);
}

testQueries();
