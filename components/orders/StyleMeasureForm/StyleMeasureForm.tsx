'use client';

import { useRef, useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import MeasureGuide from '@/components/orders/MeasureGuide/MeasureGuide';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import type { StyleMeasureSpec } from '@/lib/constants';
import type { Measurements } from '@/lib/types';
import styles from './StyleMeasureForm.module.css';

export interface MeasureImportSource {
  label: string;
  icon: string;
  measurements: Measurements;
  onImported?: () => void;
}

interface StyleMeasureFormProps {
  spec: StyleMeasureSpec;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  importSources?: MeasureImportSource[];
  activeKey?: string | null;
  onActiveKeyChange?: (key: string) => void;
  /** Keys pre-filled from the customer's body profile — rendered read-only
   *  until the tailor unchecks that field's lock, so an auto-filled body
   *  number can't be silently overwritten mid-fitting. */
  lockedKeys?: Set<string>;
  onToggleLock?: (key: string) => void;
  /** Points this style's spec doesn't already cover, picked from the
   *  customer's full body-measurement catalog rather than freely typed —
   *  keeps keys canonical so a body-profile value can be imported by key,
   *  not just by guessing a matching label. Omit (or empty) to hide the
   *  affordance — the customer profile's per-style editor doesn't offer this. */
  addableFields?: { key: string; label: string; hasBodyValue: boolean }[];
  onAddField?: (field: { key: string; label: string }) => void;
}

/** Guide + import shortcuts + per-point input cards for one garment style's
 *  measurements — shared by the order wizard's measure step and the customer
 *  profile's per-style measurement editor so both stay in sync. */
export default function StyleMeasureForm({
  spec,
  values,
  onChange,
  importSources = [],
  activeKey,
  onActiveKeyChange,
  lockedKeys,
  onToggleLock,
  addableFields = [],
  onAddField,
}: StyleMeasureFormProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const pickField = (field: { key: string; label: string }) => {
    onAddField?.(field);
    setPickerOpen(false);
  };

  const importValues = (source: MeasureImportSource) => {
    Object.entries(source.measurements).forEach(([key, val]) => {
      if (val !== undefined && val !== null && key !== 'notes') onChange(key, String(val));
    });
    source.onImported?.();
  };

  return (
    <div className={styles.wrap}>
      {FEATURE_FLAGS.measureGuideDiagram && spec.hasDiagram !== false && (
        <MeasureGuide
          spec={spec}
          activeKey={activeKey}
          filledKeys={Object.keys(values).filter((k) => values[k])}
          onPointTap={(key) => {
            onActiveKeyChange?.(key);
            inputRefs.current[key]?.focus();
          }}
        />
      )}

      {importSources.length > 0 && (
        <div className={styles.importRow}>
          {importSources.map((src) => (
            <button
              key={src.label}
              type="button"
              className={styles.importBtn}
              onClick={() => importValues(src)}
            >
              <Symbol name={src.icon} size={18} />
              {src.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.measureList}>
        {spec.points.map((p, i) => {
          const isLocked = lockedKeys?.has(p.key) ?? false;
          return (
            <div key={p.key} className={`${styles.measureCard} ${activeKey === p.key ? styles.measureCardActive : ''} ${isLocked ? styles.measureCardLocked : ''}`}>
              <div className={styles.measureMain}>
                <label className={styles.measureLabel} htmlFor={`m-${p.key}`}>
                  {i + 1}. {p.label}
                </label>
                <span className={styles.measureHint}>{p.hint}</span>
                <input
                  id={`m-${p.key}`}
                  ref={(el) => { inputRefs.current[p.key] = el; }}
                  className={styles.measureInput}
                  type="number"
                  inputMode="decimal"
                  placeholder="00.0"
                  value={values[p.key] || ''}
                  readOnly={isLocked}
                  onFocus={() => onActiveKeyChange?.(p.key)}
                  onChange={(e) => onChange(p.key, e.target.value)}
                />
              </div>
              {isLocked && onToggleLock ? (
                <label className={styles.lockToggle} title="From body profile — uncheck to edit">
                  <input type="checkbox" checked={isLocked} onChange={() => onToggleLock(p.key)} />
                  <Symbol name="lock" size={16} />
                </label>
              ) : (
                <span className={styles.unitTag}>IN</span>
              )}
            </div>
          );
        })}
      </div>

      {onAddField && addableFields.length > 0 && (
        pickerOpen ? (
          <div className={styles.addFieldPicker}>
            <div className={styles.addFieldPickerHeader}>
              <span>Add a measurement</span>
              <button type="button" className={styles.addFieldCancel} onClick={() => setPickerOpen(false)} aria-label="Close">
                <Symbol name="close" size={18} />
              </button>
            </div>
            <div className={styles.addFieldList}>
              {addableFields.map((f) => (
                <button key={f.key} type="button" className={styles.addFieldOption} onClick={() => pickField(f)}>
                  <span>{f.label}</span>
                  {f.hasBodyValue && (
                    <span className={styles.addFieldRecorded}>
                      <Symbol name="check_circle" size={14} />
                      Already recorded
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" className={styles.addFieldBtn} onClick={() => setPickerOpen(true)}>
            <Symbol name="add" size={18} />
            Add a measurement
          </button>
        )
      )}
    </div>
  );
}
