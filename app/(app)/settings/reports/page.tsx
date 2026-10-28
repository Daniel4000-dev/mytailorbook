'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

export default function DeprecatedSettingsReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.reports);
  }, [router]);

  return null;
}
