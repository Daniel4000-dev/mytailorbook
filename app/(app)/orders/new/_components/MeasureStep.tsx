import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import type { StyleMeasureSpec } from '@/lib/constants';
import type { Customer, Measurements, Order } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import styles from '../page.module.css';

interface MeasureStepProps {
  customer: Customer | null;
  currentStyle: string | undefined;
  currentSpec: StyleMeasureSpec;
  currentValues: Record<string, string>;
  onMeasureValueChange: (key: string, value: string) => void;
  activeMeasureKey: string | null;
  onActiveMeasureKeyChange: (key: string | null) => void;
  lastSameStyleOrder: Order | null;
  onImported: () => void;
  saveStyleProfile: boolean;
  onSaveStyleProfileChange: (value: boolean) => void;
  updateBodyProfile: boolean;
  onUpdateBodyProfileChange: (value: boolean) => void;
}

export default function MeasureStep({
  customer,
  currentStyle,
  currentSpec,
  currentValues,
  onMeasureValueChange,
  activeMeasureKey,
  onActiveMeasureKeyChange,
  lastSameStyleOrder,
  onImported,
  saveStyleProfile,
  onSaveStyleProfileChange,
  updateBodyProfile,
  onUpdateBodyProfileChange,
}: MeasureStepProps) {
  return (
    <div className={styles.col}>
      <div>
        <h2 className={styles.stepTitle}>{currentStyle} Measurements</h2>
        <p className={styles.stepSub}>
          For {customer?.fullName} — tap a number on the guide or fill the cards below. Skip anything you’ll take at fitting.
        </p>
      </div>

      <StyleMeasureForm
        spec={currentSpec}
        values={currentValues}
        onChange={onMeasureValueChange}
        activeKey={activeMeasureKey}
        onActiveKeyChange={onActiveMeasureKeyChange}
        importSources={[
          // Most precise first: a deliberately saved, style-specific
          // profile beats a derived guess from a past order, which beats
          // the general body profile (which doesn't account for this
          // garment's own fit/ease at all). While per-style profiles are
          // off there's nothing distinct to offer here — "body profile"
          // below already covers it, and offering it twice would be
          // confusing since they're now the same values.
          ...(FEATURE_FLAGS.perStyleMeasurements && currentStyle && customer?.styleMeasurements?.[currentStyle]
            ? [{
                label: `Import from saved ${currentStyle} profile`,
                icon: 'bookmark',
                measurements: customer.styleMeasurements[currentStyle].measurements,
                onImported,
              }]
            : []),
          ...(lastSameStyleOrder
            ? [{
                label: `Import from last ${currentStyle} (${new Date(lastSameStyleOrder.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })})`,
                icon: 'history',
                measurements: lastSameStyleOrder.measurements as Measurements,
                onImported,
              }]
            : []),
          ...(customer?.measurements && Object.keys(customer.measurements).length > 0
            ? [{
                label: 'Import from body profile',
                icon: 'person',
                measurements: customer.measurements,
                onImported,
              }]
            : []),
        ]}
      />

      {FEATURE_FLAGS.perStyleMeasurements ? (
        <>
          <label className={styles.profileToggle}>
            <input type="checkbox" checked={saveStyleProfile} onChange={(e) => onSaveStyleProfileChange(e.target.checked)} />
            Save these as {customer?.fullName.split(' ')[0]}&rsquo;s {currentStyle} measurements, for next time
          </label>
          <label className={styles.profileToggle}>
            <input type="checkbox" checked={updateBodyProfile} onChange={(e) => onUpdateBodyProfileChange(e.target.checked)} />
            Also update {customer?.fullName.split(' ')[0]}&rsquo;s general body profile — only if these are actual body measurements, not this garment&rsquo;s fit
          </label>
        </>
      ) : (
        // One shared profile while per-style is off — saveStyleProfile
        // alone drives whether NewOrderWizard writes back to it (see
        // handleSubmit there), updateBodyProfile is unused in this mode.
        <label className={styles.profileToggle}>
          <input type="checkbox" checked={saveStyleProfile} onChange={(e) => onSaveStyleProfileChange(e.target.checked)} />
          Save these as {customer?.fullName.split(' ')[0]}&rsquo;s measurements, for next time
        </label>
      )}
    </div>
  );
}
