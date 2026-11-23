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
  onSaved?: (item: InventoryItem) => void;
  onDeleted?: (itemId: string) => void;
}

const COMMON_PRESETS = [
  { name: 'Collar Stay / Canvas', unit: 'yards', defaultQty: 10, defaultThreshold: 4 },
  { name: 'Satin Silk Inner Lining', unit: 'yards', defaultQty: 20, defaultThreshold: 5 },
  { name: 'Black Cones Thread (40/2)', unit: 'cones', defaultQty: 5, defaultThreshold: 2 },
  { name: 'White & Off-White Thread', unit: 'cones', defaultQty: 5, defaultThreshold: 2 },
  { name: 'YKK Concealed Trouser Zips', unit: 'pcs', defaultQty: 20, defaultThreshold: 5 },
  { name: 'Heavy Agbada Interfacing', unit: 'yards', defaultQty: 10, defaultThreshold: 5 },
  { name: 'Metallic Snap Buttons', unit: 'packets', defaultQty: 5, defaultThreshold: 2 },
];

const UNIT_OPTIONS = [
  { label: 'Yards (yds)', value: 'yards' },
  { label: 'Cones', value: 'cones' },
  { label: 'Pieces (pcs)', value: 'pcs' },
  { label: 'Rolls', value: 'rolls' },
  { label: 'Packets', value: 'packets' },
];

export default function InventoryDetailSheet({ item, isOpen, onClose, onSaved, onDeleted }: InventoryDetailSheetProps) {
  const { addInventoryItem, updateInventoryItem, deleteInventoryItem } = useData();
  const { showToast } = useToast();
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('yards');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setItemName(item.itemName);
        setQuantity(item.quantity.toString());
        setUnit(item.unit || 'yards');
        setLowStockThreshold(item.lowStockThreshold?.toString() ?? '');
      } else {
        setItemName('');
        setQuantity('0');
        setUnit('yards');
        setLowStockThreshold('');
      }
    }
  }, [isOpen, item]);

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setItemName(preset.name);
    setUnit(preset.unit);
    if (!item) {
      setQuantity(preset.defaultQty.toString());
      setLowStockThreshold(preset.defaultThreshold.toString());
    }
    triggerHaptic('selection');
  };

  const handleStepQuantity = (delta: number) => {
    const current = parseFloat(quantity) || 0;
    const next = Math.max(0, current + delta);
    setQuantity(next.toString());
    triggerHaptic('selection');
  };

  const currentNum = parseFloat(quantity) || 0;
  const thresholdNum = parseFloat(lowStockThreshold) || 0;
  const isCurrentlyLow = lowStockThreshold !== '' && currentNum <= thresholdNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !quantity || !unit.trim()) return;

    setIsSubmitting(true);
    const parsedQty = parseFloat(quantity);
    const parsedThreshold = lowStockThreshold ? parseFloat(lowStockThreshold) : undefined;

    try {
      if (item) {
        await updateInventoryItem(item.id, {
          itemName: itemName.trim(),
          quantity: parsedQty,
          unit: unit.trim(),
          lowStockThreshold: parsedThreshold,
        });
        if (onSaved) {
          onSaved({
            ...item,
            itemName: itemName.trim(),
            quantity: parsedQty,
            unit: unit.trim(),
            lowStockThreshold: parsedThreshold,
            updatedAt: new Date().toISOString(),
          });
        }
        showToast('Material updated successfully', 'success');
      } else {
        await addInventoryItem({
          itemName: itemName.trim(),
          quantity: parsedQty,
          unit: unit.trim(),
          lowStockThreshold: parsedThreshold,
        });
        if (onSaved) {
          onSaved({
            id: `inv_local_${Date.now()}`,
            shopId: 'local',
            itemName: itemName.trim(),
            quantity: parsedQty,
            unit: unit.trim(),
            lowStockThreshold: parsedThreshold,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
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
    if (!item || !window.confirm('Are you sure you want to delete this material?')) return;
    
    setIsSubmitting(true);
    try {
      await deleteInventoryItem(item.id);
      if (onDeleted) onDeleted(item.id);
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title={item ? 'Edit Material' : 'Add Material to Inventory'}>
      <form onSubmit={handleSubmit} className={styles.editSheet}>

        {/* 1. Item Name with Quick Presets */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Material / Item Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Collar Canvas, Satin Silk Lining, Black Thread"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
            autoFocus
          />
          {!item && (
            <div className={styles.presetRow}>
              {COMMON_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => handleApplyPreset(p)}
                >
                  + {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Quantity with Steppers */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Quantity on Hand ({unit})
            <span className={styles.sublabel}>Amount currently in the workshop or rack</span>
          </label>
          <div className={styles.stepperRow}>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => handleStepQuantity(-1)}
              aria-label="Decrease quantity"
            >
              -1
            </button>
            <input
              type="number"
              step="any"
              min="0"
              className={styles.input}
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              style={{ textAlign: 'center', fontSize: '18px', fontWeight: 700 }}
            />
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => handleStepQuantity(1)}
              aria-label="Increase quantity by 1"
            >
              +1
            </button>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => handleStepQuantity(5)}
              aria-label="Increase quantity by 5"
              style={{ width: '44px' }}
            >
              +5
            </button>
          </div>
        </div>

        {/* 3. Measurement Unit Chips */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Measurement Unit</label>
          <div className={styles.unitPills}>
            {UNIT_OPTIONS.map((u) => (
              <button
                key={u.value}
                type="button"
                className={`${styles.unitPill} ${unit === u.value ? styles.unitPillActive : ''}`}
                onClick={() => {
                  setUnit(u.value);
                  triggerHaptic('selection');
                }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Restock Alert Threshold with Live Feedback */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Market Restock Warning Level
            <span className={styles.sublabel}>
              Warn me when stock falls to or below this amount before going to the market
            </span>
          </label>
          <input
            type="number"
            step="any"
            min="0"
            className={styles.input}
            placeholder={`e.g. 5 ${unit}`}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
          {lowStockThreshold !== '' && (
            <div
              className={`${styles.alertPreviewBox} ${
                isCurrentlyLow ? styles.alertPreviewDanger : styles.alertPreviewHealthy
              }`}
            >
              <Symbol name={isCurrentlyLow ? 'warning' : 'check_circle'} size={18} />
              <span>
                {isCurrentlyLow
                  ? `Restock Warning Active: Current stock (${currentNum} ${unit}) is at or below alert level (${thresholdNum} ${unit}). Will show a red Restock badge.`
                  : `Safe: Current stock (${currentNum} ${unit}) is healthy (above the ${thresholdNum} ${unit} alert level).`}
              </span>
            </div>
          )}
        </div>

        <Button type="submit" variant="primary" loading={isSubmitting} fullWidth style={{ marginTop: 12 }}>
          {isSubmitting ? 'Saving Material...' : item ? 'Update Material' : 'Save Material to Inventory'}
        </Button>

        {item && (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            fullWidth
            style={{ marginTop: 8 }}
          >
            Remove from Inventory
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}
