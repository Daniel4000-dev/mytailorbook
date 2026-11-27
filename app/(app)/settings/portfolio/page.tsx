'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SettingsPortfolioRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isNew = searchParams.get('new') === '1';
    router.replace(`/portfolio?tab=outfits${isNew ? '&new=1' : ''}`);
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--sf-text-secondary)' }}>
      <p>Redirecting to unified portfolio workspace...</p>
    </div>
  );
}
