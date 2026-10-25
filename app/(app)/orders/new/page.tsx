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
    <PageLayout width="narrow" padding="none" header={<TopBar title="New Intake" showBack onBack={() => router.push(ROUTES.production)} />}>
      <div className={styles.selectorContainer}>
        <h2 className={styles.selectorTitle}>What are you creating?</h2>
        <p className={styles.selectorSubtitle}>Select the production workflow for this order</p>
        
        <button 
          type="button"
          onClick={() => onSelect('bespoke')}
          className={styles.typeOptionCard}
        >
          <div className={styles.typeIconWrap}>
            <Symbol name="person" size={24} />
          </div>
          <div className={styles.typeTextWrap}>
            <h3 className={styles.typeOptionTitle}>Custom Order (Bespoke)</h3>
            <p className={styles.typeOptionDesc}>For a specific customer with unique measurements and style choices.</p>
          </div>
          <Symbol name="chevron_right" size={20} className={styles.typeChevron} />
        </button>

        <button 
          type="button"
          onClick={() => onSelect('rtw')}
          className={styles.typeOptionCard}
        >
          <div className={styles.typeIconWrap}>
            <Symbol name="precision_manufacturing" size={24} />
          </div>
          <div className={styles.typeTextWrap}>
            <h3 className={styles.typeOptionTitle}>Production Batch (RTW)</h3>
            <p className={styles.typeOptionDesc}>Create a batch of standard sizes for your shop floor or retail inventory.</p>
          </div>
          <Symbol name="chevron_right" size={20} className={styles.typeChevron} />
        </button>
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
