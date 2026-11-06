'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useCircleHub } from '@/lib/hooks/useCircleHub';
import styles from './PodCoOpBanner.module.css';

export default function PodCoOpBanner() {
  const router = useRouter();
  const { peerBuddies, isCoOpSecuredToday, activeTodayCount, benefits } = useCircleHub();

  if (!peerBuddies || peerBuddies.length === 0) {
    return null;
  }

  const peerNames = peerBuddies.slice(0, 2).map((b) => b.name).join(' & ');
  const dailyRate = benefits?.dailyXpRate || 15;

  return (
    <button
      type="button"
      className={`${styles.banner} ${
        isCoOpSecuredToday ? styles.bannerSecured : styles.bannerPending
      }`}
      onClick={() => router.push('/circle')}
      aria-label="View Tailor Circle pod streak status"
    >
      <div className={styles.left}>
        <div
          className={`${styles.iconWrap} ${
            isCoOpSecuredToday ? styles.iconWrapSecured : styles.iconWrapPending
          }`}
        >
          <Symbol
            name={isCoOpSecuredToday ? 'local_fire_department' : 'handshake'}
            size={16}
          />
        </div>
        <div className={styles.textArea}>
          <div className={styles.titleRow}>
            <span className={styles.title}>
              {isCoOpSecuredToday
                ? `Pod Streak Secured (+${dailyRate} XP)`
                : `Pod Co-Op: ${activeTodayCount} of ${peerBuddies.length + 1} Active Today`}
            </span>
            {isCoOpSecuredToday && (
              <span className={styles.badge}>LOCKED IN</span>
            )}
          </div>
          <span className={styles.subtext}>
            {isCoOpSecuredToday
              ? `You & ${peerNames} both crafted today · Circle streak active`
              : `Complete an order or log measurements to lock in your +${dailyRate} XP pod bonus`}
          </span>
        </div>
      </div>

      <div className={styles.rightArrow}>
        <Symbol name="chevron_right" size={15} />
      </div>
    </button>
  );
}

