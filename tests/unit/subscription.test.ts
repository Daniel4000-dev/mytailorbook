import { describe, it, expect } from 'vitest';
import {
  checkOrderQuota,
  getOrgSubscriptionStatus,
  isOrgPremium,
  isOrgPremiumByOrgId,
  FREE_MONTHLY_ORDER_LIMIT,
} from '@/lib/subscription';

/** Minimal fake of the Supabase query builder used by lib/subscription.ts.
 *  Each `.from(table)` call pops the next queued response for that table —
 *  queued in the exact order the code under test issues its queries, since
 *  the real client has no concept of "match by shape", only call order. */
function makeFakeClient(responses: Record<string, unknown[]>) {
  const queues: Record<string, unknown[]> = Object.fromEntries(
    Object.entries(responses).map(([table, list]) => [table, [...list]])
  );

  function builder(table: string) {
    const result = queues[table]?.shift();
    if (result === undefined) {
      throw new Error(`No queued response for table "${table}" — check the test's response list`);
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      single: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return chain;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: builder } as any;
}

describe('getOrgSubscriptionStatus', () => {
  it('returns the shop\'s own status directly when it is the org primary shop', async () => {
    const client = makeFakeClient({
      shops: [{ data: { org_id: 'org-1', subscription_status: 'active', is_primary: true }, error: null }],
    });
    const status = await getOrgSubscriptionStatus(client, 'shop-1');
    expect(status).toBe('active');
  });

  it('resolves through the org primary shop when called on a non-primary branch', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: false }, error: null },
        { data: { subscription_status: 'active' }, error: null },
      ],
    });
    const status = await getOrgSubscriptionStatus(client, 'branch-shop-1');
    expect(status).toBe('active');
  });
});

describe('checkOrderQuota', () => {
  it('is unlimited when the org is active, without counting orders', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'active', is_primary: true }, error: null },
      ],
    });
    const result = await checkOrderQuota(client, 'shop-1');
    expect(result).toEqual({ allowed: true, used: 0, limit: null });
  });

  it('allows creation when under the free-tier limit', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }], error: null }, // branch list
      ],
      orders: [{ count: 10, error: null }],
    });
    const result = await checkOrderQuota(client, 'shop-1');
    expect(result).toEqual({ allowed: true, used: 10, limit: FREE_MONTHLY_ORDER_LIMIT });
  });

  it('blocks creation once the free-tier limit is reached', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }], error: null },
      ],
      orders: [{ count: 15, error: null }],
    });
    const result = await checkOrderQuota(client, 'shop-1');
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(15);
  });

  it('rejects a batch that would push usage over the limit, even if each single order would fit', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }], error: null },
      ],
      orders: [{ count: 14, error: null }],
    });
    // 14 used + 2 incoming = 16 > 15
    const result = await checkOrderQuota(client, 'shop-1', 2);
    expect(result.allowed).toBe(false);
  });

  it('allows a batch that lands exactly on the limit', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }], error: null },
      ],
      orders: [{ count: 14, error: null }],
    });
    // 14 used + 1 incoming = 15, the limit itself, not over it
    const result = await checkOrderQuota(client, 'shop-1', 1);
    expect(result.allowed).toBe(true);
  });

  it('counts orders org-wide across every branch, not just the calling shop', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }, { id: 'shop-2' }, { id: 'shop-3' }], error: null },
      ],
      orders: [{ count: 15, error: null }],
    });
    const result = await checkOrderQuota(client, 'shop-2');
    // A branch shop with zero orders of its own is still capped once the
    // ORG total hits 15 — proves this isn't scoped to a single branch.
    expect(result.allowed).toBe(false);
  });

  it('treats past_due the same as active — unlimited', async () => {
    const client = makeFakeClient({
      shops: [
        { data: { org_id: 'org-1' }, error: null },
        { data: { org_id: 'org-1', subscription_status: 'past_due', is_primary: true }, error: null },
        { data: [{ id: 'shop-1' }], error: null },
      ],
      orders: [{ count: 15, error: null }],
    });
    const result = await checkOrderQuota(client, 'shop-1');
    expect(result.allowed).toBe(true);
  });
});

describe('isOrgPremium / isOrgPremiumByOrgId', () => {
  it('isOrgPremium is true only when the org is active', async () => {
    const activeClient = makeFakeClient({
      shops: [{ data: { org_id: 'org-1', subscription_status: 'active', is_primary: true }, error: null }],
    });
    expect(await isOrgPremium(activeClient, 'shop-1')).toBe(true);

    const freeClient = makeFakeClient({
      shops: [{ data: { org_id: 'org-1', subscription_status: 'free', is_primary: true }, error: null }],
    });
    expect(await isOrgPremium(freeClient, 'shop-1')).toBe(false);
  });

  it('isOrgPremiumByOrgId reads the primary shop directly by org id', async () => {
    const client = makeFakeClient({
      shops: [{ data: { subscription_status: 'active' }, error: null }],
    });
    expect(await isOrgPremiumByOrgId(client, 'org-1')).toBe(true);
  });
});
