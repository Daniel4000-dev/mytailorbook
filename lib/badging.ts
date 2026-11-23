/**
 * Cross-platform App Badging helper for PWAs, installed web apps, and modern mobile browsers.
 * Safe for server-side rendering (SSR), embedded webviews, and browsers without badging support.
 */

interface BadgingNavigator {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

export function updateAppBadge(count: number): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as unknown as BadgingNavigator;
  try {
    if (count > 0 && typeof nav.setAppBadge === 'function') {
      nav.setAppBadge(count).catch(() => {});
    } else if (typeof nav.clearAppBadge === 'function') {
      nav.clearAppBadge().catch(() => {});
    }
  } catch {
    // Gracefully ignore on unsupported devices or permission boundaries
  }
}

export function clearAppBadge(): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as unknown as BadgingNavigator;
  try {
    if (typeof nav.clearAppBadge === 'function') {
      nav.clearAppBadge().catch(() => {});
    }
  } catch {
    // Gracefully ignore on unsupported devices or permission boundaries
  }
}

