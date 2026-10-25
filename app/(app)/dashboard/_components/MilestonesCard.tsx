'use client';

import Link from 'next/link';
import { useData } from '@/contexts/DataContext';
import { useMilestones } from '../_hooks/useMilestones';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './MilestonesCard.module.css';

export default function MilestonesCard() {
  const { milestones } = useMilestones();
  const { orders, customers, currentShop } = useData();

  // Smart recommended next step for the workshop owner
  let nextMove = {
    tag: 'Next Move',
    text: 'Share your lookbook portfolio with clients',
    href: '/portfolio',
    cta: 'Portfolio',
  };

  if (customers.length === 0) {
    nextMove = {
      tag: 'Step 1',
      text: 'Add your first client profile & measurements',
      href: '/customers/new',
      cta: 'Add Client',
    };
  } else if (orders.length === 0) {
    nextMove = {
      tag: 'Step 2',
      text: 'Create your first bespoke garment order',
      href: '/orders/new',
      cta: 'New Order',
    };
  } else if (!currentShop?.monthlyRevenueTarget) {
    nextMove = {
      tag: 'Goal',
      text: 'Set your monthly atelier revenue target',
      href: '/settings/studio',
      cta: 'Set Goal',
    };
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.titleIcon}>
            <Symbol name="stars" size={16} />
          </span>
          <h2 className={styles.title}>Studio Milestones</h2>
        </div>
        <span className={styles.subtitle}>Atelier Growth</span>
      </div>

      {/* Actionable Next Move Prompt */}
      <div className={styles.nextMoveBox}>
        <div className={styles.nextMoveLeft}>
          <span className={styles.nextMoveTag}>{nextMove.tag}</span>
          <span className={styles.nextMoveText}>{nextMove.text}</span>
        </div>
        <Link href={nextMove.href} className={styles.nextMoveBtn}>
          <span>{nextMove.cta}</span>
          <Symbol name="chevron_right" size={12} />
        </Link>
      </div>

      {/* Milestone Progress Tracks */}
      <div className={styles.list}>
        {milestones.map((m) => {
          let fillClass = styles.fillOrders;
          if (m.type === 'customers') fillClass = styles.fillCustomers;
          if (m.type === 'revenue') fillClass = styles.fillRevenue;

          return (
            <div key={m.id} className={styles.milestone}>
              <div className={styles.milestoneHeader}>
                <span className={styles.milestoneTitle}>{m.title}</span>
                <span className={styles.milestoneProgressText}>
                  {m.current} / {m.target}
                </span>
              </div>
              <div className={styles.track}>
                <div
                  className={`${styles.fill} ${fillClass} ${
                    m.achieved ? styles.fillAchieved : ''
                  }`}
                  style={{ width: `${Math.round(m.progress * 100)}%` }}
                />
              </div>
              {m.achieved && (
                <div className={styles.achievedBadge}>
                  <Symbol name="stars" size={12} />
                  <span>Milestone Reached!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
