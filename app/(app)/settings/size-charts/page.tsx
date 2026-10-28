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

const MOCK_SIZE_CHARTS: SizeChart[] = [
  {
    id: 'mock-sc-1',
    shopId: 'mock-shop',
    name: 'Standard Men Kaftan & Senator',
    measurements: {
      'S (Small)': 'Chest 38", Shoulder 17.5", Length 38", Trouser 40"',
      'M (Medium)': 'Chest 40", Shoulder 18.5", Length 40", Trouser 41"',
      'L (Large)': 'Chest 42", Shoulder 19.5", Length 42", Trouser 42"',
      'XL (Extra Large)': 'Chest 45", Shoulder 20.5", Length 44", Trouser 43"',
      'XXL (2X Large)': 'Chest 48", Shoulder 21.5", Length 45", Trouser 44"',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-sc-2',
    shopId: 'mock-shop',
    name: 'Ladies Boubou & Kaftan Free-Size',
    measurements: {
      'Petite (UK 8-10)': 'Bust 34-36", Length 58", Sleeve 22"',
      'Regular (UK 12-14)': 'Bust 38-40", Length 60", Sleeve 23"',
      'Plus (UK 16-18)': 'Bust 42-46", Length 62", Sleeve 24"',
      'Grand Curve (UK 20+)': 'Bust 48-52", Length 62", Sleeve 24"',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
    if (!currentShop) {
      setCharts(MOCK_SIZE_CHARTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getSizeChartsAction(currentShop.id);
      if ('error' in res || res.length === 0) {
        setCharts(MOCK_SIZE_CHARTS);
      } else {
        setCharts(res);
      }
    } catch {
      setCharts(MOCK_SIZE_CHARTS);
    } finally {
      setLoading(false);
    }
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
    if (!name.trim()) return;
    setSaving(true);
    const measurements = parseMeasurements(measurementsText);
    
    if (editingChart?.id.startsWith('mock-') || !currentShop) {
      if (editingChart) {
        setCharts((prev) => prev.map((c) => (c.id === editingChart.id ? { ...c, name, measurements } : c)));
      } else {
        const newChart: SizeChart = {
          id: `mock-sc-${Date.now()}`,
          shopId: currentShop?.id || 'mock-shop',
          name,
          measurements,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCharts((prev) => [...prev, newChart]);
      }
      showToast('Size chart saved', 'success');
      setSheetOpen(false);
      setSaving(false);
      return;
    }

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
    if (id.startsWith('mock-') || !currentShop) {
      setCharts((prev) => prev.filter((c) => c.id !== id));
      showToast('Size chart deleted', 'success');
      return;
    }
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
