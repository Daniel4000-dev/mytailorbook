import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { formatNumber } from '@/lib/formatters';
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
  return (
    <div className={styles.col}>
      <div>
        <h2 className={styles.stepTitle}>Order Details</h2>
        <p className={styles.stepSub}>Price and schedule each piece for {customer?.fullName}.</p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

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
              <label className={styles.capsLabel}>Total Bill (₦)</label>
              <input
                className={styles.unitInput}
                inputMode="numeric"
                placeholder="0"
                value={u.totalBill ? formatNumber(Number(u.totalBill)) : ''}
                onChange={(e) => onUpdateUnit(u.key, { totalBill: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>
            <div className={styles.unitField}>
              <label className={styles.capsLabel}>Deposit Paid (₦)</label>
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
                    <label className={styles.capsLabel}>Material Cost (₦)</label>
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
                  <label className={styles.capsLabel}>Other Costs (₦)</label>
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
              {uploadingKey === u.key ? 'Uploading…' : 'Inspo'}
            </label>
          </div>
        </section>
      ))}

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
