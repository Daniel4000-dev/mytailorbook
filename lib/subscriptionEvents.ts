import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Best-effort revenue/churn history — see 0038_admin_tracking.sql. Written
 * as a separate follow-up lookup+insert rather than folded into the
 * actual billing-state `.update()` calls, so a failure here (or a future
 * change to this function) can never affect the actual billing-state
 * write. Never throws: /admin's dashboard is not something a Paystack
 * webhook retry or the billing cron should ever be blocked by. Shared by
 * app/api/webhooks/paystack and app/api/cron/subscription-grace.
 */
export async function recordSubscriptionEvent(
  admin: AdminClient,
  params: { shopId?: string; customerCode?: string; eventType: string; status: string; amountKobo?: number }
) {
  try {
    let shopId = params.shopId;
    let orgId: string | undefined;

    if (shopId) {
      const { data } = await admin.from('shops').select('org_id').eq('id', shopId).maybeSingle();
      orgId = data?.org_id;
    } else if (params.customerCode) {
      const { data } = await admin
        .from('shops')
        .select('id, org_id')
        .eq('paystack_customer_code', params.customerCode)
        .maybeSingle();
      shopId = data?.id;
      orgId = data?.org_id;
    }

    if (!shopId || !orgId) return;

    await admin.from('subscription_events').insert({
      shop_id: shopId,
      org_id: orgId,
      event_type: params.eventType,
      status: params.status,
      amount_kobo: params.amountKobo ?? null,
    });
  } catch (err) {
    console.error('recordSubscriptionEvent failed:', err);
  }
}
