/**
 * Database Migration Audit & Alignment Inspector
 * 
 * Inspects Supabase databases (Staging vs. Production) to verify which migrations
 * and schema objects have been applied, and identifies any missing schema additions.
 * 
 * Usage:
 *   node scripts/audit-db-migrations.mjs --env staging
 *   node scripts/audit-db-migrations.mjs --env production
 *   node scripts/audit-db-migrations.mjs --compare
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Parse CLI args
const args = process.argv.slice(2);
const envArgIndex = args.indexOf('--env');
const targetEnv = envArgIndex !== -1 ? args[envArgIndex + 1] : (args.includes('--compare') ? 'compare' : 'staging');

const MIGRATIONS_DIR = path.resolve('supabase/migrations');

// Schema probes representing migration milestones
const SCHEMA_PROBES = [
  { migration: '0001 - 0020', type: 'table', table: 'orders', columns: ['id', 'customer_id', 'stage', 'total_amount'] },
  { migration: '0023_push_subscriptions', type: 'table', table: 'push_subscriptions', columns: ['id', 'user_id', 'endpoint'] },
  { migration: '0030_webhook_idempotency', type: 'table', table: 'payment_webhook_events', columns: ['id', 'event_id'] },
  { migration: '0036_platform_admins', type: 'table', table: 'platform_admins', columns: ['user_id', 'role'] },
  { migration: '0037_affiliates', type: 'table', table: 'affiliates', columns: ['id', 'code'] },
  { migration: '0041_portfolio_outfits', type: 'table', table: 'portfolio_outfits', columns: ['id', 'shop_id'] },
  { migration: '0047_add_customer_fabrics', type: 'column', table: 'customers', columns: ['fabrics'] },
  { migration: '0050_add_calendar_events', type: 'table', table: 'calendar_events', columns: ['id', 'shop_id', 'event_type', 'start_time'] },
  { migration: '0052_calendar_smart_automations', type: 'column', table: 'calendar_events', columns: ['status'] },
  { migration: '0054_create_expenses_table', type: 'table', table: 'expenses', columns: ['id', 'shop_id', 'amount', 'category'] },
  { migration: '0055_create_payments_table', type: 'table', table: 'payments', columns: ['id', 'order_id', 'amount', 'method'] },
  { migration: '0057_rtw_features', type: 'table', table: 'finished_goods', columns: ['id', 'shop_id', 'product_name', 'price'] },
  { migration: '0060_streak_work_days_vacation', type: 'column', table: 'shops', columns: ['work_days', 'vacation_mode', 'xp'] },
  { migration: '0061_gamification_phase2', type: 'column', table: 'shops', columns: ['daily_quests', 'gems'] },
  { migration: '0062_master_tailor_challenge', type: 'column', table: 'shops', columns: ['referral_code', 'buddy_shop_id'] },
  { migration: '0063_add_monthly_revenue_target', type: 'column', table: 'shops', columns: ['monthly_revenue_target'] },
  { migration: '0064_style_catalogues', type: 'table', table: 'style_catalogues', columns: ['id', 'shop_id', 'title'] },
  { migration: '0065_staff_craft_role_and_payroll', type: 'column', table: 'profiles', columns: ['craft_role', 'payroll_type', 'payroll_amount'] },
  { migration: '0066_atelier_notifications', type: 'table', table: 'atelier_notifications', columns: ['id', 'shop_id', 'category', 'tone'] },
  { migration: '0067_entity_slugs_and_bespoke_default', type: 'column', table: 'orders', columns: ['slug'] },
  { migration: '0068_tailor_circle_expansion', type: 'table', table: 'circle_members', columns: ['id', 'shop_id', 'buddy_shop_id', 'status'] },
  { migration: '0069_add_metadata_jsonb', type: 'column', table: 'orders', columns: ['metadata'] },
  { migration: '0070_subscription_pause', type: 'column', table: 'shops', columns: ['subscription_paused_at', 'subscription_pause_ends_at'] },
  { migration: '0071_create_inventory', type: 'table', table: 'inventory', columns: ['id', 'shop_id', 'item_name', 'quantity'] },
  { migration: '0071_order_materials', type: 'table', table: 'order_materials', columns: ['id', 'order_id', 'material_name', 'cost'] },
  { migration: '0072_circle_handshake_requests', type: 'table', table: 'circle_requests', columns: ['id', 'sender_shop_id', 'receiver_shop_id', 'status'] },
  { migration: '0072_shop_circle_discovery', type: 'column', table: 'shops', columns: ['is_circle_discoverable', 'slug'] }
];

function getEnvConfig(envName) {
  const envFile = envName === 'production' ? '.env.production.local' : '.env.development.local';
  const customEnv = {};
  if (fs.existsSync(envFile)) {
    const parsed = dotenv.parse(fs.readFileSync(envFile));
    Object.assign(customEnv, parsed);
  }

  const url = customEnv.NEXT_PUBLIC_SUPABASE_URL || (envName === 'production' ? process.env.PROD_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = customEnv.SUPABASE_SERVICE_ROLE_KEY || (envName === 'production' ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY);

  return { envName, envFile, url, key };
}

async function auditEnvironment(config) {
  console.log(`\n================================================================`);
  console.log(`  AUDITING DATABASE: ${config.envName.toUpperCase()}`);
  console.log(`  URL:  ${config.url || '(Not configured)'}`);
  console.log(`================================================================`);

  if (!config.url || !config.key || config.key.includes('TODO')) {
    console.warn(`[WARN] Missing or incomplete credentials for ${config.envName}.`);
    console.warn(`       Please verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in ${config.envFile}`);
    return null;
  }

  const client = createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const results = [];

  for (const probe of SCHEMA_PROBES) {
    try {
      const selectCols = probe.columns.join(',');
      const { data, error } = await client.from(probe.table).select(selectCols).limit(1);

      if (!error) {
        results.push({ probe, status: 'APPLIED', note: 'All tested columns present' });
      } else {
        const msg = error.message || '';
        if (msg.includes('does not exist') || error.code === '42P01') {
          results.push({ probe, status: 'MISSING_TABLE', note: `Table ${probe.table} does not exist` });
        } else if (msg.includes('column') || error.code === '42703') {
          results.push({ probe, status: 'MISSING_COLUMNS', note: msg });
        } else {
          results.push({ probe, status: 'ERROR', note: msg });
        }
      }
    } catch (err) {
      results.push({ probe, status: 'NETWORK_ERROR', note: err.message });
    }
  }

  // Display results table
  console.log('\nMigration Milestone Status:');
  console.log('---------------------------------------------------------------------------------------');
  console.log(`${'Migration / Feature'.padEnd(38)} | ${'Target Object'.padEnd(25)} | ${'Status'.padEnd(12)}`);
  console.log('---------------------------------------------------------------------------------------');
  for (const r of results) {
    const target = r.probe.type === 'table' ? `Table: ${r.probe.table}` : `${r.probe.table}.${r.probe.columns.join(',')}`;
    console.log(`${r.probe.migration.padEnd(38)} | ${target.padEnd(25)} | ${r.status.padEnd(12)}`);
  }
  console.log('---------------------------------------------------------------------------------------');

  const missing = results.filter(r => r.status.startsWith('MISSING'));
  if (missing.length === 0) {
    console.log(`\n[SUCCESS] All audited migration milestones are FULLY APPLIED in ${config.envName}!`);
  } else {
    console.log(`\n[ATTENTION] Found ${missing.length} unapplied migration milestone(s) in ${config.envName}:`);
    for (const m of missing) {
      console.log(`  - ${m.probe.migration} (${m.note})`);
    }
  }

  return results;
}

async function main() {
  const localMigrations = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${localMigrations.length} local migration files in supabase/migrations/ (from ${localMigrations[0]} to ${localMigrations[localMigrations.length - 1]})`);

  if (targetEnv === 'compare') {
    const stagingConfig = getEnvConfig('staging');
    const prodConfig = getEnvConfig('production');
    await auditEnvironment(stagingConfig);
    await auditEnvironment(prodConfig);
  } else {
    const config = getEnvConfig(targetEnv);
    await auditEnvironment(config);
  }
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
