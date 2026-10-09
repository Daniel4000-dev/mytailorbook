'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import DiscoverCarousel from './DiscoverCarousel';
import MilestonesCard from '../MilestonesCard';
import ShopTodayCard from '../ShopTodayCard';
import GeneralExpenses from '../GeneralExpenses';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import TodaysAgendaWidget from '../TodaysAgendaWidget';

// ============================================================
// Owner Dashboard — mobile
// ============================================================

export default function OwnerDashboard({
  orders,
  staffMembers,
  onNavigate,
}: {
  orders: Order[];
  staffMembers: ReturnType<typeof useData>['staffMembers'];
  onNavigate: (href: string) => void;
}) {
  const { currentShop } = useData();
  const {
    hideCollected,
    hideProjected,
    toggleHideCollected,
    toggleHideProjected,
    collected,
    monthlyRevenue,
    projected,
    urgentCount,
    dueTodayCount,
    teamSnapshot,
    visibleAttentionItems,
    hasMoreAttentionItems,
  } = useOwnerDashboardData(orders, staffMembers);

  const { customers, exceptions } = useData();
  const openLoops = useOpenLoops(orders, customers, exceptions);

  return (
    <>
      <DiscoverCarousel onNavigate={onNavigate} />

      <TodaysAgendaWidget />

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={`${styles.financeCard} ${styles.collectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Collected</span>
            <button
              type="button"
              onClick={toggleHideCollected}
              className={styles.cardPrivacyBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideCollected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${styles.projectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Projected</span>
            <button
              type="button"
              onClick={toggleHideProjected}
              className={styles.cardPrivacyBtn}
              title={hideProjected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideProjected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideProjected ? '******' : formatCurrency(projected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue</span>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      {/* Monthly Goal Progress */}
      <div style={{ margin: '16px 20px', padding: '16px', background: 'var(--sf-surface)', borderRadius: '12px', border: '1px solid var(--sf-border)' }}>
        {currentShop?.monthlyRevenueTarget ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>Monthly Goal</span>
              <span style={{ color: 'var(--sf-text-secondary)' }}>
                {hideCollected ? '******' : formatCurrency(monthlyRevenue, currentShop?.currency)} / {hideCollected ? '******' : formatCurrency(currentShop.monthlyRevenueTarget, currentShop?.currency)}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--sf-bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(100, (monthlyRevenue / currentShop.monthlyRevenueTarget) * 100)}%`, 
                height: '100%', 
                backgroundColor: monthlyRevenue >= currentShop.monthlyRevenueTarget ? 'var(--sf-success)' : 'var(--sf-brand-primary)',
                borderRadius: '4px',
                transition: 'width 0.5s ease-out'
              }} />
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--sf-text-secondary)', textAlign: 'center' }}>
              {monthlyRevenue >= currentShop.monthlyRevenueTarget ? 'Target reached! Incredible work.' : `${hideCollected ? '******' : formatCurrency(currentShop.monthlyRevenueTarget - monthlyRevenue, currentShop?.currency)} left to reach your goal.`}
            </p>
            {currentShop.monthlyRevenueTarget > monthlyRevenue && (
              <button onClick={() => onNavigate('/settings/portfolio')} style={{ marginTop: '12px', width: '100%', background: 'var(--sf-bg)', color: 'var(--sf-nav)', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--sf-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Symbol name="campaign" size={16} /> Promote a style to close the gap
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--sf-text-primary)' }}>Set a Monthly Goal</span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--sf-text-secondary)' }}>Track revenue targets.</span>
            </div>
            <button onClick={() => onNavigate('/settings/studio')} style={{ background: 'var(--sf-brand-primary)', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Set Goal
            </button>
          </div>
        )}
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Team Snapshot</span>
      </div>

      {teamSnapshot.length === 0 ? (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <EmptyState
            icon={<Symbol name="group" size={32} />}
            title="No staff added yet"
            description="Invite your team to see them here."
            action={{ label: 'Invite Team', onClick: () => onNavigate('/settings/staff') }}
          />
        </div>
      ) : (
      <div className={styles.teamGrid}>
        {teamSnapshot.map(({ staff, active, overdue, completed }) => (
          <button
            key={staff.uid}
            className={styles.teamCard}
            onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
            type="button"
          >
            <div className={styles.teamCardHeader}>
              {staff.avatarUrl ? (
                <Image src={staff.avatarUrl} alt="" width={40} height={40} className={styles.teamAvatarImage} />
              ) : (
                <div className={styles.teamAvatar}>{staff.name[0]}</div>
              )}
              <div className={styles.teamName}>{staff.name}</div>
            </div>
            <div className={styles.teamStatsRow}>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{active}</span>
                <span className={styles.teamStatLabel}>Active</span>
              </div>
              <div className={styles.teamStat}>
                <span className={`${styles.teamStatValue} ${overdue > 0 ? styles.teamStatAlert : ''}`}>{overdue}</span>
                <span className={styles.teamStatLabel}>Overdue</span>
              </div>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{completed}</span>
                <span className={styles.teamStatLabel}>Done</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Shop Today</span>
      </div>
      <ShopTodayCard loops={openLoops} onNavigate={onNavigate} shop={currentShop} />
      <MilestonesCard />
      {currentShop && (
        <GeneralExpenses shopId={currentShop.id} currency={currentShop.currency} />
      )}
    </>
  );
}
