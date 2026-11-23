'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { CalendarEvent, Customer, Order } from '@/lib/types';
import styles from './FittingVerdictModal.module.css';

interface FittingVerdictModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  customer: Customer | null;
  order: Order | null;
  onVerdictApproved: () => Promise<void>;
  onVerdictAlterations: (notes: string) => Promise<void>;
}

const ALTERATION_CHIPS = [
  'Take in Waist',
  'Let out Waist',
  'Shorten Length',
  'Lengthen Hem',
  'Taper Sleeves',
  'Ease Chest',
  'Adjust Neck/Collar',
  'Seat/Crotch',
  'Shoulder Slope',
];

const MAGNITUDE_CHIPS = ['-0.5"', '-1.0"', '-1.5"', '+0.5"', '+1.0"', '+1.5"'];

export default function FittingVerdictModal({
  isOpen,
  onClose,
  event,
  customer,
  order,
  onVerdictApproved,
  onVerdictAlterations,
}: FittingVerdictModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<'approved' | 'alterations'>('approved');
  const [alterationNotes, setAlterationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!event) return null;

  const clientName = customer?.fullName || 'Bespoke Client';

  const handleAddChip = (chip: string) => {
    setAlterationNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      return `${trimmed}, ${chip}`;
    });
  };

  const handleAddMagnitude = (mag: string) => {
    setAlterationNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return mag;
      return `${trimmed} (${mag})`;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (selectedOutcome === 'approved') {
        await onVerdictApproved();
      } else {
        await onVerdictAlterations(alterationNotes.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="modal"
      title="Fitting Session Outcome"
    >
      <div className={styles.modalContent}>
        {/* Client & Garment Card */}
        <div className={styles.clientCard}>
          <Avatar name={clientName} size="md" shape="squircle" />
          <div className={styles.clientDetails}>
            <h4 className={styles.clientName}>{clientName}</h4>
            <p className={styles.eventTitle}>{event.title}</p>
          </div>
        </div>

        {/* Choice Grid */}
        <div className={styles.choicesGrid}>
          <div
            className={`${styles.choiceCard} ${selectedOutcome === 'approved' ? styles.choiceApprovedActive : ''}`}
            onClick={() => setSelectedOutcome('approved')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedOutcome('approved')}
          >
            <div className={`${styles.choiceIconWrap} ${styles.iconApproved}`}>
              <Symbol name="check_circle" size={20} />
            </div>
            <h5 className={styles.choiceTitle}>Approved Fit</h5>
            <p className={styles.choiceDesc}>Garment fits as desired. Ready for final finishing or collection.</p>
          </div>

          <div
            className={`${styles.choiceCard} ${selectedOutcome === 'alterations' ? styles.choiceAlterationActive : ''}`}
            onClick={() => setSelectedOutcome('alterations')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedOutcome('alterations')}
          >
            <div className={`${styles.choiceIconWrap} ${styles.iconAlteration}`}>
              <Symbol name="content_cut" size={20} />
            </div>
            <h5 className={styles.choiceTitle}>Needs Alteration</h5>
            <p className={styles.choiceDesc}>Pins placed. Return to sewing bench for pin adjustments.</p>
          </div>
        </div>

        {/* Alterations Note Input if Alteration Selected */}
        {selectedOutcome === 'alterations' && (
          <div className={styles.notesSection}>
            <div className={styles.notesLabelRow}>
              <label className={styles.notesLabel} htmlFor="alterationNotesInput">
                Pin &amp; Chalk Alteration Notes
              </label>
              {alterationNotes && (
                <button
                  type="button"
                  className={styles.clearNotesBtn}
                  onClick={() => setAlterationNotes('')}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Alteration Touch Chips */}
            <div className={styles.quickChipsWrapper}>
              <span className={styles.quickChipsHint}>Tap adjustments:</span>
              <div className={styles.chipsRow}>
                {ALTERATION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={styles.touchChip}
                    onClick={() => handleAddChip(chip)}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <div className={styles.magnitudeRow}>
                <span className={styles.magLabel}>Measurement:</span>
                {MAGNITUDE_CHIPS.map((mag) => (
                  <button
                    key={mag}
                    type="button"
                    className={styles.magChip}
                    onClick={() => handleAddMagnitude(mag)}
                  >
                    {mag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              id="alterationNotesInput"
              className={styles.notesTextarea}
              placeholder="Tap quick chips above or type custom instructions with chalk on hands..."
              value={alterationNotes}
              onChange={(e) => setAlterationNotes(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Action Button */}
        <Button
          variant={selectedOutcome === 'approved' ? 'primary' : 'secondary'}
          size="md"
          className={styles.actionButton}
          onClick={handleSubmit}
          loading={isSubmitting}
          icon={
            selectedOutcome === 'approved' ? (
              <Symbol name="check" size={16} />
            ) : (
              <Symbol name="content_cut" size={16} />
            )
          }
        >
          {selectedOutcome === 'approved'
            ? 'Confirm Perfect Fit & Mark Approved'
            : 'Send Back to Sewing with Alterations'}
        </Button>
      </div>
    </BottomSheet>
  );
}

