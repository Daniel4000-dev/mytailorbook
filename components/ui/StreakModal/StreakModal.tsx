'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal/Modal';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import Symbol from '@/components/ui/Symbol/Symbol';
import DailyActivityDropdown from '@/components/dashboard/DailyActivityDropdown/DailyActivityDropdown';
import { logStudioRestDayAction } from '@/app/actions';
import { useData } from '@/contexts/DataContext';
import styles from './StreakModal.module.css';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
}

export default function StreakModal({ isOpen, onClose, streakCount }: StreakModalProps) {
  const { currentShop, refreshShop } = useData();
  const [restDayLoading, setRestDayLoading] = useState(false);
  const [restDayMsg, setRestDayMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRestDayMsg(null);
      // Fire celebratory confetti from the sides
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 40 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClaimRestDay = async () => {
    setRestDayLoading(true);
    setRestDayMsg(null);
    try {
      const res = await logStudioRestDayAction();
      if (res?.error) {
        setRestDayMsg({ text: res.error, error: true });
      } else if (res?.success) {
        setRestDayMsg({
          text: `Rest Day logged! +10 XP awarded. (${res.restDaysRemaining} rest days remaining this week)`,
        });
        refreshShop();
      }
    } catch {
      setRestDayMsg({ text: 'Could not claim rest day.', error: true });
    } finally {
      setRestDayLoading(false);
    }
  };

  if (!isOpen) return null;

  const usedRestDays = currentShop?.restDaysUsedThisWeek || 0;
  const bestStreak = currentShop?.streakBest || streakCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className={styles.container}>
        {/* Flame Badge Header */}
        <div className={styles.flameContainer}>
          <div className={styles.flame}>
            <FlameIcon size={44} />
          </div>
        </div>

        <h2 className={styles.title}>
          {streakCount > 0 ? `${streakCount} Day Streak!` : 'Daily Work Streak'}
        </h2>
        <p className={styles.subtitle}>
          {streakCount > 0
            ? "You're on fire! Keep recording your daily cuts, stitches, and shop tasks to keep your momentum alive."
            : 'Start building your streak today by logging your cutting, sewing, fabric buying, or daily shop work.'}
        </p>

        {/* At-a-Glance Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap}>
              <FlameIcon size={18} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Current</span>
              <span className={styles.statValue}>
                {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap}>
              <Symbol name="emoji_events" size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Best</span>
              <span className={styles.statValue}>{bestStreak} Days</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap}>
              <Symbol name="verified_user" size={18} style={{ color: '#10b981' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Protection</span>
              <span className={styles.statValue}>3-Day Grace</span>
            </div>
          </div>
        </div>

        {/* Studio Rest Day Row */}
        <div className={styles.restDayCard}>
          <div className={styles.restDayHeader}>
            <div className={styles.restDayInfo}>
              <div className={styles.restDayTitleRow}>
                <Symbol name="spa" size={16} className={styles.restDayIcon} />
                <span className={styles.restDayTitle}>Studio Rest Day</span>
              </div>
              <span className={styles.restDayRemaining}>
                {Math.max(0, 2 - usedRestDays)} of 2 left this week
              </span>
            </div>

            <button
              type="button"
              className={styles.restDayBtn}
              onClick={handleClaimRestDay}
              disabled={restDayLoading || usedRestDays >= 2}
            >
              {restDayLoading ? 'Claiming...' : usedRestDays >= 2 ? 'Used' : 'Take Rest Day (+10 XP)'}
            </button>
          </div>

          <p className={styles.restDayDesc}>
            Pauses your streak without losing momentum. Freezes inactivity counter and protects your record.
          </p>

          {restDayMsg && (
            <span className={`${styles.restDayStatus} ${restDayMsg.error ? styles.restDayError : styles.restDaySuccess}`}>
              {restDayMsg.text}
            </span>
          )}
        </div>

        {/* Daily Activity Dropdown */}
        <div className={styles.activitySection}>
          <DailyActivityDropdown />
        </div>
      </div>
    </Modal>
  );
}
