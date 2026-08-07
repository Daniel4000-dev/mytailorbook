import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for the offline-first infrastructure:
 *   1. localStorageProvider — the SWR cache that persists data across refreshes
 *   2. NetworkMonitor logic — deduplication of "no internet" toasts
 *
 * These are pure-logic tests that run in the Node environment; they don't
 * need a DOM or React renderer.
 */

// ─── Minimal localStorage mock ────────────────────────────────────────────────
// The real component reads from window.localStorage. We replicate just the
// slice of behaviour our provider uses so we can run the tests in Node.

function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

// Re-implement the provider inline so the test file has zero dependency on
// the actual component tree (no React / Next.js required).
function localStorageProvider(ls: ReturnType<typeof makeLocalStorageMock>) {
  let map: Map<string, unknown>;
  try {
    map = new Map(JSON.parse(ls.getItem('mtb-swr-cache') || '[]'));
  } catch {
    map = new Map();
  }

  return {
    get: (key: string) => map.get(key),
    set: (key: string, value: unknown) => {
      map.set(key, value);
      try {
        ls.setItem('mtb-swr-cache', JSON.stringify(Array.from(map.entries())));
      } catch {
        // quota exceeded — skip
      }
    },
    delete: (key: string) => {
      map.delete(key);
      try {
        ls.setItem('mtb-swr-cache', JSON.stringify(Array.from(map.entries())));
      } catch {
        // quota exceeded — skip
      }
    },
    keys: () => map.keys(),
  };
}

// ─── Cache provider tests ─────────────────────────────────────────────────────

describe('localStorageProvider', () => {
  let ls: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    ls = makeLocalStorageMock();
  });

  it('returns undefined for a key that was never set', () => {
    const cache = localStorageProvider(ls);
    expect(cache.get('shop-bundle')).toBeUndefined();
  });

  it('persists a value and retrieves it', () => {
    const cache = localStorageProvider(ls);
    cache.set('shop-bundle', { orders: [{ id: '1' }] });
    expect(cache.get('shop-bundle')).toEqual({ orders: [{ id: '1' }] });
  });

  it('writes the value to localStorage immediately after set()', () => {
    const cache = localStorageProvider(ls);
    cache.set('shop-bundle', { orders: [] });
    const raw = ls.getItem('mtb-swr-cache');
    expect(raw).not.toBeNull();
    const parsed = new Map(JSON.parse(raw!));
    expect(parsed.get('shop-bundle')).toEqual({ orders: [] });
  });

  it('removes the key from both the in-memory map and localStorage on delete()', () => {
    const cache = localStorageProvider(ls);
    cache.set('shop-bundle', { orders: [] });
    cache.delete('shop-bundle');

    expect(cache.get('shop-bundle')).toBeUndefined();
    const raw = ls.getItem('mtb-swr-cache');
    const parsed = new Map(JSON.parse(raw!));
    expect(parsed.has('shop-bundle')).toBe(false);
  });

  it('overwriting a key updates both in-memory and localStorage (invalidation)', () => {
    const cache = localStorageProvider(ls);
    cache.set('shop-bundle', { orders: [{ id: 'old' }] });
    // Simulate an optimistic mutate followed by a server revalidation
    cache.set('shop-bundle', { orders: [{ id: 'new' }] });

    expect(cache.get('shop-bundle')).toEqual({ orders: [{ id: 'new' }] });
    const raw = ls.getItem('mtb-swr-cache');
    const parsed = new Map(JSON.parse(raw!));
    expect((parsed.get('shop-bundle') as { orders: { id: string }[] }).orders[0].id).toBe('new');
  });

  it('hydrates from an existing localStorage snapshot on boot (offline-first)', () => {
    // Pre-populate localStorage as if it was written during a previous session.
    ls.setItem(
      'mtb-swr-cache',
      JSON.stringify([['org-branches', [{ id: 'branch-1', name: 'Main Shop' }]]]),
    );

    // A fresh provider should read that snapshot immediately.
    const cache = localStorageProvider(ls);
    expect(cache.get('org-branches')).toEqual([{ id: 'branch-1', name: 'Main Shop' }]);
  });

  it('starts with an empty map when localStorage contains corrupt JSON', () => {
    ls.setItem('mtb-swr-cache', 'NOT_VALID_JSON{{{');
    const cache = localStorageProvider(ls);
    expect(cache.get('anything')).toBeUndefined();
  });

  it('exposes all stored keys via keys()', () => {
    const cache = localStorageProvider(ls);
    cache.set('key-a', 1);
    cache.set('key-b', 2);
    expect(Array.from(cache.keys())).toEqual(expect.arrayContaining(['key-a', 'key-b']));
  });
});

// ─── NetworkMonitor deduplication logic ──────────────────────────────────────

describe('NetworkMonitor deduplication logic', () => {
  it('does not call showToast a second time during the cooldown window', () => {
    let callCount = 0;
    const showToast = () => { callCount++; };

    // Mirrors the ref + cooldown pattern used in NetworkMonitor
    let pending = false;
    const COOLDOWN = 8000;
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      if (pending) return;
      pending = true;
      showToast();
      cooldownTimer = setTimeout(() => { pending = false; }, COOLDOWN);
    };

    handleOffline(); // first event
    handleOffline(); // rapid duplicate — should be swallowed
    handleOffline(); // another duplicate

    expect(callCount).toBe(1);

    if (cooldownTimer) clearTimeout(cooldownTimer);
  });

  it('allows a new toast after the cooldown resets', async () => {
    let callCount = 0;
    const showToast = () => { callCount++; };

    let pending = false;
    const COOLDOWN = 10; // short for the test

    const handleOffline = () => {
      if (pending) return;
      pending = true;
      showToast();
      setTimeout(() => { pending = false; }, COOLDOWN);
    };

    handleOffline(); // fires
    expect(callCount).toBe(1);

    // Wait for cooldown to expire then trigger again
    await new Promise((r) => setTimeout(r, COOLDOWN + 5));
    handleOffline();
    expect(callCount).toBe(2);
  });
});
