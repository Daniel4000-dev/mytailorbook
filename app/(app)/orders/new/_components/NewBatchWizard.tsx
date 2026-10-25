'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import { getSizeChartsAction } from '@/app/actions/sizeCharts';
import { SizeChart, OrderStatus, Priority } from '@/lib/types';
import styles from '../page.module.css';

export default function NewBatchWizard() {
  const router = useRouter();
  const { currentShop, addOrderBatch } = useData();
  const { showToast } = useToast();

  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [selectedChartId, setSelectedChartId] = useState('');
  const [styleName, setStyleName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentShop) {
      getSizeChartsAction(currentShop.id).then(res => {
        if (!('error' in res)) {
          setCharts(res);
        }
      });
    }
  }, [currentShop]);

  const selectedChart = charts.find(c => c.id === selectedChartId);

  const handleSubmit = async () => {
    if (!styleName.trim() || !selectedChartId) {
      showToast('Please enter a style name and select a size chart', 'error');
      return;
    }

    const batchSizes = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([size, quantity]) => ({ size, quantity }));

    if (batchSizes.length === 0) {
      showToast('Please enter at least one quantity', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const garments = [{
        orderDetails: `${styleName} (Batch Production)`,
        status: 'Documented' as OrderStatus,
        statusHistory: [],
        payments: [],
        images: [],
        inspirationImages: [],
        priority,
        dueDate: dueDate || undefined,
        styleName,
        isInternalBatch: true,
        batchSizes,
        totalBill: 0,
        depositPaid: 0,
        measurements: selectedChart?.measurements || {},
        includeTrackingLink: false,
      }];

      await addOrderBatch(garments);
      showToast('Production batch created', 'success');
      router.push(ROUTES.production);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout 
      width="narrow"
      padding="none"
      header={<TopBar title="New Production Batch" showBack onBack={() => router.push(ROUTES.production)} />}
    >
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: 'var(--sf-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--sf-border-subtle)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input 
            label="Style / Item Name" 
            placeholder="e.g. Red Summer Shirt" 
            value={styleName} 
            onChange={e => setStyleName(e.target.value)} 
          />
          <Select
            label="Size Chart"
            value={selectedChartId}
            onChange={e => setSelectedChartId(e.target.value)}
            options={[
              { value: '', label: 'Select a size chart...' },
              ...charts.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
          {selectedChart && (
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '14px', color: 'var(--sf-text-secondary)', marginBottom: '8px', display: 'block' }}>Quantities to Produce</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {Object.keys(selectedChart.measurements).map(size => (
                  <Input
                    key={size}
                    type="number"
                    label={`Size ${size}`}
                    value={quantities[size] || ''}
                    onChange={e => setQuantities(prev => ({ ...prev, [size]: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <Input 
              type="date"
              label="Target Completion Date (Optional)"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <Select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>Create Batch</Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
