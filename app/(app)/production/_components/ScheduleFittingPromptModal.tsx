'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import type { Order, Customer } from '@/lib/types';
import styles from './ScheduleFittingPromptModal.module.css';

interface ScheduleFittingPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer: Customer | null;
  onConfirmSchedule: (date: string, time: string, sendWhatsApp: boolean) => Promise<void>;
  onSkipFitting: () => void;
}

const TIME_PRESETS = [
  { label: '10:00 AM', value: '10:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '02:00 PM', value: '14:00' },
  { label: '04:00 PM', value: '16:00' },
];

export default function ScheduleFittingPromptModal({
  isOpen,
  onClose,
  order,
  customer,
  onConfirmSchedule,
  onSkipFitting,
}: ScheduleFittingPromptModalProps) {
  // Tomorrow's date formatted as YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDateStr);
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [sendWhatsApp, setSendWhatsApp] = useState(!!customer?.whatsappNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const clientName = customer?.fullName || order.customerName || 'Bespoke Client';
  const hasPhone = !!customer?.whatsappNumber;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmSchedule(date, selectedTime, sendWhatsApp && hasPhone);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="modal"
      title="Garment Ready for Try-On"
    >
      <div className={styles.modalContent}>
        {/* Order Preview Card */}
        <div className={styles.orderPreviewCard}>
          <div className={styles.previewAvatar}>
            <Avatar name={clientName} size="md" shape="squircle" />
          </div>
          <div className={styles.previewInfo}>
            <h3 className={styles.clientName}>{clientName}</h3>
            <p className={styles.orderDetails}>{order.orderDetails || order.styleName || 'Custom Outfit'}</p>
            <div className={styles.metaRow}>
              <span className={styles.readyBadge}>Moving to Ready</span>
              {order.dueDate && (
                <span className={styles.dueBadge}>
                  Due: {new Date(order.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className={styles.fieldSection}>
          <label className={styles.fieldLabel} htmlFor="fittingDate">
            Fitting Date
          </label>
          <input
            id="fittingDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--sf-radius-md, 10px)',
              border: '1px solid var(--sf-border-light)',
              background: 'var(--sf-bg-surface)',
              color: 'var(--sf-text-primary)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          />
        </div>

        {/* Time Selector Chips */}
        <div className={styles.fieldSection}>
          <label className={styles.fieldLabel}>Suggested Time Slot</label>
          <div className={styles.timePresetsRow}>
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`${styles.timeChip} ${selectedTime === preset.value ? styles.timeChipActive : ''}`}
                onClick={() => setSelectedTime(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp Notification Toggle */}
        {hasPhone && (
          <div className={styles.whatsappToggleCard}>
            <div className={styles.whatsappLeft}>
              <WhatsappIcon size={20} />
              <div>
                <p className={styles.whatsappTitle}>Send WhatsApp Fitting Invitation</p>
                <p className={styles.whatsappDesc}>Auto-drafts appointment time and atelier address</p>
              </div>
            </div>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              aria-label="Send WhatsApp Fitting Invitation"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <Button
            variant="primary"
            size="md"
            className={styles.scheduleBtn}
            onClick={handleConfirm}
            loading={isSubmitting}
            icon={<Symbol name="checkroom" size={16} />}
          >
            Schedule Fitting &amp; Mark Ready
          </Button>

          <button
            type="button"
            className={styles.skipBtn}
            onClick={onSkipFitting}
            disabled={isSubmitting}
          >
            Skip (Direct Ready for Pickup)
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

