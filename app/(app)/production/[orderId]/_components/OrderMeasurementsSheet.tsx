'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import { useData } from '@/contexts/DataContext';
import { STYLE_MEASUREMENTS, DEFAULT_MEASURE_SPEC, buildCustomStyleSpec } from '@/lib/constants';
import type { Customer, Measurements, Order, Shop } from '@/lib/types';
import styles from '../page.module.css';

interface OrderMeasurementsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customer: Customer | null;
  currentShop: Shop | null;
  onSave: (measurements: Measurements) => Promise<void>;
}

/** Corrects THIS order's own recorded measurements — e.g. after a fitting
 *  reveals the numbers taken at intake were off. Deliberately separate from
 *  both the customer's body profile and their saved style-profile template:
 *  fixing what was cut for one garment shouldn't silently rewrite either of
 *  those, any more than creating the order did (see NewOrderWizard). */
export default function OrderMeasurementsSheet({ isOpen, onClose, order, customer, currentShop, onSave }: OrderMeasurementsSheetProps) {
  const { updateCustomerStyleProfile, updateCustomerMeasurements } = useData();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    Object.entries(order.measurements || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'notes') init[k] = String(v);
    });
    return init;
  });
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Same split as the wizard: a corrected fit is the normal thing to want
  // reflected in the saved template next time, so this defaults on; the
  // body profile is the client's actual body, which a garment-fit
  // correction doesn't necessarily represent, so that stays a deliberate
  // opt-in.
  const [saveStyleProfile, setSaveStyleProfile] = useState(true);
  const [updateBodyProfile, setUpdateBodyProfile] = useState(false);

  const spec = (() => {
    if (!order.styleName) return DEFAULT_MEASURE_SPEC;
    if (STYLE_MEASUREMENTS[order.styleName]) return STYLE_MEASUREMENTS[order.styleName];
    const custom = currentShop?.customStyles?.find((s) => s.name === order.styleName);
    if (custom?.measurementFields && custom.measurementFields.length > 0) {
      return buildCustomStyleSpec(custom.measurementFields);
    }
    return DEFAULT_MEASURE_SPEC;
  })();

  const handleSave = async () => {
    const measurements: Measurements = {};
    Object.entries(values).forEach(([key, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) (measurements as unknown as Record<string, number>)[key] = num;
    });
    setSaving(true);
    try {
      await onSave(measurements);
      if (Object.keys(measurements).length > 0 && customer) {
        if (saveStyleProfile && order.styleName) {
          await updateCustomerStyleProfile(customer.id, order.styleName, measurements).catch(() => {});
        }
        if (updateBodyProfile) {
          await updateCustomerMeasurements(customer.id, { ...customer.measurements, ...measurements }).catch(() => {});
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${order.styleName || 'Order'} Measurements`}
      footer={
        <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Measurements'}
        </Button>
      }
    >
      <StyleMeasureForm
        spec={spec}
        values={values}
        onChange={(key, val) => setValues((prev) => ({ ...prev, [key]: val }))}
        activeKey={activeKey}
        onActiveKeyChange={setActiveKey}
        importSources={[
          ...(order.styleName && customer?.styleMeasurements?.[order.styleName]
            ? [{
                label: `Import from saved ${order.styleName} profile`,
                icon: 'bookmark',
                measurements: customer.styleMeasurements[order.styleName].measurements,
              }]
            : []),
          ...(customer?.measurements && Object.keys(customer.measurements).length > 0
            ? [{ label: 'Import from body profile', icon: 'person', measurements: customer.measurements }]
            : []),
        ]}
      />

      {customer && order.styleName && (
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={saveStyleProfile} onChange={(e) => setSaveStyleProfile(e.target.checked)} />
          Update {customer.fullName.split(' ')[0]}&rsquo;s saved {order.styleName} template with these numbers
        </label>
      )}
      {customer && (
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={updateBodyProfile} onChange={(e) => setUpdateBodyProfile(e.target.checked)} />
          Also update {customer.fullName.split(' ')[0]}&rsquo;s general body profile — only if these are actual body measurements
        </label>
      )}
    </BottomSheet>
  );
}
