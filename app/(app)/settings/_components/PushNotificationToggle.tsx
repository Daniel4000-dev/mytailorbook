'use client';

import { useEffect, useState } from 'react';
import { FaBell, FaSpinner } from 'react-icons/fa6';
import { useToast } from '@/contexts/ToastContext';
import { savePushSubscriptionAction, removePushSubscriptionAction } from '@/app/actions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
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
      setSubscribed(!!existing);
    });
  }, []);

  const handleEnable = async () => {
    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        // Browsers only ever show the system permission prompt once per
        // site — after a denial, requestPermission() silently resolves to
        // 'denied' again with no UI at all, so retrying this button can
        // never re-show it. The only way back is the browser's own site
        // settings, not anything this app can trigger.
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const { error } = await savePushSubscriptionAction(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      if (error) {
        showToast(error, 'error');
        return;
      }
      setSubscribed(true);
      showToast('Notifications enabled', 'success');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    setWorking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      showToast('Notifications disabled', 'success');
    } finally {
      setWorking(false);
    }
  };

  if (!supported) return null;

  return (
    <button
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
      {working && <FaSpinner className="global-spinner" />}
      <FaBell />
      {subscribed ? 'Disable Notifications' : 'Enable Notifications'}
    </button>
  );
}
