'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal/Modal';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
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
    } catch (e) {
      setRestDayMsg({ text: 'Could not claim rest day.', error: true });
    } finally {
      setRestDayLoading(false);
    }
  };

  if (!isOpen) return null;

  const usedRestDays = currentShop?.restDaysUsedThisWeek || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className={styles.container}>
        <div className={styles.flameContainer}>
          <div className={styles.flame}><FlameIcon size={72} /></div>
        </div>
        <h2 className={styles.title}>{streakCount} Day Streak!</h2>
        <p className={styles.subtitle}>
          You're on fire! Keep logging your daily cuts, stitches, and orders to climb the Master Tailor Challenge rankings.
        </p>

        {/* Studio Rest Day Option */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '20px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Symbol name="spa" size={16} style={{ color: 'var(--sf-accent-indigo)' }} />
              Need to take today off?
            </span>
            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
              {Math.max(0, 2 - usedRestDays)} of 2 left
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Claim a Studio Rest Day (+10 XP) to protect your streak without logging any work.
          </p>
          <button
            type="button"
            onClick={handleClaimRestDay}
            disabled={restDayLoading || usedRestDays >= 2}
            style={{
              background: usedRestDays >= 2 ? 'var(--sf-border-light)' : 'var(--sf-bg-surface)',
              border: '1px solid var(--sf-border-light)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--sf-accent-indigo)',
              cursor: usedRestDays >= 2 ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              alignSelf: 'flex-start',
            }}
          >
            {restDayLoading ? 'Claiming...' : 'Claim Rest Day (+10 XP)'}
          </button>
          {restDayMsg && (
            <span style={{ fontSize: '12px', color: restDayMsg.error ? 'var(--sf-error)' : 'var(--sf-success)' }}>
              {restDayMsg.text}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onClose} fullWidth size="lg">
            Back to Studio
          </Button>
        </div>
      </div>
    </Modal>
  );
}
