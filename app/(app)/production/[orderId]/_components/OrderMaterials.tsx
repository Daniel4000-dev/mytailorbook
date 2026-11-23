'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import { assignMaterialToOrderAction, getOrderMaterialsAction } from '@/app/actions';
import { useToast } from '@/contexts/ToastContext';
import styles from '../page.module.css';

interface OrderMaterialsProps {
  orderId: string;
  shopId: string;
}

export default function OrderMaterials({ orderId, shopId }: OrderMaterialsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { inventory } = useData();
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && loading) {
      loadMaterials();
    }
  }, [isOpen, loading]);

  const loadMaterials = async () => {
    const data = await getOrderMaterialsAction(orderId);
    if (!('error' in data)) {
      setMaterials(data as any[]);
    }
    setLoading(false);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !quantity) return;

    setSubmitting(true);
    try {
      const res = await assignMaterialToOrderAction(shopId, orderId, selectedItemId, parseFloat(quantity));
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Material assigned and deducted from inventory');
        setIsAdding(false);
        setSelectedItemId('');
        setQuantity('');
        loadMaterials();
      }
    } catch (err) {
      showToast('Failed to assign material', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button className={styles.sectionHeader} onClick={() => setIsOpen(true)}>
        <div className={styles.sectionTitleWrap}>
          <Symbol name="inventory_2" size={20} />
          <h2 className={styles.sectionTitle}>Materials Used</h2>
        </div>
        <Symbol name="chevron_right" size={20} className={styles.sectionChevron} />
      </button>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>
        <div className={styles.sectionTitleWrap}>
          <Symbol name="inventory_2" size={20} />
          <h2 className={styles.sectionTitle}>Materials Used</h2>
        </div>
        <Symbol name="expand_more" size={20} className={styles.sectionChevron} />
      </div>

      <div className={styles.sectionContent}>
        {loading ? (
          <div className={styles.loadingState}>Loading...</div>
        ) : (
          <div className={styles.expenseList}>
            {materials.map((m) => (
              <div key={m.id} className={styles.expenseItem}>
                <div className={styles.expenseIcon}>
                  <Symbol name="texture" size={16} />
                </div>
                <div className={styles.expenseInfo}>
                  <span className={styles.expenseCategory}>{m.inventory?.item_name || 'Unknown Item'}</span>
                </div>
                <div className={styles.expenseAmountWrap}>
                  <span className={styles.expenseAmount}>
                    {m.quantity} {m.inventory?.unit || ''}
                  </span>
                </div>
              </div>
            ))}
            {materials.length === 0 && !isAdding && (
              <p className={styles.emptyText}>No materials recorded yet.</p>
            )}
          </div>
        )}

        {!isAdding ? (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsAdding(true)}
            style={{ marginTop: 16 }}
          >
            + Assign Material
          </Button>
        ) : (
          <form onSubmit={handleAssign} style={{ marginTop: 16, background: 'var(--sf-surface-variant)', padding: 16, borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>Assign & Deduct Material</h4>
            
            <div style={{ marginBottom: 12 }}>
              <Select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                required
                options={[
                  { label: 'Select inventory item...', value: '' },
                  ...inventory.map(item => ({
                    label: `${item.itemName} (${item.quantity} ${item.unit} available)`,
                    value: item.id
                  }))
                ]}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Input
                type="number"
                step="0.01"
                placeholder="Quantity used"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" loading={submitting} style={{ flex: 1 }}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
