'use client';

import React, { useEffect, useState, useRef } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './CraftSpark.module.css';

export interface CraftSparkDetail {
  xpAwarded: number;
  streakCurrent?: number;
  streakBumped?: boolean;
  buddySynced?: boolean;
  buddyStreakCount?: number;
  actionName?: string;
}

export default function CraftSpark() {
  const [spark, setSpark] = useState<CraftSparkDetail | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleCraftSpark = (e: Event) => {
      const customEvent = e as CustomEvent<CraftSparkDetail>;
      if (!customEvent.detail) return;

      const detail = customEvent.detail;
      setSpark(detail);
      setVisible(true);

      // Play subtle, crisp success audio
      try {
        const audio = new Audio('/sounds/success.wav');
        audio.volume = 0.35;
        audio.play().catch(() => {});
      } catch {
        // audio playback might be restricted
      }

      // Gentle haptic feedback on supporting mobile devices
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([35, 25, 35]);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setSpark(null), 300);
      }, 2600);
    };

    window.addEventListener('atelier-craft-spark', handleCraftSpark);
    return () => {
      window.removeEventListener('atelier-craft-spark', handleCraftSpark);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!spark) return null;

  return (
    <div
      className={`${styles.sparkContainer} ${visible ? styles.sparkVisible : styles.sparkHidden}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.sparkChip}>
        <div className={styles.xpBadge}>
          <Symbol name="bolt" size={14} style={{ color: '#F59E0B' }} />
          <span>+{spark.xpAwarded} XP</span>
        </div>

        <span className={styles.divider}>·</span>

        <div className={styles.streakBadge}>
          <Symbol name="local_fire_department" size={14} style={{ color: '#EA580C' }} />
          <span>{spark.streakCurrent || 1}d Streak</span>
        </div>

        {spark.buddySynced && (
          <>
            <span className={styles.divider}>·</span>
            <div className={styles.podBadge}>
              <Symbol name="handshake" size={13} style={{ color: '#10B981' }} />
              <span>Pod Synced</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

