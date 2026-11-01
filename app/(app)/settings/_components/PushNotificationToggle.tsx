'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushAction,
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

export default function PushNotificationToggle() {
  const { showToast } = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

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
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
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

  const handleSendTestPush = async () => {
    setTestingPush(true);
    showToast('Sending test push in 3s — lock your screen or switch apps to see it', 'info');
    try {
      const result = await sendTestPushAction(3);
      if (result.error) {
        showToast(result.error, 'error');
      }
    } catch {
      showToast('Failed to trigger test push', 'error');
    } finally {
      setTestingPush(false);
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

      {subscribed && (
        <button
          type="button"
          onClick={handleSendTestPush}
          disabled={testingPush}
          style={{
            padding: 'var(--sf-space-sm) var(--sf-space-md)',
            borderRadius: 'var(--sf-radius-md)',
            border: '1px solid var(--sf-border-accent, #B8860B)',
            background: 'var(--sf-surface-accent, rgba(184, 134, 11, 0.08))',
            color: 'var(--sf-text-accent, #B8860B)',
            fontWeight: 'var(--sf-weight-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--sf-space-sm)',
            cursor: testingPush ? 'default' : 'pointer',
          }}
        >
          {testingPush && <Symbol name="progress_activity" className="global-spinner" />}
          <Symbol name="send" />
          {testingPush ? 'Sending in 3s...' : 'Send Test Push (Lock screen to test)'}
        </button>
      )}
    </div>
  );
}
