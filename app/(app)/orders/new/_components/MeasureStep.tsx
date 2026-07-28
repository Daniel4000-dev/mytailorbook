import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import type { StyleMeasureSpec } from '@/lib/constants';
import type { Customer, Measurements, Order } from '@/lib/types';
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
  updateProfile: boolean;
  onUpdateProfileChange: (value: boolean) => void;
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
  updateProfile,
  onUpdateProfileChange,
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

      <label className={styles.profileToggle}>
        <input type="checkbox" checked={updateProfile} onChange={(e) => onUpdateProfileChange(e.target.checked)} />
        Also update {customer?.fullName.split(' ')[0]}&rsquo;s body profile with these numbers
      </label>
    </div>
  );
}
