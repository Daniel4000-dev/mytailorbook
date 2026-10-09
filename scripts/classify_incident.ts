import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables. Do NOT execute writes.
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== PHASE 2: READ-ONLY INCIDENT CLASSIFICATION ===");
  console.log("Connecting to:", supabaseUrl);
  
  // Prompt input (mocked here for demonstration)
  const incidentStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // roughly last 30 days
  const incidentEnd = new Date().toISOString();

  console.log(`Scanning for trial_converted events between ${incidentStart} and ${incidentEnd}`);

  const { data: events, error: eventError } = await admin
    .from('subscription_events')
    .select('*')
    .eq('event_type', 'trial_converted')
    .gte('created_at', incidentStart)
    .lte('created_at', incidentEnd);

  if (eventError) {
    console.error("Failed to fetch events:", eventError);
    return;
  }

  console.log(`Found ${events?.length || 0} potentially affected shop events.\n`);

  for (const event of events || []) {
    const shopId = event.shop_id;
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .select('id, subscription_status, paystack_customer_code, paystack_subscription_code')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      console.log(`[SHOP ${shopId}] Could not fetch shop info.`);
      continue;
    }

    let needsManualReview = false;
    let reason = '';
    let customerEnv = 'Unknown';
    let subEnv = 'Unknown';

    // Heuristics based on Paystack format (usually CUS_... and SUB_...)
    if (!shop.paystack_customer_code) {
      reason += 'Missing customer code. ';
      needsManualReview = true;
    }

    if (!shop.paystack_subscription_code) {
      reason += 'Missing subscription code. ';
      needsManualReview = true;
    }

    console.log("-------------------------------------------------");
    console.log(`shop_id: ${shop.id}`);
    console.log(`incident timestamp: ${event.created_at}`);
    console.log(`subscription status: ${shop.subscription_status}`);
    console.log(`customer environment classification: ${customerEnv}`);
    console.log(`subscription environment classification: ${subEnv}`);
    console.log(`needs_manual_review: ${needsManualReview}`);
    console.log(`reason: ${reason || 'Clear'}`);
  }

  console.log("=================================================");
  console.log("To classify environments accurately, you must pass the codes to both");
  console.log("Paystack Live and Test GET /customer/:id and GET /subscription/:id");
  console.log("endpoints. This script reads DB state but makes NO Paystack queries.");
}

run().catch(console.error);
