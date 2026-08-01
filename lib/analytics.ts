'use client';

import posthog from 'posthog-js';

/** Every export here is a safe no-op until NEXT_PUBLIC_POSTHOG_KEY is set —
 *  lets this ship and be called from AuthContext/layout now, with actual
 *  tracking turning on the moment a real PostHog project key is added to
 *  the environment, no code change needed at that point. */
let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // We send pageviews ourselves (see AnalyticsProvider) — App Router
    // navigations are client-side, so PostHog's own automatic pageview
    // capture (built for full page loads) misses every route change.
    capture_pageview: false,
    // Autocapture (clicks, form submissions, etc.) stays on by default —
    // this is most of the value here: funnels and click tracking work
    // across the app without instrumenting every button by hand.
    person_profiles: 'identified_only',
  });
  initialized = true;
}

/** Ties subsequent events to a real person — call once we know who's
 *  logged in (see AuthContext), never with anything sensitive (no
 *  customer data, no measurements) since this leaves our own database. */
export function identifyUser(userId: string, props: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, props);
}

/** Call on logout — otherwise the next person to use this device/browser
 *  would get folded into the previous user's identity. */
export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}

export function trackPageview(url: string): void {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: url });
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(name, props);
}
