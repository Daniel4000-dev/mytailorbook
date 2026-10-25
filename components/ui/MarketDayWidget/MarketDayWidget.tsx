'use client';

import { useState } from 'react';
import styles from './MarketDayWidget.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import { logStreakAction } from '@/lib/streakClient';
import { useData } from '@/contexts/DataContext';

export default function MarketDayWidget() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { currentShop } = useData();

  // If streak was already logged today, maybe hide this widget or show it as saved?
  // Let's just keep it simple: they can click it once per day.
  
  const handleMarketDay = async () => {
    setLoading(true);
    const res = await logStreakAction('market_day', 10, true);
    if (res?.success) {
      setSaved(true);
    }
    setLoading(false);
  };

  if (saved) {
    return (
      <div className={styles.widget} style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'transparent' }}>
        <div className={styles.content}>
          <div className={styles.saved}>
            <Symbol name="check_circle" size={18} /> Market Day Logged!
          </div>
          <span className={styles.desc}>Your streak is safe for today. Happy sourcing!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.content}>
        <span className={styles.title} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Symbol name="storefront" size={16} /> Sourcing Fabrics?
        </span>
        <span className={styles.desc}>Protect your streak on market days.</span>
      </div>
      <button className={styles.btn} onClick={handleMarketDay} disabled={loading}>
        {loading ? 'Saving...' : "I'm at Market"}
      </button>
    </div>
  );
}
