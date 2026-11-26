'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { savePushSubscriptionAction } from '@/app/actions';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './NotificationPrompt.module.css';

const DISMISS_KEY = 'mtb_notif_prompt_dismissed_at';
const RESHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 2400;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < RESHOW_AFTER_MS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(window.navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

const DEFAULT_VAPID_PUBLIC_KEY =
  'BN9WicPA4RvCFc77qA6zMf3iNSy8xcnzJ6aUohFL_D94leTxEy4lf5A6TAHb2xGW_RMrgh4T87zkRL-eJ1OR9aY';

async function getServiceWorkerForPush(timeoutMs = 6000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  // 1. Fast path: check existing registration
  let reg = await navigator.serviceWorker.getRegistration();

  // 2. If not registered yet, register now
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }

  // If pushManager is already accessible on reg, return it immediately without hanging on ready
  if (reg && 'pushManager' in reg) {
    return reg;
  }

  // 3. Fallback: race against ready with a strict timeout
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((resolve, reject) =>
      setTimeout(() => {
        if (reg) resolve(reg);
        else reject(new Error('Notification service setup timed out. Please try again.'));
      }, timeoutMs)
    ),
  ]);
}

export default function NotificationPrompt() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    try {
      // Only prompt authenticated users who haven't dismissed recently
      if (!user) return;
      if (typeof window === 'undefined') return;
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

      // If permission has already been determined (granted or denied), never prompt
      if (!window.Notification || window.Notification.permission !== 'default') return;

      if (isDismissedRecently()) return;

      // On iOS, Web Push is only supported once added to Home Screen (standalone mode)
      if (isIOS() && !isStandalone()) return;

      // Delay slightly after page mount so it feels smooth and natural
      const timer = window.setTimeout(() => {
        setVisible(true);
      }, SHOW_DELAY_MS);

      return () => window.clearTimeout(timer);
    } catch {
      // Gracefully ignore notification check failures in restricted webviews
    }
  }, [user]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { }
    setVisible(false);
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      // Direct user gesture allows browser to display the native prompt
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const registration = await getServiceWorkerForPush();
        if (!registration || !registration.pushManager) {
          throw new Error('Push notification service is not supported on this device.');
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

        const subscription = await Promise.race([
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }),
          new Promise<PushSubscription>((_, reject) =>
            setTimeout(() => reject(new Error('Device registration timed out. Please check your connection and try again.')), 8000)
          ),
        ]);

        const { error } = await savePushSubscriptionAction(
          subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        );

        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Notifications enabled for this device', 'success');
        }
        setVisible(false);
      } else if (permission === 'denied') {
        showToast('Notifications are blocked in your browser settings.', 'error');
        dismiss();
        return;
      } else {
        showToast('Notification permission was not granted', 'error');
        dismiss();
        return;
      }
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
      const message = err instanceof Error ? err.message : 'Failed to enable notifications';
      showToast(message, 'error');
      setVisible(false);
    } finally {
      setEnabling(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.container} role="dialog" aria-label="Enable notifications">
      <div className={styles.card}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={dismiss}
          aria-label="Dismiss notification prompt"
        >
          <Symbol name="close" size={14} />
        </button>

        <div className={styles.content}>
          <div className={styles.iconCircle}>
            <Symbol name="notifications" size={20} className={styles.bellIcon} />
          </div>

          <div className={styles.textBlock}>
            <span className={styles.title}>Turn on notifications</span>
            <span className={styles.subtitle}>
              Get lock screen alerts when order stages move, customers comment, or payments arrive.
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.laterBtn}
            onClick={dismiss}
            disabled={enabling}
          >
            Not Now
          </button>
          <button
            type="button"
            className={styles.enableBtn}
            onClick={handleEnable}
            disabled={enabling}
          >
            {enabling ? 'Enabling...' : 'Turn On'}
          </button>
        </div>
      </div>
    </div>
  );
}

