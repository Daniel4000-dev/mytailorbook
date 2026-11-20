import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSmartLocalStorageProvider,
  isCoreWorkshopKey,
  pruneCacheMap,
  MAX_EPHEMERAL_ENTRIES,
  CACHE_STORAGE_KEY,
  type CacheEntry,
} from '@/lib/offline/swrCache';
import {
  enqueueOfflineMutation,
  getPendingMutations,
  getPendingCount,
  clearOfflineOutbox,
  withNetworkTimeout,
} from '@/lib/offline/outbox';

function makeMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('Smart Bounded SWR Cache Provider', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = makeMockStorage();
  });

  it('correctly identifies core non-negotiable workshop keys', () => {
    expect(isCoreWorkshopKey('shop-bundle/shop_123/org_456')).toBe(true);
    expect(isCoreWorkshopKey('org-branches/org_456')).toBe(true);
    expect(isCoreWorkshopKey('shop-settings/shop_123')).toBe(true);
    expect(isCoreWorkshopKey('active-user')).toBe(true);

    expect(isCoreWorkshopKey('search-query/agbada')).toBe(false);
    expect(isCoreWorkshopKey('date-expenses/2026-11-20')).toBe(false);
    expect(isCoreWorkshopKey('customer-filter/vip')).toBe(false);
  });

  it('updates existing keys in-place with latest server data without duplicating', () => {
    const provider = createSmartLocalStorageProvider(mockStorage);

    // Initial fetch
    provider.set('shop-bundle/shop_1', { orders: [{ id: 'ord_1', status: 'Cutting' }] });
    expect(provider.get('shop-bundle/shop_1')).toEqual({
      orders: [{ id: 'ord_1', status: 'Cutting' }],
    });

    // Fresh server payload lands
    provider.set('shop-bundle/shop_1', {
      orders: [{ id: 'ord_1', status: 'Sewing' }, { id: 'ord_2', status: 'Cutting' }],
    });

    expect(provider.get('shop-bundle/shop_1')).toEqual({
      orders: [{ id: 'ord_1', status: 'Sewing' }, { id: 'ord_2', status: 'Cutting' }],
    });

    // Check storage size is not bloated
    const raw = mockStorage.getItem(CACHE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // Exactly 1 entry in the array
    expect(parsed.length).toBe(1);
    expect(parsed[0][0]).toBe('shop-bundle/shop_1');
  });

  it('bounds ephemeral entries and evicts oldest non-core keys', () => {
    const map = new Map<string, CacheEntry>();

    // Add core key
    map.set('shop-bundle/primary', { value: { orders: [] }, lastAccessed: 1000 });

    // Add 50 ephemeral keys with increasing access times
    for (let i = 0; i < 50; i++) {
      map.set(`search-query/${i}`, { value: `result_${i}`, lastAccessed: 2000 + i });
    }

    expect(map.size).toBe(51);

    // Prune
    pruneCacheMap(map);

    // Should have pruned down to MAX_EPHEMERAL_ENTRIES + core keys
    expect(map.size).toBe(MAX_EPHEMERAL_ENTRIES + 1);

    // Core key MUST still be present
    expect(map.has('shop-bundle/primary')).toBe(true);

    // Oldest ephemeral keys (0 to 9) should have been evicted
    expect(map.has('search-query/0')).toBe(false);
    expect(map.has('search-query/9')).toBe(false);

    // Recent ephemeral keys should still be present
    expect(map.has('search-query/49')).toBe(true);
  });

  it('recovers gracefully when localStorage throws quota error', () => {
    let throwOnSet = false;
    const faultyStorage: Storage = {
      ...mockStorage,
      setItem: (key: string, value: string) => {
        if (throwOnSet) {
          throw new DOMException('QuotaExceededError');
        }
        mockStorage.setItem(key, value);
      },
    };

    const provider = createSmartLocalStorageProvider(faultyStorage);
    provider.set('shop-bundle/main', { orders: ['1', '2'] });
    provider.set('ephemeral/search', { temp: true });

    // Trigger quota error on next persist
    throwOnSet = true;
    // Should catch silently, clear ephemeral keys, and not crash React
    expect(() => {
      provider.set('ephemeral/another', { temp2: true });
    }).not.toThrow();
  });
});

describe('Offline Outbox Batch & Expense Operations', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    clearOfflineOutbox();

    const localStorageMock = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
    });
  });

  it('enqueues ADD_ORDER_BATCH mutations for multi-garment orders', () => {
    const batchGarments = [
      { clientName: 'Emeka', style: 'Agbada 3-Piece', price: 85000 },
      { clientName: 'Emeka', style: 'Matching Cap (Fila)', price: 15000 },
    ];

    const mutation = enqueueOfflineMutation('ADD_ORDER_BATCH', {
      batchId: 'batch_xyz',
      garments: batchGarments,
    });

    expect(getPendingCount()).toBe(1);
    const pending = getPendingMutations();
    expect(pending[0].id).toBe(mutation.id);
    expect(pending[0].type).toBe('ADD_ORDER_BATCH');
    expect((pending[0].payload as any).garments.length).toBe(2);
  });

  it('enqueues ADD_EXPENSE mutations for workshop outlays', () => {
    const expenseData = {
      shopId: 'shop_1',
      amount: 4500,
      category: 'material',
      description: 'Lining & thread for wedding orders',
      date: '2026-11-20',
      method: 'cash',
    };

    const mutation = enqueueOfflineMutation('ADD_EXPENSE', expenseData);

    expect(getPendingCount()).toBe(1);
    const pending = getPendingMutations();
    expect(pending[0].type).toBe('ADD_EXPENSE');
    expect((pending[0].payload as any).amount).toBe(4500);
  });

  it('withNetworkTimeout fails fast on hanging connections', async () => {
    const hangingPromise = new Promise((resolve) => setTimeout(resolve, 10000));

    await expect(withNetworkTimeout(hangingPromise, 50)).rejects.toThrow(
      'OfflineTimeout'
    );
  });

  it('withNetworkTimeout resolves normally if server responds within limit', async () => {
    const quickPromise = Promise.resolve({ success: true, data: [1, 2, 3] });

    const result = await withNetworkTimeout(quickPromise, 1000);
    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });
});
