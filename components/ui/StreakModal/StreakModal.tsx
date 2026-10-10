import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal/Modal';
import FlameIcon from "@/components/ui/FlameIcon/FlameIcon";
import Button from '@/components/ui/Button/Button';
import styles from './StreakModal.module.css';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
}

export default function StreakModal({ isOpen, onClose, streakCount }: StreakModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti from the center of the screen
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className={styles.container}>
        <div className={styles.flameContainer}>
          <div className={styles.flame}><FlameIcon size={72} /></div>
        </div>
        <h2 className={styles.title}>{streakCount} Day Streak!</h2>
        <p className={styles.subtitle}>
          You're on fire! Keep logging in every day to maintain your streak. 
          Remember, you have a freeze available if you miss a day.
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={onClose} fullWidth size="lg">
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
