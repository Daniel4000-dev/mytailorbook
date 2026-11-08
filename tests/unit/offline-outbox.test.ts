import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueOfflineMutation,
  getPendingMutations,
  getPendingCount,
  dequeueOfflineMutation,
  clearOfflineOutbox,
  replayOfflineQueue,
  type OutboxMutation,
} from '@/lib/offline/outbox';

describe('Offline Mutation Outbox', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};

    // Mock localStorage and window
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

  it('starts with an empty outbox', () => {
    expect(getPendingCount()).toBe(0);
    expect(getPendingMutations()).toEqual([]);
  });

  it('enqueues mutations with chronological timestamps', () => {
    const mut1 = enqueueOfflineMutation('UPDATE_ORDER_STATUS', { orderId: 'ord_1', status: 'cutting' });
    const mut2 = enqueueOfflineMutation('ADD_PAYMENT', { orderId: 'ord_1', amount: 5000 });

    expect(getPendingCount()).toBe(2);
    const pending = getPendingMutations();
    expect(pending[0].id).toBe(mut1.id);
    expect(pending[0].type).toBe('UPDATE_ORDER_STATUS');
    expect(pending[1].id).toBe(mut2.id);
    expect(pending[1].type).toBe('ADD_PAYMENT');
  });

  it('dequeues an individual mutation cleanly upon success', () => {
    const mut1 = enqueueOfflineMutation('UPDATE_ORDER_STATUS', { orderId: 'ord_1', status: 'cutting' });
    const mut2 = enqueueOfflineMutation('UPDATE_ORDER_STATUS', { orderId: 'ord_2', status: 'ready' });

    expect(getPendingCount()).toBe(2);
    dequeueOfflineMutation(mut1.id);

    expect(getPendingCount()).toBe(1);
    expect(getPendingMutations()[0].id).toBe(mut2.id);
  });

  it('clears all mutations when clearOfflineOutbox is invoked', () => {
    enqueueOfflineMutation('ADD_ORDER', { client: 'A' });
    enqueueOfflineMutation('ADD_CUSTOMER', { name: 'B' });
    expect(getPendingCount()).toBe(2);

    clearOfflineOutbox();
    expect(getPendingCount()).toBe(0);
    expect(getPendingMutations()).toEqual([]);
  });

  it('replays queue sequentially in FIFO order against executor', async () => {
    enqueueOfflineMutation('UPDATE_ORDER_STATUS', { orderId: 'ord_1', status: 'cutting' });
    enqueueOfflineMutation('UPDATE_ORDER_STATUS', { orderId: 'ord_1', status: 'ready' });
    enqueueOfflineMutation('ADD_PAYMENT', { orderId: 'ord_1', amount: 10000 });

    const executionLog: string[] = [];

    const result = await replayOfflineQueue(async (mut: OutboxMutation) => {
      executionLog.push(mut.type);
      return { success: true };
    });

    expect(result.syncedCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(executionLog).toEqual(['UPDATE_ORDER_STATUS', 'UPDATE_ORDER_STATUS', 'ADD_PAYMENT']);
    expect(getPendingCount()).toBe(0);
  });

  it('halts FIFO replay when network drops during replay', async () => {
    enqueueOfflineMutation('UPDATE_ORDER_STATUS', { step: 1 });
    enqueueOfflineMutation('UPDATE_ORDER_STATUS', { step: 2 });
    enqueueOfflineMutation('UPDATE_ORDER_STATUS', { step: 3 });

    let callCount = 0;
    const result = await replayOfflineQueue(async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Network offline');
      }
      return { success: true };
    });

    // Step 1 succeeded and was dequeued; Step 2 threw, stopping Step 3
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(getPendingCount()).toBe(2);
  });

  it('discards non-recoverable items that exceed 5 retry attempts', async () => {
    const mut = enqueueOfflineMutation('UPDATE_ORDER', { badPayload: true });
    // Manually set retryCount to 4
    mut.retryCount = 4;
    mockStore['mtb-offline-outbox'] = JSON.stringify([mut]);

    const result = await replayOfflineQueue(async () => {
      return { success: false, error: 'Malformed payload' };
    });

    expect(result.syncedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    // Should be discarded because retryCount reached 5
    expect(getPendingCount()).toBe(0);
  });
});
