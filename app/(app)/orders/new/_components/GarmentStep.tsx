import Symbol from '@/components/ui/Symbol/Symbol';
import type { Customer } from '@/lib/types';
import styles from '../page.module.css';

interface CatalogEntry {
  name: string;
  subtitle?: string;
  keywords?: string[];
  photoUrl?: string;
  gender?: string;
}

interface GarmentStepProps {
  customer: Customer | null;
  catalog: CatalogEntry[];
  counts: Record<string, number>;
  onCountChange: (name: string, delta: number) => void;
  stylePhoto: Record<string, string | undefined>;
  uploadingCustomPhoto: string | null;
  onCustomStylePhoto: (styleName: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  showCustomInput: boolean;
  onShowCustomInput: () => void;
  customDraft: string;
  onCustomDraftChange: (value: string) => void;
  onCustomDraftCommit: () => void;
}

export default function GarmentStep({
  customer,
  catalog,
  counts,
  onCountChange,
  stylePhoto,
  uploadingCustomPhoto,
  onCustomStylePhoto,
  showCustomInput,
  onShowCustomInput,
  customDraft,
  onCustomDraftChange,
  onCustomDraftCommit,
}: GarmentStepProps) {
  return (
    <div className={styles.col}>
      <div>
        <h2 className={styles.stepTitle}>Select Garments</h2>
        <p className={styles.stepSub}>
          For {customer?.fullName} — tap a style to add it, use the stepper for more of the same.
        </p>
      </div>
      <div className={styles.garmentGrid}>
        {catalog.map((s) => {
          const count = counts[s.name] || 0;
          const photo = stylePhoto[s.name];
          return (
            <div
              key={s.name}
              className={`${styles.garmentCard} ${count > 0 ? styles.garmentCardSelected : ''}`}
              onClick={() => onCountChange(s.name, 1)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.garmentPhoto}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={s.name} />
                ) : s.subtitle === 'Custom item' ? (
                  <label
                    className={styles.addPhotoLabel}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingCustomPhoto === s.name}
                      onChange={(e) => onCustomStylePhoto(s.name, e)}
                    />
                    <Symbol name={uploadingCustomPhoto === s.name ? 'progress_activity' : 'add_a_photo'} size={22} />
                    <span>{uploadingCustomPhoto === s.name ? 'Uploading…' : 'Add photo'}</span>
                  </label>
                ) : (
                  <span className={styles.garmentInitial}>{s.name[0]}</span>
                )}
                <div className={styles.garmentShade} />
              </div>
              {count > 0 ? (
                <div className={styles.stepper} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Remove one ${s.name}`}
                    onClick={() => onCountChange(s.name, -1)}
                  >
                    <Symbol name="remove" size={18} />
                  </button>
                  <span>{count}</span>
                  <button
                    type="button"
                    className={styles.stepperAdd}
                    aria-label={`Add one ${s.name}`}
                    onClick={() => onCountChange(s.name, 1)}
                  >
                    <Symbol name="add" size={18} />
                  </button>
                </div>
              ) : (
                <span className={styles.addBubble} aria-hidden="true">
                  <Symbol name="add" size={20} />
                </span>
              )}
              {count > 0 && <span className={styles.countBadge}>x{count}</span>}
              <div className={styles.garmentLabel}>
                <h3>{s.name}</h3>
                <p>{s.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
      {showCustomInput ? (
        <input
          autoFocus
          className={styles.customInput}
          placeholder="Garment name, e.g. Choir Robe…"
          value={customDraft}
          onChange={(e) => onCustomDraftChange(e.target.value)}
          onBlur={onCustomDraftCommit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      ) : (
        <button type="button" className={styles.customBtn} onClick={onShowCustomInput}>
          <Symbol name="add_circle" size={22} />
          Add Custom Item
        </button>
      )}
    </div>
  );
}
