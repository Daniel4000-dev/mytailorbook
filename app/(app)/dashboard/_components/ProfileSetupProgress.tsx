'use client';

import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './ProfileSetupProgress.module.css';

interface ProfileSetupProgressProps {
  onNavigate: (href: string) => void;
}

export default function ProfileSetupProgress({ onNavigate }: ProfileSetupProgressProps) {
  const { currentShop, staffMembers } = useData();
  const { user } = useAuth();

  const steps = useMemo(() => {
    return [
      {
        id: 'identity',
        label: 'Shop Name & Specialty',
        isComplete: Boolean(currentShop?.name),
        href: '/settings/studio',
        cta: 'Identity',
      },
      {
        id: 'phone',
        label: 'WhatsApp or Phone Number',
        isComplete: Boolean(currentShop?.phone),
        href: '/settings/studio',
        cta: 'Add Phone',
      },
      {
        id: 'bank',
        label: 'Bank Account for Receipts',
        isComplete: Boolean(currentShop?.bankDetails?.bankName && currentShop?.bankDetails?.accountNumber),
        href: '/settings/studio',
        cta: 'Add Bank',
      },
      {
        id: 'target',
        label: 'Monthly Sales Target',
        isComplete: Boolean(currentShop?.monthlyRevenueTarget && currentShop.monthlyRevenueTarget > 0),
        href: '/settings/studio',
        cta: 'Set Goal',
      },
      {
        id: 'team',
        label: 'Tailors & Apprentices (Team)',
        isComplete: Boolean(staffMembers && staffMembers.length > 0),
        href: '/settings/staff',
        cta: 'Add Team',
      },
    ];
  }, [currentShop, user, staffMembers]);

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // When profile setup is 100% complete, gracefully auto-hide to keep dashboard clean
  if (completedCount === totalCount) {
    return null;
  }

  // Next incomplete step to guide the tailor
  const nextStep = steps.find((s) => !s.isComplete) || steps[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrap}>
            <Symbol name="auto_awesome" size={14} />
          </div>
          <span className={styles.title}>Shop Profile Setup</span>
        </div>
        <span className={styles.badge}>{progressPercent}% Complete</span>
      </div>

      <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
      </div>

      <button
        type="button"
        className={styles.nextActionCard}
        onClick={() => onNavigate(nextStep.href)}
        aria-label={`Next setup step: ${nextStep.label}`}
      >
        <div className={styles.nextActionLeft}>
          <span className={styles.actionStepTag}>Next Step</span>
          <span className={styles.actionText}>{nextStep.label}</span>
        </div>
        <div className={styles.actionBtn}>
          <span>{nextStep.cta}</span>
          <Symbol name="arrow_forward" size={12} />
        </div>
      </button>
    </div>
  );
}

