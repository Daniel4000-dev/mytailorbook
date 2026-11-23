import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function run() {
  const { data: shops } = await supabase.from('shops').select('id, org_id').order('created_at', { ascending: false }).limit(1)
  console.log('Shops:', shops)

  if (shops && shops.length > 0) {
    const shopId = shops[0].id
    const orgId = shops[0].org_id
    console.log(`Testing getShopBundle for shop: ${shopId}, org: ${orgId}`)

    const res = await Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('customers').select('*').eq('org_id', orgId),
      supabase.from('orders').select('*').eq('shop_id', shopId),
      supabase.from('profiles').select('*').eq('shop_id', shopId),
      supabase.from('shop_exceptions').select('*').eq('shop_id', shopId),
      supabase.from('inventory').select('*').eq('shop_id', shopId)
    ])
    
    res.forEach((r, i) => {
      if (r.error) console.error(`Query ${i} failed:`, r.error)
    })
    console.log('Done testing queries.')
  }
}
run()
