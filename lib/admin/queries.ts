import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

const PREMIUM_STATUSES = ['active', 'past_due'] as const;
/** Kept in one place since both the overview MRR estimate and the
 *  organizations list format against it — mirrors the ₦2,500/mo plan
 *  price (business_model_pricing memory), not read from anywhere in the
 *  DB since Paystack's webhook doesn't store the charged amount today. */
const MONTHLY_PRICE_NGN = 2500;

export interface OverviewStats {
  totalOrganizations: number;
  totalShops: number;
  premiumCount: number;
  freeCount: number;
  mrrEstimateNgn: number;
  totalCustomers: number;
  totalOrders: number;
  ordersLast30d: number;
  signups7d: number;
  signups30d: number;
}

async function count(admin: AdminClient, table: string, filter?: (q: any) => any) {
  let query = admin.from(table).select('id', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count: c } = await query;
  return c ?? 0;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const admin = createAdminClient();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalOrganizations,
    totalShops,
    premiumCount,
    totalCustomers,
    totalOrders,
    ordersLast30d,
    signups7d,
    signups30d,
  ] = await Promise.all([
    count(admin, 'organizations'),
    count(admin, 'shops'),
    count(admin, 'shops', (q) => q.in('subscription_status', PREMIUM_STATUSES as unknown as string[])),
    count(admin, 'customers'),
    count(admin, 'orders'),
    count(admin, 'orders', (q) => q.gte('created_at', d30)),
    count(admin, 'organizations', (q) => q.gte('created_at', d7)),
    count(admin, 'organizations', (q) => q.gte('created_at', d30)),
  ]);

  return {
    totalOrganizations,
    totalShops,
    premiumCount,
    freeCount: Math.max(totalShops - premiumCount, 0),
    mrrEstimateNgn: premiumCount * MONTHLY_PRICE_NGN,
    totalCustomers,
    totalOrders,
    ordersLast30d,
    signups7d,
    signups30d,
  };
}

export interface SignupDay {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Buckets organizations.created_at into daily counts for the last `days`
 *  days. Done in JS rather than a SQL group-by RPC — at this scale
 *  (dozens to low hundreds of signups) pulling raw timestamps and
 *  bucketing client-side is simpler than maintaining a Postgres function
 *  for it, and avoids a second migration just for a chart. */
export async function getSignupSeries(days = 30): Promise<SignupDay[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await admin
    .from('organizations')
    .select('created_at')
    .gte('created_at', since.toISOString());

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, c]) => ({ date, count: c }));
}

export interface AffiliatePerformance {
  id: string;
  name: string;
  code: string;
  active: boolean;
  signups: number;
  premiumConversions: number;
}

export async function getAffiliatePerformance(): Promise<AffiliatePerformance[]> {
  const admin = createAdminClient();

  const [{ data: affiliates }, { data: orgs }] = await Promise.all([
    admin.from('affiliates').select('id, name, code, active').order('created_at', { ascending: false }),
    admin.from('organizations').select('id, referred_by_affiliate_id').not('referred_by_affiliate_id', 'is', null),
  ]);

  const orgIdsByAffiliate = new Map<string, string[]>();
  for (const org of orgs ?? []) {
    const affId = org.referred_by_affiliate_id as string;
    const list = orgIdsByAffiliate.get(affId) ?? [];
    list.push(org.id as string);
    orgIdsByAffiliate.set(affId, list);
  }

  const allReferredOrgIds = (orgs ?? []).map((o) => o.id as string);
  let premiumOrgIds = new Set<string>();
  if (allReferredOrgIds.length > 0) {
    const { data: premiumShops } = await admin
      .from('shops')
      .select('org_id')
      .in('org_id', allReferredOrgIds)
      .in('subscription_status', PREMIUM_STATUSES as unknown as string[]);
    premiumOrgIds = new Set((premiumShops ?? []).map((s) => s.org_id as string));
  }

  return (affiliates ?? []).map((a) => {
    const orgIds = orgIdsByAffiliate.get(a.id) ?? [];
    return {
      id: a.id,
      name: a.name,
      code: a.code,
      active: a.active,
      signups: orgIds.length,
      premiumConversions: orgIds.filter((id) => premiumOrgIds.has(id)).length,
    };
  });
}

export interface OrganizationListRow {
  id: string;
  name: string;
  createdAt: string;
  ownerEmail: string | null;
  shopCount: number;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  customerCount: number;
  orderCount: number;
  affiliateCode: string | null;
}

export interface OrganizationListResult {
  rows: OrganizationListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getOrganizations(opts: { search?: string; page?: number; pageSize?: number }): Promise<OrganizationListResult> {
  const admin = createAdminClient();
  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from('organizations')
    .select('id, name, created_at, owner_id, referral_code_raw', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (opts.search) {
    query = query.ilike('name', `%${opts.search}%`);
  }

  const { data: orgs, count: total } = await query;
  const rows = orgs ?? [];
  if (rows.length === 0) return { rows: [], total: total ?? 0, page, pageSize };

  const orgIds = rows.map((o) => o.id as string);
  const ownerIds = rows.map((o) => o.owner_id as string).filter(Boolean);

  const [{ data: shops }, { data: owners }, customerCounts, orderCounts] = await Promise.all([
    admin.from('shops').select('org_id, name, subscription_status, subscription_plan').in('org_id', orgIds),
    ownerIds.length > 0
      ? admin.from('profiles').select('id, email').in('id', ownerIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
    Promise.all(orgIds.map((id) => count(admin, 'customers', (q) => q.eq('org_id', id)))),
    Promise.all(orgIds.map((id) => count(admin, 'orders', (q) => q.eq('org_id', id)))),
  ]);

  const shopsByOrg = new Map<string, { name: string; subscription_status: string | null; subscription_plan: string | null }[]>();
  for (const shop of shops ?? []) {
    const list = shopsByOrg.get(shop.org_id as string) ?? [];
    list.push(shop as any);
    shopsByOrg.set(shop.org_id as string, list);
  }
  const ownerEmailById = new Map((owners ?? []).map((o) => [o.id, o.email]));

  const result: OrganizationListRow[] = rows.map((org, i) => {
    const orgShops = shopsByOrg.get(org.id as string) ?? [];
    const primary = orgShops[0];
    return {
      id: org.id as string,
      name: org.name as string,
      createdAt: org.created_at as string,
      ownerEmail: ownerEmailById.get(org.owner_id as string) ?? null,
      shopCount: orgShops.length,
      subscriptionStatus: primary?.subscription_status ?? null,
      subscriptionPlan: primary?.subscription_plan ?? null,
      customerCount: customerCounts[i],
      orderCount: orderCounts[i],
      affiliateCode: (org.referral_code_raw as string | null) ?? null,
    };
  });

  return { rows: result, total: total ?? 0, page, pageSize };
}

export interface OrganizationDetail {
  id: string;
  name: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  affiliateCode: string | null;
  shops: {
    id: string;
    name: string;
    isPrimary: boolean;
    subscriptionStatus: string | null;
    subscriptionPlan: string | null;
    currentPeriodEnd: string | null;
    graceExpiresAt: string | null;
  }[];
  customerCount: number;
  orderCount: number;
  ordersByStatus: Record<string, number>;
  staffCount: number;
}

export async function getOrganizationDetail(orgId: string): Promise<OrganizationDetail | null> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, created_at, owner_id, referral_code_raw')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return null;

  const [{ data: shops }, { data: owner }, { data: orders }, staffCount] = await Promise.all([
    admin
      .from('shops')
      .select('id, name, is_primary, subscription_status, subscription_plan, current_period_end, grace_expires_at')
      .eq('org_id', orgId),
    org.owner_id
      ? admin.from('profiles').select('name, email').eq('id', org.owner_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string; email: string | null } | null }),
    admin.from('orders').select('status').eq('org_id', orgId),
    count(admin, 'profiles', (q) => q.eq('org_id', orgId)),
  ]);

  const customerCount = await count(admin, 'customers', (q) => q.eq('org_id', orgId));

  const ordersByStatus: Record<string, number> = {};
  for (const o of orders ?? []) {
    ordersByStatus[o.status as string] = (ordersByStatus[o.status as string] ?? 0) + 1;
  }

  return {
    id: org.id,
    name: org.name,
    createdAt: org.created_at,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.name ?? null,
    affiliateCode: org.referral_code_raw,
    shops: (shops ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      isPrimary: s.is_primary,
      subscriptionStatus: s.subscription_status,
      subscriptionPlan: s.subscription_plan,
      currentPeriodEnd: s.current_period_end,
      graceExpiresAt: s.grace_expires_at,
    })),
    customerCount,
    orderCount: (orders ?? []).length,
    ordersByStatus,
    staffCount,
  };
}
