// Service worker: Web Push (unchanged) + offline resilience.
//
// Offline resilience scope, deliberately limited:
//   - App shell (logo, icons, manifest, the /offline fallback page) is
//     precached at install time.
//   - Every page you actually visit while online gets its rendered
//     response cached too, so revisiting it later with no connection shows
//     "here's what we last knew" instead of the browser's own offline
//     error page.
//   - Static assets (JS/CSS bundles, images, fonts) use stale-while-
//     revalidate: instant from cache, refreshed in the background.
//
// Explicitly OUT of scope: offline writes/mutations, and reconciling
// edits made by different staff while offline — that needs real conflict
// resolution and is a separate, much bigger feature. This is read-only
// resilience for a dropped connection, nothing more.

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `mtb-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `mtb-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/images/logo.png',
  '/images/og-image.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      // A single missing/renamed asset shouldn't block activation — the
      // rest of the app-shell list still gets cached individually.
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== SHELL_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever intercept same-origin GETs — POST/PUT and cross-origin
  // requests (Supabase, Google Fonts, etc.) pass straight through with
  // their normal network behavior, untouched.
  if (request.method !== 'GET' || !isSameOrigin(request.url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { orderId: payload.orderId, url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { orderId, url: dataUrl } = event.notification.data || {};
  const url = orderId ? `/production/${orderId}` : dataUrl || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
