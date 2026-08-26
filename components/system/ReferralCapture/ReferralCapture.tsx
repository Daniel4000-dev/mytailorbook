'use client';

import { useEffect } from 'react';
import { APP_CONFIG } from '@/lib/config';

const COOKIE_NAME = 'mtb_ref';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** First-touch affiliate attribution. Reads `?ref=` off the URL on
 *  mount and, if no mtb_ref cookie is already set, stores it for 30
 *  days — later read server-side in completeOnboarding() (see
 *  app/auth-actions.ts). Mounted once in the root layout, same pattern
 *  as PressFeedback, so it fires on whatever page a referral link
 *  actually lands the visitor on, not just the homepage.
 *
 *  Marketing pages (mystitchbooks.com) and the app (app.mystitchbooks.com)
 *  are different hosts — see proxy.ts's crossDomainRedirect. A host-only
 *  cookie set on one wouldn't be sent on the other, breaking attribution
 *  for any referral link that lands on marketing rather than /signup
 *  directly. Scoping to the root domain shares it across both. Skipped on
 *  localhost/preview hosts, where the browser would just reject a
 *  Domain= that doesn't match the current host. */
export default function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    if (document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE_NAME}=`))) return;

    const { hostname } = window.location;
    const onProductionDomain = hostname === APP_CONFIG.domain || hostname.endsWith(`.${APP_CONFIG.domain}`);
    const domainAttr = onProductionDomain ? `; domain=.${APP_CONFIG.domain}` : '';

    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; max-age=${MAX_AGE_SECONDS}; path=/; samesite=lax${domainAttr}`;
  }, []);

  return null;
}
