'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NewOrderWizard from './_components/NewOrderWizard';
import UnifiedNewOrderForm from './_components/UnifiedNewOrderForm';
import NewBatchWizard from './_components/NewBatchWizard';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './page.module.css';

function OrderTypeSelector({ onSelect }: { onSelect: (type: 'bespoke' | 'rtw') => void }) {
  const router = useRouter();
  
  return (
    <PageLayout width="narrow" header={<TopBar title="New" showBack onBack={() => router.push(ROUTES.production)} />}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: 'var(--sf-text-primary)' }}>What are you creating?</h2>
        
        <div 
          onClick={() => onSelect('bespoke')}
          style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--sf-border-subtle)', background: 'var(--sf-bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ background: 'var(--sf-surface-hover)', padding: '12px', borderRadius: '50%' }}>
            <Symbol name="person" size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--sf-text-primary)' }}>Custom Order (Bespoke)</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--sf-text-secondary)' }}>For a specific customer with unique measurements.</p>
          </div>
        </div>

        <div 
          onClick={() => onSelect('rtw')}
          style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--sf-border-subtle)', background: 'var(--sf-bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ background: 'var(--sf-surface-hover)', padding: '12px', borderRadius: '50%' }}>
            <Symbol name="precision_manufacturing" size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--sf-text-primary)' }}>Production Batch (RTW)</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--sf-text-secondary)' }}>Create a batch of standard sizes for your shop floor.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function NewOrderPage() {
  const { currentShop, isLoaded } = useData();
  const [selectedType, setSelectedType] = useState<'bespoke' | 'rtw' | null>(null);

  if (!isLoaded) return null;

  const mode = currentShop?.businessMode || 'bespoke';

  if (mode === 'bespoke') {
    return <Suspense fallback={null}><UnifiedNewOrderForm /></Suspense>;
  }

  if (mode === 'rtw') {
    return <Suspense fallback={null}><NewBatchWizard /></Suspense>;
  }

  // Hybrid Mode
  if (!selectedType) {
    return <OrderTypeSelector onSelect={setSelectedType} />;
  }

  if (selectedType === 'rtw') {
    return <Suspense fallback={null}><NewBatchWizard /></Suspense>;
  }

  return (
    <Suspense fallback={null}>
      <UnifiedNewOrderForm />
    </Suspense>
  );
}
