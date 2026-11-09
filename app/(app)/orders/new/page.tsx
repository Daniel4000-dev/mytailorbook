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
    <PageLayout width="narrow" padding="none" header={<TopBar title="New Order" showBack onBack={() => router.push(ROUTES.production)} />}>
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
            <h3 className={styles.typeOptionTitle}>Custom Order</h3>
            <p className={styles.typeOptionDesc}>For a specific customer with custom measurements and styles.</p>
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
            <h3 className={styles.typeOptionTitle}>Ready-to-Wear (RTW)</h3>
            <p className={styles.typeOptionDesc}>Create standard sizes (S, M, L, XL) for shop inventory.</p>
          </div>
          <Symbol name="chevron_right" size={20} className={styles.typeChevron} />
        </button>
      </div>
    </PageLayout>
  );
}

export default function NewOrderPage() {
  const router = useRouter();
  const { currentShop, isLoaded } = useData();
  const [selectedType, setSelectedType] = useState<'bespoke' | 'rtw' | null>(null);

  const mode = currentShop?.businessMode || 'bespoke';

  // In pure RTW mode, all order intake is rack inventory & sales intake.
  // Direct access to /orders/new cleanly redirects to the Stock intake flow.
  if (isLoaded && mode === 'rtw') {
    router.replace(`${ROUTES.stock}?action=add`);
    return null;
  }

  if (!isLoaded) return null;

  if (mode === 'bespoke') {
    return <Suspense fallback={null}><UnifiedNewOrderForm /></Suspense>;
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
