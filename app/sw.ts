/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Injects the Webpack-generated list of files to precache (like CSS, JS chunks)
  precacheEntries: self.__SW_MANIFEST,
  // Immediately take control of the page when updated
  skipWaiting: true,
  // Take control of uncontrolled clients
  clientsClaim: true,
  // Accelerates navigation requests
  navigationPreload: true,
  // Optimized caching strategies designed specifically for Next.js 14+ (App Router)
  runtimeCaching: defaultCache,
  // Offline fallback configuration
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push Notifications & App Icon Badging ──────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: {
    title?: string;
    body?: string;
    orderId?: string;
    url?: string;
    badgeCount?: number;
  };
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title || 'MyTailorBook Atelier';
  const promises: Promise<unknown>[] = [
    self.registration.showNotification(title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { orderId: payload.orderId, url: payload.url },
    }),
  ];

  // Update phone home screen icon badge count
  const nav = self.navigator as unknown as { setAppBadge?: (count?: number) => Promise<void> };
  if (nav && typeof nav.setAppBadge === 'function') {
    promises.push(nav.setAppBadge(payload.badgeCount ?? 1).catch(() => {}));
  }

  event.waitUntil(Promise.all(promises));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { orderId, url: dataUrl } = event.notification.data || {};
  const url = orderId ? `/production/${orderId}` : dataUrl || '/dashboard';

  // Clear home screen icon badge on notification tap
  const nav = self.navigator as unknown as { clearAppBadge?: () => Promise<void> };
  if (nav && typeof nav.clearAppBadge === 'function') {
    nav.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
