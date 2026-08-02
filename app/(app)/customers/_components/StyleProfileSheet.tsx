'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import { GARMENT_STYLES, STYLE_MEASUREMENTS, DEFAULT_MEASURE_SPEC } from '@/lib/constants';
import { getStylePhotos } from '@/lib/style-photos';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import type { Customer, Measurements } from '@/lib/types';
import styles from './StyleProfileSheet.module.css';

interface StyleProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  /** A style already chosen (VIEW/EDIT on an existing card) — skips the
   *  picker and opens straight into the measurement form. Pass null for
   *  "+ NEW" / "Record Measurements", which shows the picker first. */
  initialStyle: string | null;
}

/** Two-phase sheet: pick a garment style (permanent catalog placeholder
 *  photo, gendered to the customer), then record/edit that style's saved
 *  measurement profile on the customer. */
export default function StyleProfileSheet({ isOpen, onClose, customer, initialStyle }: StyleProfileSheetProps) {
  const { updateCustomerMeasurements, updateCustomerStyleProfile, deleteCustomerStyleProfile } = useData();
  const { showToast } = useToast();
  const [styleName, setStyleName] = useState<string | null>(initialStyle);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset the form whenever the sheet (re)opens with a new target style —
  // adjusted during render, per React's guidance for resetting state in
  // response to a prop change, rather than in an effect.
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = isOpen ? `${initialStyle ?? ''}` : null;
  if (isOpen && openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setStyleName(initialStyle);
    // While per-style profiles are off, this screen is really just the
    // shared body profile — load/save the same customer.measurements
    // every other measurement surface uses, regardless of which style is
    // selected (the style only picks which fields to show).
    const existing = FEATURE_FLAGS.perStyleMeasurements
      ? (initialStyle ? customer.styleMeasurements?.[initialStyle]?.measurements : undefined)
      : customer.measurements;
    const init: Record<string, string> = {};
    if (existing) {
      Object.entries(existing).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'notes') init[k] = String(v);
      });
    }
    setValues(init);
    setActiveKey(null);
  } else if (!isOpen && prevOpenKey !== null) {
    setPrevOpenKey(null);
  }

  // Gendered — no mixed picker.
  const genderedStyles = useMemo(() => GARMENT_STYLES.filter((s) => s.gender === customer.gender), [customer.gender]);
  const stylePhotos = useMemo(() => getStylePhotos(genderedStyles), [genderedStyles]);
  // While per-style profiles are off, every style shares the one body
  // profile, so "Saved" means "the body profile has anything at all" —
  // not tracked per style name.
  const hasBodyProfile = !!customer.measurements && Object.keys(customer.measurements).length > 0;
  const profiledStyles = useMemo(
    () => (FEATURE_FLAGS.perStyleMeasurements ? new Set(Object.keys(customer.styleMeasurements || {})) : null),
    [customer.styleMeasurements]
  );
  const isStyleSaved = (name: string) => (profiledStyles ? profiledStyles.has(name) : hasBodyProfile);

  const pickableStyles = useMemo(() => {
    const extra = (customer.preferredStyles || [])
      .filter((s) => !genderedStyles.some((g) => g.name === s))
      .map((s) => ({ name: s, subtitle: 'Preferred style', keywords: [s.toLowerCase()] }));
    return [...genderedStyles, ...extra];
  }, [customer.preferredStyles, genderedStyles]);

  const spec = styleName ? STYLE_MEASUREMENTS[styleName] || DEFAULT_MEASURE_SPEC : DEFAULT_MEASURE_SPEC;

  const handleSave = async () => {
    if (!styleName) return;
    const measurements: Measurements = {};
    Object.entries(values).forEach(([key, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) (measurements as unknown as Record<string, number>)[key] = num;
    });
    if (Object.keys(measurements).length === 0) {
      showToast('Enter at least one measurement before saving', 'error');
      return;
    }
    setSaving(true);
    try {
      if (FEATURE_FLAGS.perStyleMeasurements) {
        await updateCustomerStyleProfile(customer.id, styleName, measurements);
      } else {
        // Merge into the existing body profile rather than overwrite it —
        // unlike a per-style snapshot (isolated under its own key), this
        // is the one shared record every measurement surface reads, so a
        // field this style's spec doesn't happen to show must survive.
        await updateCustomerMeasurements(customer.id, { ...customer.measurements, ...measurements });
      }
      showToast(`${styleName} profile saved`, 'success');
      onClose();
    } catch {
      showToast('Could not save — check your connection and try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!styleName) return;
    setDeleting(true);
    try {
      await deleteCustomerStyleProfile(customer.id, styleName);
      showToast(`${styleName} profile removed`, 'success');
      setConfirmingDelete(false);
      onClose();
    } catch {
      showToast('Could not remove — check your connection and try again', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={styleName ? `${styleName} Measurements` : 'Choose a Style'}
      footer={
        styleName ? (
          <div className={styles.footerRow}>
            {/* "Remove" only makes sense for a per-style profile — while
                everything shares one body profile, deleting it from here
                would clear it for every style at once, which isn't what
                tapping "Remove" on a single style card implies. Clearing
                the body profile stays available from the customer's own
                profile page. */}
            {profiledStyles?.has(styleName) && (
              <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Remove
              </Button>
            )}
            <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {styleName ? (
        <StyleMeasureForm
          spec={spec}
          values={values}
          onChange={(key, val) => setValues((prev) => ({ ...prev, [key]: val }))}
          activeKey={activeKey}
          onActiveKeyChange={setActiveKey}
          importSources={
            // This form already IS the body profile while per-style
            // profiles are off — offering to "import" it into itself
            // would be a no-op that only confuses.
            FEATURE_FLAGS.perStyleMeasurements && customer.measurements && Object.keys(customer.measurements).length > 0
              ? [{ label: 'Import from body profile', icon: 'person', measurements: customer.measurements }]
              : []
          }
        />
      ) : (
        <div className={styles.pickerGrid}>
          {pickableStyles.map((s) => (
            <button key={s.name} type="button" className={styles.pickerCard} onClick={() => setStyleName(s.name)}>
              <div className={styles.pickerPhoto}>
                {stylePhotos[s.name] ? (
                  <Image src={stylePhotos[s.name]} alt="" width={400} height={400} />
                ) : (
                  <Symbol name="checkroom" size={28} />
                )}
              </div>
              <span className={styles.pickerName}>{s.name}</span>
              {isStyleSaved(s.name) && <span className={styles.pickerBadge}>Saved</span>}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>

    <ConfirmDialog
      isOpen={confirmingDelete}
      onClose={() => setConfirmingDelete(false)}
      onConfirm={handleDelete}
      title={`Remove ${styleName} profile?`}
      description="This deletes the saved measurements for this style. It won't affect any existing orders — you'd just need to re-measure next time."
      confirmLabel="Remove"
      loading={deleting}
    />
    </>
  );
}
