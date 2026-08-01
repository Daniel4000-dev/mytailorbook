'use client';

import { useEffect } from 'react';

/** Registers the service worker app-wide, on first paint of any page —
 *  not just when someone happens to open Settings (PushNotificationToggle
 *  also calls .register('/sw.js'), which is what previously gated this to
 *  Settings-visitors only; register() is idempotent so both call sites
 *  coexist safely). This is what makes the offline app-shell/last-known-
 *  data caching in public/sw.js actually apply to everyone, not just
 *  users who happened to turn on push notifications first. Renders
 *  nothing — registration is a side effect only. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline-caching is a resilience nicety, not a hard requirement —
      // a failed registration (unsupported browser quirk, etc.) should
      // never block or error out the rest of the app.
    });
  }, []);

  return null;
}
