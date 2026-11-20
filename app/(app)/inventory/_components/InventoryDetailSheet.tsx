'use client';

import { useState, useEffect } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { triggerHaptic } from '@/lib/haptics';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import type { InventoryItem } from '@/lib/types';
import styles from '../page.module.css';

interface InventoryDetailSheetProps {
  item?: InventoryItem; // undefined means "new item" mode
  isOpen: boolean;
  onClose: () => void;
}

export default function InventoryDetailSheet({ item, isOpen, onClose }: InventoryDetailSheetProps) {
  const { addInventoryItem, updateInventoryItem, deleteInventoryItem } = useData();
  const { showToast } = useToast();
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('yards');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setItemName(item.itemName);
        setQuantity(item.quantity.toString());
        setUnit(item.unit);
        setLowStockThreshold(item.lowStockThreshold?.toString() ?? '');
      } else {
        setItemName('');
        setQuantity('0');
        setUnit('yards');
        setLowStockThreshold('');
      }
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !quantity || !unit.trim()) return;

    setIsSubmitting(true);
    try {
      if (item) {
        await updateInventoryItem(item.id, {
          itemName: itemName.trim(),
          quantity: parseFloat(quantity),
          unit: unit.trim(),
          lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : undefined,
        });
        showToast('Material updated successfully', 'success');
      } else {
        await addInventoryItem({
          itemName: itemName.trim(),
          quantity: parseFloat(quantity),
          unit: unit.trim(),
          lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : undefined,
        });
        showToast('Material added to inventory', 'success');
      }
      triggerHaptic('success');
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to save material', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !window.confirm('Are you sure you want to delete this item?')) return;
    
    setIsSubmitting(true);
    try {
      await deleteInventoryItem(item.id);
      showToast('Material deleted from inventory', 'info');
      triggerHaptic('selection');
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to delete material', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={item ? 'Edit Item' : 'New Material'}>
      <form onSubmit={handleSubmit} className={styles.editSheet}>

        <div className={styles.formGroup}>
          <label className={styles.label}>Item Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Black Thread, Interfacing"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Quantity</label>
            <input
              type="number"
              step="0.01"
              className={styles.input}
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Unit</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. yards, cones, pieces"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Low Stock Alert At (Optional)</label>
          <input
            type="number"
            step="0.01"
            className={styles.input}
            placeholder="Alert me when it falls below..."
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" loading={isSubmitting} fullWidth style={{ marginTop: 12 }}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>

        {item && (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={isSubmitting} fullWidth style={{ marginTop: 12 }}>
            Delete Item
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}
