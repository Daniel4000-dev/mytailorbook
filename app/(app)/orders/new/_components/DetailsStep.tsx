import React, { useState } from 'react';
import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { formatNumber, getCurrencySymbol } from '@/lib/formatters';
import { useData } from '@/contexts/DataContext';
import { checkWeeklyCapacity } from '@/app/actions/calendar';
import type { Customer, Priority, User } from '@/lib/types';
import styles from '../page.module.css';

export interface UnitDraft {
  key: string;
  styleName: string;
  details: string;
  totalBill: string;
  depositPaid: string;
  dueDate: string;
  assignedTo: string;
  inspirationImages: string[];
  materialSuppliedBy: 'shop' | 'customer';
  materialCost: string;
  otherCosts: string;
}

interface DetailsStepProps {
  customer: Customer | null;
  error: string;
  units: UnitDraft[];
  onUpdateUnit: (key: string, patch: Partial<UnitDraft>) => void;
  staffMembers: User[];
  currentUserUid: string | undefined;
  uploadingKey: string | null;
  onInspoUpload: (unitKey: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

export default function DetailsStep({
  customer,
  error,
  units,
  onUpdateUnit,
  staffMembers,
  currentUserUid,
  uploadingKey,
  onInspoUpload,
  priority,
  onPriorityChange,
}: DetailsStepProps) {
  const { currentShop } = useData();
  const currencySymbol = getCurrencySymbol(currentShop?.currency || 'NGN');
  const [stashPickerKey, setStashPickerKey] = useState<string | null>(null);
  
  const [capacityWarning, setCapacityWarning] = useState<{
    overCapacity: boolean;
    currentLoad: number;
    weeklyCapacity: number;
  } | null>(null);

  React.useEffect(() => {
    // Just check the first unit's due date to avoid multiple alerts for batched orders.
    // They usually share a due date or are close together anyway.
    const firstDate = units.find(u => u.dueDate)?.dueDate;
    if (!firstDate || !currentShop?.id) {
      setCapacityWarning(null);
      return;
    }

    const check = async () => {
      try {
        const res = await checkWeeklyCapacity(currentShop.id, firstDate);
        setCapacityWarning(res);
      } catch (e) {
        // Ignore silently, don't break order creation for this
      }
    };
    check();
  }, [units.find(u => u.dueDate)?.dueDate, currentShop?.id]);

  return (
    <div className={styles.col}>
      <div>
        <h2 className={styles.stepTitle}>Order Details</h2>
        <p className={styles.stepSub}>Price and schedule each piece for {customer?.fullName}.</p>
      </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {capacityWarning?.overCapacity && (
          <div style={{ backgroundColor: 'var(--sf-accent-red-light)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <Symbol name="warning" fill style={{ color: 'var(--sf-accent-red)' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--sf-accent-red)' }}>High Volume Week</p>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--sf-accent-red)', marginTop: '4px' }}>
                You already have {capacityWarning.currentLoad} orders due this week (Capacity: {capacityWarning.weeklyCapacity}). Consider negotiating a later deadline.
              </p>
            </div>
          </div>
        )}

        {units.map((u, i) => (
        <section key={u.key} className={styles.unitCard}>
          <header className={styles.unitHeader}>
            <span className={styles.unitNum}>{i + 1}</span>
            <input
              className={styles.unitName}
              value={u.details}
              onChange={(e) => onUpdateUnit(u.key, { details: e.target.value })}
              aria-label="Garment description"
            />
          </header>
          <div className={styles.unitGrid}>
            <div className={styles.unitField}>
              <label className={styles.capsLabel}>Total Bill ({currencySymbol})</label>
              <input
                className={styles.unitInput}
                inputMode="numeric"
                placeholder="0"
                value={u.totalBill ? formatNumber(Number(u.totalBill)) : ''}
                onChange={(e) => onUpdateUnit(u.key, { totalBill: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>
            <div className={styles.unitField}>
              <label className={styles.capsLabel}>Deposit Paid ({currencySymbol})</label>
              <input
                className={styles.unitInput}
                inputMode="numeric"
                placeholder="0"
                value={u.depositPaid ? formatNumber(Number(u.depositPaid)) : ''}
                onChange={(e) => onUpdateUnit(u.key, { depositPaid: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>
            <div className={styles.unitField}>
              <label className={styles.capsLabel}>Due Date</label>
              <input
                className={styles.unitInput}
                type="date"
                value={u.dueDate}
                onChange={(e) => onUpdateUnit(u.key, { dueDate: e.target.value })}
              />
            </div>
            <div className={styles.unitField}>
              <label className={styles.capsLabel}>Assign To</label>
              <select
                className={styles.unitInput}
                value={u.assignedTo}
                onChange={(e) => onUpdateUnit(u.key, { assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {staffMembers
                  .filter((s) => s.active !== false)
                  .map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.uid === currentUserUid ? `${s.name} (You)` : s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {FEATURE_FLAGS.costMarginTracking && (
            <div className={styles.costSection}>
              <span className={styles.capsLabel}>Cost &amp; Margin (optional)</span>
              <div className={styles.unitGrid}>
                <div className={styles.unitField}>
                  <label className={styles.capsLabel}>Material Supplied By</label>
                  <select
                    className={styles.unitInput}
                    value={u.materialSuppliedBy}
                    onChange={(e) => onUpdateUnit(u.key, { materialSuppliedBy: e.target.value as 'shop' | 'customer' })}
                  >
                    <option value="shop">Shop</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                {u.materialSuppliedBy === 'shop' && (
                  <div className={styles.unitField}>
                    <label className={styles.capsLabel}>Material Cost ({currencySymbol})</label>
                    <input
                      className={styles.unitInput}
                      inputMode="numeric"
                      placeholder="0"
                      value={u.materialCost ? formatNumber(Number(u.materialCost)) : ''}
                      onChange={(e) => onUpdateUnit(u.key, { materialCost: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                )}
                <div className={styles.unitField}>
                  <label className={styles.capsLabel}>Other Costs ({currencySymbol})</label>
                  <input
                    className={styles.unitInput}
                    inputMode="numeric"
                    placeholder="Thread, buttons, outsourced labor…"
                    value={u.otherCosts ? formatNumber(Number(u.otherCosts)) : ''}
                    onChange={(e) => onUpdateUnit(u.key, { otherCosts: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                </div>
              </div>
            </div>
          )}
          <div className={styles.inspoRow}>
            {u.inspirationImages.map((url, idx) => (
              <span key={idx} className={styles.inspoThumb}>
                <Image src={url} alt="Inspiration" width={200} height={200} />
                <button
                  type="button"
                  aria-label="Remove inspiration photo"
                  onClick={() => onUpdateUnit(u.key, { inspirationImages: u.inspirationImages.filter((_, j) => j !== idx) })}
                >
                  <Symbol name="close" size={12} />
                </button>
              </span>
            ))}
            <label className={styles.inspoAdd}>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => onInspoUpload(u.key, e)} disabled={uploadingKey === u.key} />
              <Symbol name="add_photo_alternate" size={18} />
              {uploadingKey === u.key ? 'Uploading…' : 'Add'}
            </label>
            {customer?.fabrics && customer.fabrics.length > 0 && (
              <button type="button" className={styles.inspoAdd} onClick={() => setStashPickerKey(u.key)}>
                <Symbol name="texture" size={18} />
                Stash
              </button>
            )}
          </div>
        </section>
      ))}

      <BottomSheet isOpen={!!stashPickerKey} onClose={() => setStashPickerKey(null)} variant="modal" title="Choose from Stash">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 16 }}>
          {customer?.fabrics?.map((photo, i) => (
            <div
              key={i}
              style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
              onClick={() => {
                if (stashPickerKey) {
                  const unit = units.find((u) => u.key === stashPickerKey);
                  if (unit && !unit.inspirationImages.includes(photo.url)) {
                    onUpdateUnit(stashPickerKey, { inspirationImages: [...unit.inspirationImages, photo.url] });
                  }
                  setStashPickerKey(null);
                }
              }}
            >
              <Image src={photo.url} alt={`Stash ${i}`} width={200} height={200} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
          ))}
        </div>
      </BottomSheet>

      <section className={styles.orderLevel}>
        <div className={styles.unitField}>
          <label className={styles.capsLabel}>Priority</label>
          <select className={styles.unitInput} value={priority} onChange={(e) => onPriorityChange(e.target.value as Priority)}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="rush">Rush</option>
          </select>
        </div>
        <div className={styles.unitField}>
          <label className={styles.capsLabel}>Starting Stage</label>
          {/* Always locked to Documented — orders begin at the first stage. */}
          <div className={styles.unitInput} style={{ display: 'flex', alignItems: 'center', color: 'var(--sf-text-tertiary)', userSelect: 'none' }}>
            Documented
          </div>
        </div>
      </section>
    </div>
  );
}
