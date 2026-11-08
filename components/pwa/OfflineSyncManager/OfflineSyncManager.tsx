'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useData } from '@/contexts/DataContext';
import {
  getPendingCount,
  replayOfflineQueue,
  type OutboxMutation,
} from '@/lib/offline/outbox';
import {
  updateOrderStatusAction,
  updateOrderAction,
  addOrderAction,
  addCustomerAction,
  updateCustomerMeasurementsAction,
  updateCustomerProfileAction,
} from '@/app/actions';
import { addPayment } from '@/app/actions/order_payments';
import { logStreakAction } from '@/lib/streakClient';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './OfflineSyncManager.module.css';

export default function OfflineSyncManager() {
  const { showToast } = useToast();
  const { refreshShop, activeBranchId, currentShop } = useData();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Sync outbox queue
  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const count = getPendingCount();
    if (count === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    showToast(`Back online! Syncing ${count} update${count > 1 ? 's' : ''} with your workshop...`, 'info');

    const result = await replayOfflineQueue(async (mutation: OutboxMutation) => {
      try {
        const payload = mutation.payload as Record<string, any>;
        const shopId = payload.shopId || activeBranchId || currentShop?.id;

        switch (mutation.type) {
          case 'UPDATE_ORDER_STATUS': {
            const res = await updateOrderStatusAction(
              payload.orderId,
              payload.newStatus,
              payload.changedBy,
              payload.changedByName,
              shopId
            );
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'UPDATE_ORDER': {
            const res = await updateOrderAction(payload.orderId, payload.updates, shopId);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'ADD_ORDER': {
            const res = await addOrderAction(shopId, payload.order);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'ADD_CUSTOMER': {
            const orgId = payload.orgId || currentShop?.orgId || shopId;
            const res = await addCustomerAction(shopId, orgId, payload.customer);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'UPDATE_CUSTOMER_MEASUREMENTS': {
            const orgId = payload.orgId || currentShop?.orgId || shopId;
            const res = await updateCustomerMeasurementsAction(payload.customerId, payload.measurements, orgId);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'UPDATE_CUSTOMER_PROFILE': {
            const orgId = payload.orgId || currentShop?.orgId || shopId;
            const res = await updateCustomerProfileAction(payload.customerId, payload.updates, orgId);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'ADD_PAYMENT': {
            const res = await addPayment(payload.orderId, payload.amount, payload.note, shopId);
            return { success: !res || !('error' in res), error: res && 'error' in res ? res.error : undefined };
          }

          case 'LOG_STREAK_ACTION': {
            const res = await logStreakAction(payload.action, payload.xpAmount, payload.details);
            return { success: !!res };
          }

          default:
            return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Replay failed' };
      }
    });

    syncingRef.current = false;
    setIsSyncing(false);
    setPendingCount(getPendingCount());

    if (result.syncedCount > 0) {
      showToast('All updates synced! Your workshop is now up to date.', 'success');
      refreshShop?.();
    }
  }, [activeBranchId, currentShop?.id, currentShop?.orgId, refreshShop, showToast]);

  useEffect(() => {
    // Initial check
    setPendingCount(getPendingCount());

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode: Changes will be saved to your phone and synced when reconnected.', 'info');
    };

    const handleOutboxUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      setPendingCount(customEvent.detail?.count ?? getPendingCount());
      if (navigator.onLine && !syncingRef.current) {
        triggerSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('mtb:outbox_updated', handleOutboxUpdate);

    // If online on mount with lingering pending items, trigger drain
    if (navigator.onLine && getPendingCount() > 0) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mtb:outbox_updated', handleOutboxUpdate);
    };
  }, [triggerSync, showToast]);

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <aside
      className={`${styles.syncPill} ${!isOnline ? styles.offlinePill : styles.syncingPill}`}
      aria-label="Offline sync status"
      role="status"
      aria-live="polite"
    >
      <div className={styles.pillIcon}>
        {isSyncing ? (
          <Symbol name="sync" className={styles.spinIcon} size={15} />
        ) : !isOnline ? (
          <Symbol name="wifi_off" size={15} />
        ) : (
          <Symbol name="cloud_upload" size={15} />
        )}
      </div>
      <span className={styles.pillText}>
        {isSyncing
          ? `Syncing ${pendingCount} update${pendingCount === 1 ? '' : 's'}...`
          : !isOnline
          ? pendingCount > 0
            ? `Offline — ${pendingCount} update${pendingCount === 1 ? '' : 's'} saved on phone`
            : 'Working Offline (Saved locally)'
          : `${pendingCount} pending sync`}
      </span>
    </aside>
  );
}
