import type { createClient } from '@/lib/supabase/server';
import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type AnySupabaseClient = SupabaseServerClient | SupabaseAdminClient;

/** Free tier gets this many orders per calendar month (org-wide, across all
 *  branches) before creation is blocked. 'active' AND 'past_due' are both
 *  unlimited — a shop mid-retry on a failed renewal keeps full Premium
 *  access for the entire 3-day grace window (see
 *  app/api/webhooks/paystack and app/api/cron/subscription-grace), not
 *  just until the first failed charge. Only once the grace period fully
 *  expires (status flips to 'free') or the shop explicitly cancels
 *  (status 'canceled') do free-tier limits actually apply. */
export const FREE_MONTHLY_ORDER_LIMIT = 15;

/** Statuses that count as premium access — kept as one source of truth so
 *  server-side gates, the DB-level triggers (migration 0033), and every
 *  client-side "is this shop premium" UI check all agree. Safe to import
 *  client-side: the only server-only imports in this file are type-only
 *  (`import type`), fully erased at build time. */
export const PREMIUM_STATUSES = ['active', 'past_due'];

export const PREMIUM_MONTHLY_PRICE_NGN = 2699;
export const PREMIUM_YEARLY_PRICE_NGN = 26990;

/** Free tier caps per order (see migration 0032's DB trigger, which is the
 *  real enforcement — these are duplicated here only so the UI can show a
 *  friendly "limit reached" state instead of a raw insert error). Premium
 *  is uncapped. */
export const FREE_ORDER_PROGRESS_PHOTO_LIMIT = 5;
export const FREE_ORDER_INSPIRATION_PHOTO_LIMIT = 3;

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Billing lives on the org's primary shop (see migration 0020 — the
 *  Owner's shop is is_primary=true, and that's the row the Paystack
 *  webhook flips to 'active'). A non-primary branch shop's own
 *  subscription_status column is always 'free' by default, so callers must
 *  resolve through the org, never read a branch shop's column directly. */
export async function getOrgSubscriptionStatus(
  supabase: AnySupabaseClient,
  shopId: string
): Promise<string> {
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('org_id, subscription_status, is_primary')
    .eq('id', shopId)
    .single();

  if (shopError) throw new Error(shopError.message);
  if (shop?.is_primary) return shop.subscription_status;

  const { data: primary, error: primaryError } = await supabase
    .from('shops')
    .select('subscription_status')
    .eq('org_id', shop.org_id)
    .eq('is_primary', true)
    .single();

  if (primaryError) throw new Error(primaryError.message);
  return primary?.subscription_status ?? 'free';
}

/** Server-side gate for order creation. Always call this before inserting
 *  into `orders` — client-side quota display is a UX nicety, not a check
 *  that can be trusted, since server actions are directly callable. */
export async function checkOrderQuota(
  supabase: AnySupabaseClient,
  shopId: string,
  incomingCount: number = 1
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('org_id')
    .eq('id', shopId)
    .single();
  if (shopError) throw new Error(shopError.message);

  const status = await getOrgSubscriptionStatus(supabase, shopId);
  if (PREMIUM_STATUSES.includes(status)) {
    return { allowed: true, used: 0, limit: null };
  }

  const { data: branches, error: branchesError } = await supabase
    .from('shops')
    .select('id')
    .eq('org_id', shop.org_id);
  if (branchesError) throw new Error(branchesError.message);
  const branchIds = (branches || []).map((b) => b.id);

  const { count, error: countError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('shop_id', branchIds)
    .gte('created_at', monthStartISO());

  if (countError) throw new Error(countError.message);

  const used = count ?? 0;
  return {
    allowed: used + incomingCount <= FREE_MONTHLY_ORDER_LIMIT,
    used,
    limit: FREE_MONTHLY_ORDER_LIMIT,
  };
}

/** Gate for staff invites and analytics/insights — both require an active
 *  (premium) subscription at the org level. */
export async function isOrgPremium(supabase: AnySupabaseClient, shopId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(supabase, shopId);
  return PREMIUM_STATUSES.includes(status);
}

/** Same as isOrgPremium, but for callers that already have org_id on hand
 *  (e.g. from the caller's own profile) and don't need a shopId round-trip. */
export async function isOrgPremiumByOrgId(supabase: AnySupabaseClient, orgId: string): Promise<boolean> {
  const { data: primary, error } = await supabase
    .from('shops')
    .select('subscription_status')
    .eq('org_id', orgId)
    .eq('is_primary', true)
    .single();

  if (error) throw new Error(error.message);
  return !!primary && PREMIUM_STATUSES.includes(primary.subscription_status);
}
