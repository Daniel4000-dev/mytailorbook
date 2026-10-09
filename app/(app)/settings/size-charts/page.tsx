'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { getSizeChartsAction, createSizeChartAction, updateSizeChartAction, deleteSizeChartAction } from '@/app/actions/sizeCharts';
import { SizeChart } from '@/lib/types';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

export default function SizeChartsPage() {
  const router = useRouter();
  const { currentShop, isLoaded: dataLoaded } = useData();
  const { isOwner, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<SizeChart | null>(null);
  const [name, setName] = useState('');
  const [measurementsText, setMeasurementsText] = useState(''); // Simple format: S: Chest 40, L 30\nM: Chest 42, L 32
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (currentShop) {
      loadCharts();
    }
  }, [currentShop]);

  const loadCharts = async () => {
    if (!currentShop) return;
    setLoading(true);
    const res = await getSizeChartsAction(currentShop.id);
    if ('error' in res) {
      showToast(res.error, 'error');
    } else {
      setCharts(res);
    }
    setLoading(false);
  };

  const openSheet = (chart?: SizeChart) => {
    if (chart) {
      setEditingChart(chart);
      setName(chart.name);
      setMeasurementsText(Object.entries(chart.measurements).map(([k, v]) => `${k}: ${v}`).join('\n'));
    } else {
      setEditingChart(null);
      setName('');
      setMeasurementsText('');
    }
    setSheetOpen(true);
  };

  const parseMeasurements = (text: string) => {
    const lines = text.split('\n');
    const result: Record<string, string> = {};
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key && value) result[key] = value;
      }
    }
    return result;
  };

  const handleSave = async () => {
    if (!name.trim() || !currentShop) return;
    setSaving(true);
    const measurements = parseMeasurements(measurementsText);
    
    let err;
    if (editingChart) {
      const res = await updateSizeChartAction(editingChart.id, name, measurements);
      err = res.error;
    } else {
      const res = await createSizeChartAction(currentShop.id, name, measurements);
      err = res.error;
    }
    
    if (err) {
      showToast(err, 'error');
    } else {
      showToast('Size chart saved', 'success');
      setSheetOpen(false);
      loadCharts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    const res = await deleteSizeChartAction(id);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Size chart deleted', 'success');
      loadCharts();
    }
  };

  if (!dataLoaded || authLoading || loading) return null;
  if (!isOwner) return <div style={{ padding: '40px' }}>Access Denied</div>;

  return (
    <PageLayout 
      width="narrow" 
      header={
        <TopBar 
          title="Size Charts" 
          showBack={!isDesktop} 
          onBack={() => router.push(ROUTES.settings)} 
          rightAction={
            <Button variant="primary" onClick={() => openSheet()}><Symbol name="add" size={20} /> New</Button>
          }
        />
      }
    >
      {charts.length === 0 ? (
        <EmptyState 
          icon="straighten" 
          title="No size charts yet" 
          description="Define standard measurements for your Ready-to-Wear batches (e.g. S, M, L)."
          action={{ label: 'Create Chart', onClick: () => openSheet() }} 
        />
      ) : (
        <div className={styles.list}>
          {charts.map(chart => (
            <div key={chart.id} className={styles.card} onClick={() => openSheet(chart)}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{chart.name}</h3>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setConfirmDelete(chart.id); }}><Symbol name="delete" size={20} /></Button>
              </div>
              <div className={styles.measurements}>
                {Object.entries(chart.measurements).map(([k, v]) => (
                  <div key={k} className={styles.measurementRow}>
                    <span className={styles.sizeKey}>{k}</span>
                    <span className={styles.sizeValue}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className={styles.sheetContent}>
          <h2>{editingChart ? 'Edit Size Chart' : 'New Size Chart'}</h2>
          <Input 
            label="Chart Name" 
            placeholder="e.g. Men's Casual Shirts" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
          <div className={styles.textareaWrap}>
            <label>Measurements (One per line, format: "Size: Measurements")</label>
            <textarea 
              placeholder="S: Chest 40, Length 30&#10;M: Chest 42, Length 31"
              value={measurementsText}
              onChange={e => setMeasurementsText(e.target.value)}
              className={styles.textarea}
              rows={6}
            />
          </div>
          <Button variant="primary" onClick={handleSave} loading={saving} style={{ width: '100%', marginTop: '16px' }}>Save Chart</Button>
        </div>
      </BottomSheet>

      <ConfirmDialog 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Size Chart?"
        description="Are you sure you want to delete this size chart? Production batches using it will keep their stored copy, but it won't be available for new batches."
        confirmLabel="Delete"
        destructive
      />
    </PageLayout>
  );
}
