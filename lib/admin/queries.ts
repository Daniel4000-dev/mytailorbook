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
  revenueLast30dNgn: number;
  cancellations30d: number;
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
    { data: revenueEvents },
    cancellations30d,
  ] = await Promise.all([
    count(admin, 'organizations'),
    count(admin, 'shops'),
    count(admin, 'shops', (q) => q.in('subscription_status', PREMIUM_STATUSES as unknown as string[])),
    count(admin, 'customers'),
    count(admin, 'orders'),
    count(admin, 'orders', (q) => q.gte('created_at', d30)),
    count(admin, 'organizations', (q) => q.gte('created_at', d7)),
    count(admin, 'organizations', (q) => q.gte('created_at', d30)),
    admin.from('subscription_events').select('amount_kobo').eq('event_type', 'charge.success').gte('created_at', d30),
    count(admin, 'subscription_events', (q) =>
      q.in('event_type', ['subscription.disable', 'subscription.not_renew']).gte('created_at', d30)
    ),
  ]);

  const revenueLast30dNgn = (revenueEvents ?? []).reduce((sum, e) => sum + (e.amount_kobo ?? 0), 0) / 100;

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
    revenueLast30dNgn,
    cancellations30d,
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

export interface RateLimitHotspot {
  key: string;
  hits: number;
}

/** Top offenders in the last 24h, from the sliding-window counter table
 *  backing lib/rateLimit.ts (see 0017_rate_limit_hits.sql) — the only
 *  visibility this dashboard has into scraping/abuse against the public,
 *  unauthenticated routes (/track, /studio, /receipt). Bucketed in JS for
 *  the same reason getSignupSeries is: not enough volume yet to justify a
 *  SQL group-by RPC. */
export async function getRateLimitHotspots(limit = 10): Promise<RateLimitHotspot[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await admin.from('rate_limit_hits').select('key').gte('created_at', since);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.key as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, hits]) => ({ key, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit);
}

export async function listAffiliates(): Promise<{ id: string; name: string; code: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('affiliates').select('id, name, code').order('name');
  return data ?? [];
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

export interface OrganizationFilters {
  search?: string;
  status?: string;
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Resolves search/status filters into a concrete set of organization ids
 *  to intersect against, since both live outside `organizations` itself
 *  (search matches owner email via `profiles`; status lives on `shops`).
 *  Returns `undefined` for "no constraint from this filter", or a Set —
 *  possibly empty, which the caller short-circuits on. affiliateId and
 *  the date range are plain columns on `organizations` and get applied
 *  directly to the main query instead. */
async function resolveOrgIdConstraints(admin: AdminClient, filters: OrganizationFilters): Promise<Set<string> | undefined> {
  const constraints: Set<string>[] = [];

  if (filters.search) {
    const [{ data: nameMatches }, { data: emailMatches }] = await Promise.all([
      admin.from('organizations').select('id').ilike('name', `%${filters.search}%`),
      admin.from('profiles').select('org_id').ilike('email', `%${filters.search}%`),
    ]);
    const ids = new Set<string>();
    for (const row of nameMatches ?? []) ids.add(row.id as string);
    for (const row of emailMatches ?? []) if (row.org_id) ids.add(row.org_id as string);
    constraints.push(ids);
  }

  if (filters.status) {
    const { data: shops } = await admin.from('shops').select('org_id').eq('subscription_status', filters.status);
    constraints.push(new Set((shops ?? []).map((s) => s.org_id as string)));
  }

  if (constraints.length === 0) return undefined;

  return constraints.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));
}

export async function getOrganizations(
  opts: OrganizationFilters & { page?: number; pageSize?: number }
): Promise<OrganizationListResult> {
  const admin = createAdminClient();
  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const idConstraint = await resolveOrgIdConstraints(admin, opts);
  if (idConstraint && idConstraint.size === 0) return { rows: [], total: 0, page, pageSize };

  let query = admin
    .from('organizations')
    .select('id, name, created_at, owner_id, referral_code_raw', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (idConstraint) query = query.in('id', Array.from(idConstraint));
  if (opts.affiliateId) query = query.eq('referred_by_affiliate_id', opts.affiliateId);
  if (opts.dateFrom) query = query.gte('created_at', opts.dateFrom);
  if (opts.dateTo) query = query.lte('created_at', opts.dateTo);

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

/** Same filters as getOrganizations, no pagination — for CSV export.
 *  Capped at 2000 rows: comfortably past this app's current scale, and a
 *  sane ceiling so an unbounded filter can't turn into an unbounded
 *  export. */
export async function getOrganizationsForExport(filters: OrganizationFilters): Promise<OrganizationListRow[]> {
  const { rows } = await getOrganizations({ ...filters, page: 1, pageSize: 2000 });
  return rows;
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
  billingEvents: { eventType: string; status: string; amountKobo: number | null; createdAt: string }[];
}

export async function getOrganizationDetail(orgId: string): Promise<OrganizationDetail | null> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, created_at, owner_id, referral_code_raw')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return null;

  const [{ data: shops }, { data: owner }, { data: orders }, staffCount, { data: billingEvents }] = await Promise.all([
    admin
      .from('shops')
      .select('id, name, is_primary, subscription_status, subscription_plan, current_period_end, grace_expires_at')
      .eq('org_id', orgId),
    org.owner_id
      ? admin.from('profiles').select('name, email').eq('id', org.owner_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string; email: string | null } | null }),
    admin.from('orders').select('status').eq('org_id', orgId),
    count(admin, 'profiles', (q) => q.eq('org_id', orgId)),
    admin
      .from('subscription_events')
      .select('event_type, status, amount_kobo, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
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
    billingEvents: (billingEvents ?? []).map((e) => ({
      eventType: e.event_type,
      status: e.status,
      amountKobo: e.amount_kobo,
      createdAt: e.created_at,
    })),
  };
}

/** Fire-and-forget: a missing audit row should never fail the admin
 *  action it's logging. Called from every mutating action in
 *  app/(admin)/admin/affiliates/actions.ts. */
export async function logAdminAction(params: {
  adminUserId: string;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId?: string;
  diff?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from('admin_audit_log').insert({
      admin_user_id: params.adminUserId,
      admin_name: params.adminName,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      diff: params.diff ?? null,
    });
  } catch (err) {
    console.error('logAdminAction failed:', err);
  }
}

export interface AdminAuditLogEntry {
  id: string;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

export async function getAdminAuditLog(limit = 100): Promise<AdminAuditLogEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('admin_audit_log')
    .select('id, admin_name, action, target_type, target_id, diff, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((e) => ({
    id: e.id,
    adminName: e.admin_name,
    action: e.action,
    targetType: e.target_type,
    targetId: e.target_id,
    diff: e.diff,
    createdAt: e.created_at,
  }));
}
