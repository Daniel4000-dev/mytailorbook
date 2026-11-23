'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

function ReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.reports);
  }, [router]);

  return null;
}

export default function DeprecatedSettingsReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsRedirect />
    </Suspense>
  );
}
