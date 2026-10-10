'use client';

import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import Symbol from '@/components/ui/Symbol/Symbol';
import Image from 'next/image';
import styles from './SagaMapWidget.module.css';

export default function SagaMapWidget({ monthlyRevenue }: { monthlyRevenue: number }) {
  const { currentShop } = useData();
  const { user } = useAuth();
  
  // Set a dynamic goal based on current revenue, rounded up to next 100k
  const revenueGoal = Math.max(100000, Math.ceil((monthlyRevenue + 10000) / 100000) * 100000);
  
  const progressPercent = Math.min(100, (monthlyRevenue / revenueGoal) * 100);

  // We have 4 steps in this map (0%, 33%, 66%, 100%)
  const steps = [100, 66, 33, 0]; 

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>The Revenue Path</h2>
        <p className={styles.subtitle}>
          You've collected {formatCurrency(monthlyRevenue)} this month. Keep moving!
        </p>
      </div>

      <div className={styles.map}>
        <div className={styles.pathLine}>
          <div className={styles.pathFill} style={{ height: `${progressPercent}%` }} />
        </div>

        {/* Node 100% (Top) */}
        <div className={styles.goalChest} title={`Goal: ${formatCurrency(revenueGoal)}`}>
          {progressPercent >= 100 ? '🏆' : '🎁'}
        </div>

        {/* Node 66% */}
        <div 
          className={`${styles.node} ${progressPercent >= 66 ? styles.nodeCompleted : ''} ${progressPercent >= 33 && progressPercent < 66 ? styles.nodeCurrent : ''}`}
          style={{ transform: 'translateX(-40px)' }}
        >
          {progressPercent >= 66 ? <Symbol name="check" size={24} /> : '3'}
        </div>

        {/* Node 33% */}
        <div 
          className={`${styles.node} ${progressPercent >= 33 ? styles.nodeCompleted : ''} ${progressPercent >= 0 && progressPercent < 33 ? styles.nodeCurrent : ''}`}
          style={{ transform: 'translateX(40px)' }}
        >
          {progressPercent >= 33 ? <Symbol name="check" size={24} /> : '2'}
        </div>

        {/* Node 0% (Bottom) */}
        <div className={`${styles.node} ${styles.nodeCompleted}`}>
          <Symbol name="flag" size={24} />
        </div>

        {/* Avatar / Player Head */}
        <div 
          className={styles.avatar} 
          style={{ 
            bottom: `calc(${progressPercent}% - 20px)`, 
            left: '50%',
            transform: `translateX(calc(-50% + ${progressPercent >= 66 ? -40 : progressPercent >= 33 ? 40 : 0}px))`
          }}
        >
          <img 
            src={user?.avatarUrl || currentShop?.logoUrl || '/images/logo.png'} 
            alt="You" 
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.src = '/images/logo.png' }}
          />
        </div>
      </div>
    </div>
  );
}
