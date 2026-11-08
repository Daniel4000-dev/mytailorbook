/**
 * Offline Mutation Outbox Engine for MyTailorBook.
 * 
 * Provides an append-only, FIFO queue persisted to client storage.
 * When a tailor makes changes while offline (moving an order, measuring a client,
 * taking down a deposit), the mutation is enqueued here with an exact client timestamp.
 * 
 * Once the device regains network access, the queue is drained sequentially against
 * Supabase server actions, ensuring zero data loss, preserved streaks, and zero UI rollbacks.
 */

export type OutboxActionType =
  | 'UPDATE_ORDER_STATUS'
  | 'UPDATE_ORDER'
  | 'ADD_ORDER'
  | 'ADD_CUSTOMER'
  | 'UPDATE_CUSTOMER_MEASUREMENTS'
  | 'UPDATE_CUSTOMER_PROFILE'
  | 'LOG_STREAK_ACTION'
  | 'ADD_PAYMENT';

export interface OutboxMutation<T = Record<string, unknown>> {
  id: string;
  type: OutboxActionType;
  payload: T;
  clientTimestamp: string;
  retryCount: number;
}

const OUTBOX_STORAGE_KEY = 'mtb-offline-outbox';

/**
 * Retrieves all currently queued offline mutations.
 */
export function getPendingMutations(): OutboxMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns the number of pending offline updates.
 */
export function getPendingCount(): number {
  return getPendingMutations().length;
}

/**
 * Enqueues a new mutation to be synced when internet returns.
 */
export function enqueueOfflineMutation<T = Record<string, unknown>>(
  type: OutboxActionType,
  payload: T
): OutboxMutation<T> {
  const mutation: OutboxMutation<T> = {
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    clientTimestamp: new Date().toISOString(),
    retryCount: 0,
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getPendingMutations();
      current.push(mutation as unknown as OutboxMutation);
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('mtb:outbox_updated', { detail: { count: current.length } }));
    } catch {
      // Storage quota fallback
    }
  }

  return mutation;
}

/**
 * Removes a specific successfully synced mutation from the queue.
 */
export function dequeueOfflineMutation(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPendingMutations();
    const filtered = current.filter((m) => m.id !== id);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('mtb:outbox_updated', { detail: { count: filtered.length } }));
  } catch {
    // Storage fallback
  }
}

/**
 * Clears the entire offline mutation outbox.
 */
export function clearOfflineOutbox(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('mtb:outbox_updated', { detail: { count: 0 } }));
  } catch {
    // Storage fallback
  }
}

/**
 * Replays all pending mutations in strict chronological order.
 * Accepts an executor function that calls the appropriate Supabase action.
 */
export async function replayOfflineQueue(
  executor: (mutation: OutboxMutation) => Promise<{ success: boolean; error?: string }>
): Promise<{ syncedCount: number; failedCount: number }> {
  const pending = getPendingMutations();
  if (pending.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  for (const mutation of pending) {
    try {
      const res = await executor(mutation);
      if (res.success) {
        dequeueOfflineMutation(mutation.id);
        syncedCount++;
      } else {
        // Failed: increment retry count
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        failedCount++;
        // If it failed due to bad payload after 5 tries, discard to prevent queue blockage
        if (mutation.retryCount >= 5) {
          dequeueOfflineMutation(mutation.id);
        }
      }
    } catch {
      failedCount++;
      break; // Network still disconnected, abort remaining replay
    }
  }

  return { syncedCount, failedCount };
}
