'use client';

import { useEffect } from 'react';

const COOKIE_NAME = 'mtb_ref';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** First-touch affiliate attribution. Reads `?ref=` off the URL on
 *  mount and, if no mtb_ref cookie is already set, stores it for 30
 *  days — later read server-side in completeOnboarding() (see
 *  app/auth-actions.ts). Mounted once in the root layout, same pattern
 *  as PressFeedback, so it fires on whatever page a referral link
 *  actually lands the visitor on, not just the homepage. */
export default function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    if (document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE_NAME}=`))) return;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; max-age=${MAX_AGE_SECONDS}; path=/; samesite=lax`;
  }, []);

  return null;
}
