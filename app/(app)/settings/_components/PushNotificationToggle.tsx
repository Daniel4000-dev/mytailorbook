'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
} from '@/app/actions';
import Symbol from '@/components/ui/Symbol/Symbol';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BN9WicPA4RvCFc77qA6zMf3iNSy8xcnzJ6aUohFL_D94leTxEy4lf5A6TAHb2xGW_RMrgh4T87zkRL-eJ1OR9aY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
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

async function getServiceWorkerForPush(timeoutMs = 6000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  // 1. Check existing registration
  let reg = await navigator.serviceWorker.getRegistration();

  // 2. If not registered yet, initiate registration
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }

  // 3. If already active, return immediately
  if (reg?.active) {
    return reg;
  }

  // 4. Wait for activation with a reliable timeout race
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (reg?.active || reg?.pushManager) {
        resolve(reg);
      } else {
        reject(new Error('Notification service is initializing. Please try again in a moment.'));
      }
    }, timeoutMs);

    navigator.serviceWorker.ready.then((readyReg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(readyReg);
    }).catch(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (reg) resolve(reg);
      else reject(new Error('Failed to initialize notification service.'));
    });

    const worker = reg?.installing || reg?.waiting;
    if (worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' && !settled) {
          settled = true;
          clearTimeout(timer);
          resolve(reg!);
        }
      });
    }
  });
}

export default function PushNotificationToggle() {
  const { showToast } = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    Promise.resolve().then(() => setSupported(true));

    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
        // Automatically ensure this device's token is registered in the database for the active profile
        savePushSubscriptionAction(existing.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }).catch(() => {});
      } else {
        setSubscribed(false);
      }
    }).catch(() => {});
  }, []);

  const handleEnable = async () => {
    if (isIOS() && !isStandalone()) {
      showToast(
        'On iPhone, push notifications require adding this app to your Home Screen first (tap Share > Add to Home Screen).',
        'info'
      );
      return;
    }

    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        showToast(
          'Notifications are blocked for this site. To enable them, open your browser\'s site settings (tap the icon next to the address bar) and allow Notifications, then try again.',
          'error'
        );
        return;
      }
      if (permission !== 'granted') {
        showToast('Notification permission was not granted', 'error');
        return;
      }
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
      const { error } = await savePushSubscriptionAction(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      if (error) {
        showToast(error, 'error');
        return;
      }
      setSubscribed(true);
      showToast('Notifications enabled', 'success');
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
      let message = 'Failed to enable notifications';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Notifications are blocked in your system or browser settings.';
        } else if (err.message.includes('no active Service Worker')) {
          message = 'Service worker is still activating. Please try again in a few seconds.';
        } else {
          message = err.message;
        }
      }
      showToast(message, 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    setWorking(true);
    try {
      const registration = await getServiceWorkerForPush();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      showToast('Notifications disabled', 'success');
    } catch (err) {
      console.error('Failed to disable push notifications:', err);
      const message = err instanceof Error ? err.message : 'Failed to disable notifications';
      showToast(message, 'error');
    } finally {
      setWorking(false);
    }
  };

  if (!supported) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-sm)', width: '100%' }}>
      <button
        type="button"
        onClick={subscribed ? handleDisable : handleEnable}
        disabled={working}
        style={{
          padding: 'var(--sf-space-sm) var(--sf-space-md)',
          borderRadius: 'var(--sf-radius-md)',
          border: '1px solid var(--sf-border-light)',
          background: 'none',
          color: 'var(--sf-text-primary)',
          fontWeight: 'var(--sf-weight-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sf-space-sm)',
          cursor: working ? 'default' : 'pointer',
        }}
      >
        {working && <Symbol name="progress_activity" className="global-spinner" />}
        <Symbol name="notifications" />
        {subscribed ? 'Disable Notifications' : 'Enable Notifications'}
      </button>
    </div>
  );
}
