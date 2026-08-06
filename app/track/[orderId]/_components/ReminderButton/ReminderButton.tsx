'use client';

import { useState } from 'react';

import { submitOrderReminder } from '@/app/public-actions';
import { canSendReminder } from '@/lib/types';
import styles from './ReminderButton.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface ReminderButtonProps {
  orderId: string;
  initialLastReminderAt?: string;
}

export default function ReminderButton({ orderId, initialLastReminderAt }: ReminderButtonProps) {
  const [lastReminderAt, setLastReminderAt] = useState(initialLastReminderAt);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = canSendReminder({ lastReminderAt });

  const handleClick = async () => {
    setSending(true);
    setError(null);
    const result = await submitOrderReminder(orderId);
    if (result.success) {
      setLastReminderAt(result.lastReminderAt);
    } else {
      setError(result.error || 'Could not send your reminder. Please try again.');
    }
    setSending(false);
  };

  return (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>
        <Symbol name="notifications" style={{ marginRight: 6 }} /> Nudge Your Tailor
      </h3>
      <p className={styles.hint}>
        {canSend
          ? 'Waiting on an update? Send a quick reminder about your order.'
          : 'Reminder sent — you can send another tomorrow.'}
      </p>
      <button type="button" className={styles.sendBtn} onClick={handleClick} disabled={sending || !canSend}>
        {sending && <Symbol name="progress_activity" className="global-spinner" />}
        {sending ? 'Sending...' : canSend ? 'Send Reminder' : 'Reminder Sent'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
