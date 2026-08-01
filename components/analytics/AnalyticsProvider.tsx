'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, trackPageview } from '@/lib/analytics';

/** Split out from AnalyticsProvider because useSearchParams requires a
 *  Suspense boundary — without it, this one client hook would force the
 *  entire root layout (and everything under it) to de-opt into
 *  client-side rendering. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    trackPageview(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/** Renders nothing — registration/tracking are side effects only, same
 *  pattern as ServiceWorkerRegistrar. Mounted once in the root layout. */
export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
