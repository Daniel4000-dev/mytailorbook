'use client';

import { useRef } from 'react';
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
}: StyleMeasureFormProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
        {spec.points.map((p, i) => (
          <div key={p.key} className={`${styles.measureCard} ${activeKey === p.key ? styles.measureCardActive : ''}`}>
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
                onFocus={() => onActiveKeyChange?.(p.key)}
                onChange={(e) => onChange(p.key, e.target.value)}
              />
            </div>
            <span className={styles.unitTag}>IN</span>
          </div>
        ))}
      </div>
    </div>
  );
}
