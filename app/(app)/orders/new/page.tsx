'use client';

import { Suspense } from 'react';
import NewOrderWizard from './_components/NewOrderWizard';

export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrderWizard />
    </Suspense>
  );
}
