/**
 * Production Styles Audit & Data Extraction Script (with Recency & Dormancy)
 * 
 * Inspects orders and style usage across the database:
 * - Checks when each style was LAST USED (date, time, and days ago).
 * - Classifies styles by recency:
 *     - Active: Ordered within last 30 days
 *     - Warm: Ordered 31-60 days ago
 *     - Dormant: Not ordered in >60 days
 *     - Dead: Never ordered (0 data)
 * - Captures the EXACT ACCOUNTS / SHOPS that used each style.
 * - Outputs formatted tables to console and writes 2 CSV reports:
 *     1. styles_audit_report.csv (Summary per style with recency, dormancy & accounts)
 *     2. styles_by_account_report.csv (Detailed drilldown per account & style)
 * 
 * Usage:
 *   node scripts/export_styles_audit.mjs
 *   node scripts/export_styles_audit.mjs --env staging
 *   node scripts/export_styles_audit.mjs --env production
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

const STANDARD_PRESETS = [
  // Male
  { name: 'Agbada', gender: 'Male', subtitle: 'Traditional 3-piece set' },
  { name: 'Senator', gender: 'Male', subtitle: 'Modern native' },
  { name: 'Kaftan', gender: 'Male', subtitle: '2-piece suit' },
  { name: 'Ankara Shirt', gender: 'Male', subtitle: 'Casual print shirt' },
  { name: 'Danshiki', gender: 'Male', subtitle: 'Casual native top' },
  { name: 'Two-Piece Suit', gender: 'Male', subtitle: 'Bespoke suiting' },
  { name: 'Babariga', gender: 'Male', subtitle: 'Grand embroidered robe' },
  { name: 'Isi Agu', gender: 'Male', subtitle: 'Chieftaincy/cultural wear' },
  { name: 'Aso Ebi (Men)', gender: 'Male', subtitle: 'Matching event wear' },
  { name: 'Two-Piece (Men)', gender: 'Male', subtitle: 'Matching top and trousers' },

  // Female
  { name: 'Ankara Gown', gender: 'Female', subtitle: "Women's tailored gown" },
  { name: 'Buba & Iro', gender: 'Female', subtitle: "Traditional women's wear" },
  { name: 'Boubou', gender: 'Female', subtitle: 'Flowing formal gown' },
  { name: 'Skirt & Blouse', gender: 'Female', subtitle: 'Office/native combo' },
  { name: 'Aso Ebi Gown', gender: 'Female', subtitle: 'Event/ceremony dress' },
  { name: 'Jumpsuit', gender: 'Female', subtitle: 'Modern tailored piece' },
  { name: 'Kaftan (Women)', gender: 'Female', subtitle: 'Relaxed flowing gown' },
  { name: 'Senator (Women)', gender: 'Female', subtitle: 'Fitted native 2-piece' },
  { name: 'Peplum & Wrapper', gender: 'Female', subtitle: 'Fitted top, wrapper skirt' },
  { name: 'Two-Piece (Women)', gender: 'Female', subtitle: 'Matching top and trousers' },
  { name: 'Gathers Dress', gender: 'Female', subtitle: 'Flared gathered dress' },
];

const args = process.argv.slice(2);
const envArgIndex = args.indexOf('--env');
const targetEnv = envArgIndex !== -1 ? args[envArgIndex + 1] : 'production';

function getEnvConfig(envName) {
  const envFile = envName === 'staging' ? '.env.development.local' : '.env.production.local';
  const customEnv = {};
  if (fs.existsSync(envFile)) {
    const parsed = dotenv.parse(fs.readFileSync(envFile));
    Object.assign(customEnv, parsed);
  }

  const url = customEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = customEnv.SUPABASE_SERVICE_ROLE_KEY || customEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { envName, envFile, url, key };
}

function calculateDormancy(lastDateStr, now = new Date()) {
  if (!lastDateStr) {
    return { daysAgo: null, statusTier: 'Dead (0 Data)', label: 'Never' };
  }
  const last = new Date(lastDateStr);
  const diffTime = Math.abs(now - last);
  const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let statusTier = 'Active (<30d)';
  if (daysAgo > 60) {
    statusTier = 'Dormant (>60d)';
  } else if (daysAgo > 30) {
    statusTier = 'Warm (30-60d)';
  }

  const label = daysAgo === 0 ? 'Today' : `${daysAgo}d ago`;
  return { daysAgo, statusTier, label };
}

async function runAudit() {
  const config = getEnvConfig(targetEnv);
  console.log('================================================================');
  console.log(`MYSTITCHBOOK STYLES RECENCY & DORMANCY AUDIT (${config.envName.toUpperCase()})`);
  console.log(`Config source: ${config.envFile}`);
  console.log('================================================================\n');

  if (!config.url || !config.key) {
    console.error(`Error: Supabase URL or Key not found in ${config.envFile}`);
    process.exit(1);
  }

  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  });

  // 1. Fetch shops (accounts)
  console.log('Fetching accounts / shops and profiles...');
  const { data: shops } = await supabase.from('shops').select('id, name, phone, owner_id');
  const shopMap = new Map();
  if (shops) {
    for (const s of shops) {
      shopMap.set(s.id, {
        id: s.id,
        name: s.name || 'Unnamed Shop',
        phone: s.phone || 'N/A',
        ownerName: 'N/A',
        ownerEmail: 'N/A',
      });
    }
  }

  // 2. Fetch profiles
  const { data: profiles } = await supabase.from('profiles').select('id, name, shop_id, role');
  if (profiles) {
    for (const p of profiles) {
      if (p.shop_id && shopMap.has(p.shop_id)) {
        const item = shopMap.get(p.shop_id);
        if (p.role === 'Owner' || p.role === 'OrgAdmin' || item.ownerName === 'N/A') {
          item.ownerName = p.name;
        }
      }
    }
  }

  // 3. Fetch auth users
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      const userEmailMap = new Map(authUsers.users.map((u) => [u.id, u.email]));
      if (shops) {
        for (const s of shops) {
          if (s.owner_id && userEmailMap.has(s.owner_id) && shopMap.has(s.id)) {
            shopMap.get(s.id).ownerEmail = userEmailMap.get(s.owner_id);
          }
        }
      }
    }
  } catch (err) {
    // Non-admin key fallback
  }

  // 4. Fetch orders
  console.log('Fetching order records...');
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, style_name, shop_id, customer_id, created_at');

  if (ordersErr) {
    console.error('Error querying orders table:', ordersErr.message);
    process.exit(1);
  }

  const now = new Date();

  // 5. Aggregate style data
  const styleStats = new Map();
  const accountStyleMap = new Map();

  let unassignedCount = 0;
  let unassignedShops = new Map();
  let unassignedCustomers = new Set();
  let firstUnassignedDate = null;
  let lastUnassignedDate = null;

  for (const o of orders) {
    const rawStyle = o.style_name ? o.style_name.trim() : '';
    const shopId = o.shop_id;
    const shopName = shopId && shopMap.has(shopId) ? shopMap.get(shopId).name : (shopId || 'Unknown Shop');

    if (!rawStyle) {
      unassignedCount++;
      if (shopId) {
        unassignedShops.set(shopId, (unassignedShops.get(shopId) || 0) + 1);
      }
      if (o.customer_id) unassignedCustomers.add(o.customer_id);
      if (!firstUnassignedDate || new Date(o.created_at) < new Date(firstUnassignedDate)) firstUnassignedDate = o.created_at;
      if (!lastUnassignedDate || new Date(o.created_at) > new Date(lastUnassignedDate)) lastUnassignedDate = o.created_at;
      continue;
    }

    const key = rawStyle.toLowerCase();
    if (!styleStats.has(key)) {
      styleStats.set(key, {
        displayName: rawStyle,
        orders: 0,
        shopsCountMap: new Map(),
        customers: new Set(),
        firstDate: null,
        lastDate: null,
      });
    }

    const item = styleStats.get(key);
    item.orders++;
    if (shopId) {
      item.shopsCountMap.set(shopId, (item.shopsCountMap.get(shopId) || 0) + 1);
    }
    if (o.customer_id) item.customers.add(o.customer_id);
    if (!item.firstDate || new Date(o.created_at) < new Date(item.firstDate)) item.firstDate = o.created_at;
    if (!item.lastDate || new Date(o.created_at) > new Date(item.lastDate)) item.lastDate = o.created_at;

    const acctKey = `${shopId || 'none'}::${key}`;
    if (!accountStyleMap.has(acctKey)) {
      accountStyleMap.set(acctKey, {
        shopId,
        shopName,
        styleName: rawStyle,
        orders: 0,
        firstDate: null,
        lastDate: null,
      });
    }
    const acctItem = accountStyleMap.get(acctKey);
    acctItem.orders++;
    if (!acctItem.firstDate || new Date(o.created_at) < new Date(acctItem.firstDate)) acctItem.firstDate = o.created_at;
    if (!acctItem.lastDate || new Date(o.created_at) > new Date(acctItem.lastDate)) acctItem.lastDate = o.created_at;
  }

  function formatAccountNames(shopsCountMap) {
    if (!shopsCountMap || shopsCountMap.size === 0) return 'None';
    const entries = [];
    for (const [sId, cnt] of shopsCountMap.entries()) {
      const name = shopMap.has(sId) ? shopMap.get(sId).name : sId;
      entries.push(`${name} (${cnt})`);
    }
    return entries.join(', ');
  }

  // 6. Match standard presets with dormancy calculation
  const presetResults = [];
  const matchedKeys = new Set();

  for (const preset of STANDARD_PRESETS) {
    const norm = preset.name.trim().toLowerCase();
    const data = styleStats.get(norm);
    if (data) {
      matchedKeys.add(norm);
      const dorm = calculateDormancy(data.lastDate, now);
      presetResults.push({
        style_name: preset.name,
        category: `Preset (${preset.gender})`,
        subtitle: preset.subtitle,
        status: 'Active (Has Data)',
        orders_count: data.orders,
        shops_count: data.shopsCountMap.size,
        accounts_used: formatAccountNames(data.shopsCountMap),
        customers_count: data.customers.size,
        first_used: data.firstDate ? data.firstDate.split('T')[0] : 'N/A',
        last_used_date: data.lastDate ? data.lastDate.split('T')[0] : 'N/A',
        last_used_time: data.lastDate ? data.lastDate.replace('T', ' ').split('.')[0] : 'N/A',
        days_ago: dorm.daysAgo,
        recency_label: dorm.label,
        dormancy_tier: dorm.statusTier,
      });
    } else {
      presetResults.push({
        style_name: preset.name,
        category: `Preset (${preset.gender})`,
        subtitle: preset.subtitle,
        status: 'Unused (0 Data)',
        orders_count: 0,
        shops_count: 0,
        accounts_used: 'None',
        customers_count: 0,
        first_used: 'Never',
        last_used_date: 'Never',
        last_used_time: 'Never',
        days_ago: 99999,
        recency_label: 'Never',
        dormancy_tier: 'Dead (0 Data)',
      });
    }
  }

  // 7. Custom styles
  const customResults = [];
  for (const [key, data] of styleStats.entries()) {
    if (matchedKeys.has(key)) continue;
    const dorm = calculateDormancy(data.lastDate, now);
    customResults.push({
      style_name: data.displayName,
      category: 'Custom Tailor Style',
      subtitle: 'Entered by shop',
      status: 'Active (Has Data)',
      orders_count: data.orders,
      shops_count: data.shopsCountMap.size,
      accounts_used: formatAccountNames(data.shopsCountMap),
      customers_count: data.customers.size,
      first_used: data.firstDate ? data.firstDate.split('T')[0] : 'N/A',
      last_used_date: data.lastDate ? data.lastDate.split('T')[0] : 'N/A',
      last_used_time: data.lastDate ? data.lastDate.replace('T', ' ').split('.')[0] : 'N/A',
      days_ago: dorm.daysAgo,
      recency_label: dorm.label,
      dormancy_tier: dorm.statusTier,
    });
  }

  if (unassignedCount > 0) {
    const dorm = calculateDormancy(lastUnassignedDate, now);
    customResults.push({
      style_name: '(Unassigned Style)',
      category: 'Unassigned',
      subtitle: 'Order without style name',
      status: 'Active (Has Data)',
      orders_count: unassignedCount,
      shops_count: unassignedShops.size,
      accounts_used: formatAccountNames(unassignedShops),
      customers_count: unassignedCustomers.size,
      first_used: firstUnassignedDate ? firstUnassignedDate.split('T')[0] : 'N/A',
      last_used_date: lastUnassignedDate ? lastUnassignedDate.split('T')[0] : 'N/A',
      last_used_time: lastUnassignedDate ? lastUnassignedDate.replace('T', ' ').split('.')[0] : 'N/A',
      days_ago: dorm.daysAgo,
      recency_label: dorm.label,
      dormancy_tier: dorm.statusTier,
    });
  }

  // 8. Sorting: Active presets by recency & order volume
  const fullReport = [...presetResults, ...customResults].sort((a, b) => {
    if (a.orders_count === 0 && b.orders_count === 0) return 0;
    if (a.orders_count === 0) return 1;
    if (b.orders_count === 0) return -1;
    return a.days_ago - b.days_ago;
  });

  console.log(`TOTAL ORDERS ANALYZED: ${orders.length}\n`);

  console.log('--- PRESET STYLES RANKED BY RECENCY & DORMANCY ---');
  console.table(
    presetResults
      .sort((a, b) => a.days_ago - b.days_ago)
      .map((r) => ({
        Style: r.style_name,
        Category: r.category,
        Orders: r.orders_count,
        'Recency Tier': r.dormancy_tier,
        'Last Used Time': r.last_used_time,
        'Days Ago': r.recency_label,
        'Accounts Using It': r.accounts_used.length > 40 ? r.accounts_used.slice(0, 37) + '...' : r.accounts_used,
      }))
  );

  if (customResults.length > 0) {
    console.log('\n--- CUSTOM STYLES RANKED BY RECENCY ---');
    console.table(
      customResults
        .sort((a, b) => a.days_ago - b.days_ago)
        .map((r) => ({
          Style: r.style_name,
          Category: r.category,
          Orders: r.orders_count,
          'Recency Tier': r.dormancy_tier,
          'Last Used Time': r.last_used_time,
          'Days Ago': r.recency_label,
          'Accounts Using It': r.accounts_used.length > 40 ? r.accounts_used.slice(0, 37) + '...' : r.accounts_used,
        }))
    );
  }

  // 9. Write Summary CSV with Recency columns
  const csvHeaders1 = [
    'Style Name',
    'Category',
    'Status',
    'Orders Count',
    'Distinct Shops Count',
    'Dormancy Tier',
    'Days Since Last Used',
    'Last Used Timestamp',
    'Accounts Using Style (Counts)',
    'First Used',
    'Subtitle',
  ];
  const csvRows1 = fullReport.map((r) =>
    [
      `"${r.style_name}"`,
      `"${r.category}"`,
      `"${r.status}"`,
      r.orders_count,
      r.shops_count,
      `"${r.dormancy_tier}"`,
      r.days_ago === 99999 ? 'N/A' : r.days_ago,
      `"${r.last_used_time}"`,
      `"${r.accounts_used}"`,
      `"${r.first_used}"`,
      `"${r.subtitle}"`,
    ].join(',')
  );
  const outPath1 = path.resolve('styles_audit_report.csv');
  fs.writeFileSync(outPath1, [csvHeaders1.join(','), ...csvRows1].join('\n'), 'utf8');

  // 10. Write Detailed CSV
  const detailedAccountRows = Array.from(accountStyleMap.values()).map((row) => {
    const sInfo = shopMap.get(row.shopId);
    const dorm = calculateDormancy(row.lastDate, now);
    return [
      `"${row.shopName}"`,
      `"${sInfo?.ownerName || 'N/A'}"`,
      `"${sInfo?.ownerEmail || 'N/A'}"`,
      `"${sInfo?.phone || 'N/A'}"`,
      `"${row.styleName}"`,
      row.orders,
      `"${dorm.statusTier}"`,
      dorm.daysAgo,
      `"${row.lastDate ? row.lastDate.replace('T', ' ').split('.')[0] : 'N/A'}"`,
      `"${row.firstDate ? row.firstDate.split('T')[0] : 'N/A'}"`,
    ].join(',');
  });

  const csvHeaders2 = [
    'Account / Shop Name',
    'Owner Name',
    'Owner Email',
    'Phone',
    'Garment Style',
    'Orders Placed',
    'Recency Tier',
    'Days Ago',
    'Last Order Timestamp',
    'First Order Date',
  ];
  const outPath2 = path.resolve('styles_by_account_report.csv');
  fs.writeFileSync(outPath2, [csvHeaders2.join(','), ...detailedAccountRows].join('\n'), 'utf8');

  console.log(`\nFiles successfully generated with exact timestamps & days-ago recency:`);
  console.log(`1. Summary CSV: ${outPath1}`);
  console.log(`2. Account Drilldown CSV: ${outPath2}`);
}

runAudit().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
