'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import DiscoverBanner from './DiscoverBanner';
import ShopTodayCard from '../ShopTodayCard';
import MilestonesCard from '../MilestonesCard';
import GeneralExpenses from '../GeneralExpenses';
import pageStyles from '../../page.module.css';
import styles from './OwnerDashboard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import TodaysAgendaWidget from '../TodaysAgendaWidget';
import MarketDayWidget from '@/components/ui/MarketDayWidget/MarketDayWidget';
import DailyQuestsWidget from '@/components/ui/DailyQuestsWidget/DailyQuestsWidget';

// ============================================================
// Owner Dashboard — desktop
//
// Same data as mobile (shared via useOwnerDashboardData), laid out for a
// wide, mouse-driven screen instead of a single scrolling card stack:
// Team Snapshot and Needs Attention sit side by side as a real two-column
// dashboard once there's enough width for both to breathe, and the whole
// page is capped to a max content width so it doesn't sprawl edge-to-edge
// on ultra-wide monitors.
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
  const { currentShop, customers, exceptions } = useData();
  const { openCreateMenu } = useSidebar();
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
  
  const openLoops = useOpenLoops(orders, customers, exceptions);

  return (
    <div className={styles.content}>
      <MarketDayWidget />
        <DailyQuestsWidget />
            <TodaysAgendaWidget />

      {/* Hero: one dominant focal point instead of four equal-weight cards.
          Uses only tokens already in the app's own two-color system —
          var(--sf-nav), the same dark chrome color already used for
          toasts, and the existing indigo accent — nothing new. */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          {/* Greeting commented out intentionally */}
          <div className={styles.heroIdentity}></div>
          <button type="button" className={styles.heroCta} onClick={openCreateMenu}>
            <Symbol name="add" size={18} />
            New Order
          </button>
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroPrimaryStat}>
            <div className={styles.heroPrimaryLabelRow}>
              <span className={styles.heroPrimaryLabel}>Collected</span>
              <button
                type="button"
                onClick={toggleHideCollected}
                className={styles.heroPrivacyBtn}
                title={hideCollected ? 'Show Balance' : 'Hide Balance'}
              >
                {hideCollected ? <Symbol name="visibility_off" size={16} /> : <Symbol name="visibility" size={16} />}
              </button>
            </div>
            <span className={styles.heroPrimaryValue}>
              {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
            </span>
          </div>

          <div className={styles.heroStatRow}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabelRow}>
                <span className={styles.heroStatLabel}>Projected</span>
                <button
                  type="button"
                  onClick={toggleHideProjected}
                  className={styles.heroStatPrivacyBtn}
                  title={hideProjected ? 'Show Balance' : 'Hide Balance'}
                >
                  {hideProjected ? <Symbol name="visibility_off" size={12} /> : <Symbol name="visibility" size={12} />}
                </button>
              </div>
              <span className={styles.heroStatValue}>
                {hideProjected ? '******' : formatCurrency(projected, currentShop?.currency)}
              </span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Overdue</span>
              <span className={`${styles.heroStatValue} ${urgentCount > 0 ? styles.heroStatDanger : ''}`}>
                {urgentCount}
              </span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Due Today</span>
              <span className={`${styles.heroStatValue} ${dueTodayCount > 0 ? styles.heroStatDue : ''}`}>
                {dueTodayCount}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Goal Progress */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {currentShop?.monthlyRevenueTarget ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--sf-surface)', fontSize: '14px' }}>
                <span style={{ fontWeight: 500 }}>Monthly Revenue Target</span>
                <span>{hideCollected ? '******' : formatCurrency(monthlyRevenue, currentShop?.currency)} / {hideCollected ? '******' : formatCurrency(currentShop.monthlyRevenueTarget, currentShop?.currency)}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, (monthlyRevenue / currentShop.monthlyRevenueTarget) * 100)}%`, 
                  height: '100%', 
                  backgroundColor: monthlyRevenue >= currentShop.monthlyRevenueTarget ? 'var(--sf-success)' : '#fff',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                {monthlyRevenue >= currentShop.monthlyRevenueTarget ? 'Target reached! Incredible work.' : `${hideCollected ? '******' : formatCurrency(currentShop.monthlyRevenueTarget - monthlyRevenue, currentShop?.currency)} left to reach your goal.`}
              </p>
              {currentShop.monthlyRevenueTarget > monthlyRevenue && (
                <button onClick={() => onNavigate('/settings/portfolio')} style={{ marginTop: '12px', background: 'rgba(255,255,255,0.15)', color: 'var(--sf-surface)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Symbol name="campaign" size={16} /> Promote a style to close the gap
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--sf-surface)' }}>
                <span style={{ display: 'block', fontWeight: 500, fontSize: '14px' }}>Set a Monthly Goal</span>
                <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Track your revenue targets directly on your dashboard.</span>
              </div>
              <button onClick={() => onNavigate('/settings/studio')} style={{ background: 'var(--sf-surface)', color: 'var(--sf-nav)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Set Goal
              </button>
            </div>
          )}
        </div>
      </div>

      <DiscoverBanner onNavigate={onNavigate} />

      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Team Snapshot</span>
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
                  className={pageStyles.teamCard}
                  onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
                  type="button"
                >
                  <div className={pageStyles.teamCardHeader}>
                    {staff.avatarUrl ? (
                      <Image src={staff.avatarUrl} alt="" width={40} height={40} className={pageStyles.teamAvatarImage} />
                    ) : (
                      <div className={pageStyles.teamAvatar}>{staff.name[0]}</div>
                    )}
                    <div className={pageStyles.teamName}>{staff.name}</div>
                  </div>
                  <div className={pageStyles.teamStatsRow}>
                    <div className={pageStyles.teamStat}>
                      <span className={pageStyles.teamStatValue}>{active}</span>
                      <span className={pageStyles.teamStatLabel}>Active</span>
                    </div>
                    <div className={pageStyles.teamStat}>
                      <span className={`${pageStyles.teamStatValue} ${overdue > 0 ? pageStyles.teamStatAlert : ''}`}>{overdue}</span>
                      <span className={pageStyles.teamStatLabel}>Overdue</span>
                    </div>
                    <div className={pageStyles.teamStat}>
                      <span className={pageStyles.teamStatValue}>{completed}</span>
                      <span className={pageStyles.teamStatLabel}>Done</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.rail}>
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Shop Today</span>
          </div>
          <ShopTodayCard loops={openLoops} onNavigate={onNavigate} shop={currentShop} />
                  <MilestonesCard />
          {currentShop && (
            <GeneralExpenses shopId={currentShop.id} currency={currentShop.currency} />
          )}
        </div>
      </div>
    </div>
  );
}
