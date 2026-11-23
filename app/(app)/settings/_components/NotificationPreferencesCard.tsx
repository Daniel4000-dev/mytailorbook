'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useData } from '@/contexts/DataContext';
import { updateNotificationPreferencesAction } from '@/app/actions';
import { getShopNotificationPreferences, type NotificationPreferences } from '@/lib/notificationPreferences';
import styles from './NotificationPreferencesCard.module.css';

export default function NotificationPreferencesCard() {
  const { currentShop, refreshShop } = useData();
  const { showToast } = useToast();

  const currentPrefs = getShopNotificationPreferences(currentShop?.portfolioSettings);

  const [prefs, setPrefs] = useState<NotificationPreferences>(currentPrefs);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!currentShop?.id) return;
    const nextVal = !prefs[key];
    const nextPrefs = { ...prefs, [key]: nextVal };
    setPrefs(nextPrefs);
    setSavingKey(key);

    try {
      const res = await updateNotificationPreferencesAction(currentShop.id, { [key]: nextVal });
      if (res.error) {
        setPrefs(prefs); // rollback
        showToast(res.error, 'error');
      } else {
        if (refreshShop) refreshShop();
        showToast(nextVal ? 'Reminder muted' : 'Reminder unmuted', 'success');
      }
    } catch {
      setPrefs(prefs);
      showToast('Failed to save preference', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Automated Reminders & Noise Control</h3>
        <p className={styles.subtitle}>
          Silence repetitive reminders for things you already know, keeping your inbox 100% operational.
        </p>
      </div>

      <div className={styles.prefItem}>
        <div className={styles.prefText}>
          <span className={styles.prefLabel}>Mute Unpaid Balance Reminders</span>
          <span className={styles.prefDesc}>
            Stop automated reminders on completed garments with pending balances when you already have an agreed payment plan with the client.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={Boolean(prefs.mute_balance_reminders)}
            disabled={savingKey === 'mute_balance_reminders'}
            onChange={() => handleToggle('mute_balance_reminders')}
          />
          <span className={styles.slider} />
        </label>
      </div>

      <div className={styles.prefItem}>
        <div className={styles.prefText}>
          <span className={styles.prefLabel}>Mute Delayed Order Warnings</span>
          <span className={styles.prefDesc}>
            Stop alerts for garments paused in Cutting or Sewing when fabric is pending or delivery is scheduled far in advance.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={Boolean(prefs.mute_stagnant_alerts)}
            disabled={savingKey === 'mute_stagnant_alerts'}
            onChange={() => handleToggle('mute_stagnant_alerts')}
          />
          <span className={styles.slider} />
        </label>
      </div>

      {/* Tailor Circle notification preference commented out */}
      {/* <div className={styles.prefItem}>
        <div className={styles.prefText}>
          <span className={styles.prefLabel}>Mute Tailor Circle Morning Nudges</span>
          <span className={styles.prefDesc}>
            Stay connected with peer workshops in Tailor Circle without receiving morning &ldquo;already at cutting table&rdquo; notifications.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={Boolean(prefs.mute_circle_nudges)}
            disabled={savingKey === 'mute_circle_nudges'}
            onChange={() => handleToggle('mute_circle_nudges')}
          />
          <span className={styles.slider} />
        </label>
      </div> */}

      <div className={styles.prefItem}>
        <div className={styles.prefText}>
          <span className={styles.prefLabel}>Mute Daily Motivational Kickstarts</span>
          <span className={styles.prefDesc}>
            Silence morning cheerleading and evening wrap-up prompts, showing only actual client fittings and orders due today.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={Boolean(prefs.mute_daily_kickstarts)}
            disabled={savingKey === 'mute_daily_kickstarts'}
            onChange={() => handleToggle('mute_daily_kickstarts')}
          />
          <span className={styles.slider} />
        </label>
      </div>
    </div>
  );
}
