'use client';

import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { ROUTES } from '@/lib/routes';
import type { Order } from '@/lib/types';
import { CRAFT_ROLE_LABELS } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import QuickCommandHub from '../QuickCommandHub';
import DiscoverCarousel from './DiscoverCarousel';
import TodaysAgendaWidget from '../TodaysAgendaWidget';
import TodayPrioritiesWidget from '../TodayPrioritiesWidget';
import MilestonesCard from '../MilestonesCard';
import MarketDayWidget from '@/components/ui/MarketDayWidget/MarketDayWidget';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from '../../page.module.css';

// ============================================================
// Owner Dashboard — mobile (Apple / Instagram Atelier Cockpit)
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
  const {
    hideCollected,
    hideProjected,
    toggleHideCollected,
    collected,
    monthlyRevenue,
    urgentCount,
    uncutFabricsCount,
    inProductionCount,
    readyCount,
    debtTotal,
    debtorsCount,
    teamSnapshot,
  } = useOwnerDashboardData(orders, staffMembers);

  const openLoops = useOpenLoops(orders, customers, exceptions);

  // Progressive Onboarding: Days 1-10 top, Days 11-30 bottom, Day 31+ hidden
  const createdAt = currentShop?.createdAt ? new Date(currentShop.createdAt) : new Date();
  const daysOld = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24));
  const showDiscoverTop = daysOld <= 10;
  const showDiscoverBottom = daysOld > 10 && daysOld <= 30;

  return (
    <>
      {/* 1. Unified Atelier Command Hero Surface */}
      <section className={styles.atelierHero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroIdentity}>
            <span className={styles.heroGreeting}>Atelier Command</span>
            <h1 className={styles.heroShopName}>{currentShop?.name || 'Bespoke Atelier'}</h1>
          </div>
          <button
            type="button"
            className={styles.heroNewOrderBtn}
            onClick={() => onNavigate(ROUTES.orderNew)}
          >
            <Symbol name="add" size={18} />
            <span>New Order</span>
          </button>
        </div>

        {/* Financial Revenue Hero */}
        <div className={styles.heroRevenueBlock}>
          <div className={styles.heroRevenueHeader}>
            <span className={styles.heroRevenueLabel}>Total Collected</span>
            <button
              type="button"
              onClick={toggleHideCollected}
              className={styles.heroEyeBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
              aria-label={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              <Symbol name={hideCollected ? 'visibility_off' : 'visibility'} size={16} />
            </button>
          </div>
          <div className={styles.heroRevenueValue}>
            {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
          </div>

          {/* Integrated Monthly Target Progress Bar */}
          {currentShop?.monthlyRevenueTarget ? (
            <div className={styles.monthlyProgressWrap}>
              <div className={styles.monthlyProgressMeta}>
                <span className={styles.monthlyProgressLabel}>Monthly Goal</span>
                <span className={styles.monthlyProgressNums}>
                  {hideCollected ? '******' : formatCurrency(monthlyRevenue, currentShop?.currency)} /{' '}
                  {hideCollected ? '******' : formatCurrency(currentShop.monthlyRevenueTarget, currentShop?.currency)}
                </span>
              </div>
              <div className={styles.monthlyProgressBarTrack}>
                <div
                  className={styles.monthlyProgressBarFill}
                  style={{
                    width: `${Math.min(100, Math.round((monthlyRevenue / currentShop.monthlyRevenueTarget) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.setGoalPill}
              onClick={() => onNavigate('/settings/studio')}
            >
              <Symbol name="flag" size={14} />
              <span>Set Monthly Atelier Revenue Target</span>
            </button>
          )}
        </div>

        {/* 5-Pillar Workshop Metric Strip */}
        <div className={styles.workshopMetricStrip}>
          <button
            type="button"
            className={styles.metricItem}
            onClick={() => onNavigate('/fabrics')}
            aria-label="View uncut fabrics on cutting table"
          >
            <div className={styles.metricTop}>
              <span className={styles.metricNum}>{uncutFabricsCount}</span>
              {uncutFabricsCount > 0 && <span className={styles.metricAlertDot} />}
            </div>
            <span className={styles.metricLabel}>Uncut</span>
          </button>

          <div className={styles.metricDivider} />

          <button
            type="button"
            className={styles.metricItem}
            onClick={() => onNavigate('/production')}
            aria-label="View active sewing production queue"
          >
            <div className={styles.metricTop}>
              <span className={styles.metricNum}>{inProductionCount}</span>
            </div>
            <span className={styles.metricLabel}>In Sewing</span>
          </button>

          <div className={styles.metricDivider} />

          <button
            type="button"
            className={styles.metricItem}
            onClick={() => onNavigate('/production?status=Ready')}
            aria-label="View ready garments for pickup"
          >
            <div className={styles.metricTop}>
              <span className={styles.metricNum}>{readyCount}</span>
            </div>
            <span className={styles.metricLabel}>Ready</span>
          </button>

          <div className={styles.metricDivider} />

          <button
            type="button"
            className={`${styles.metricItem} ${urgentCount > 0 ? styles.metricAlertItem : ''}`}
            onClick={() => onNavigate('/production')}
            aria-label="View overdue and urgent orders"
          >
            <div className={styles.metricTop}>
              <span className={styles.metricNum}>{urgentCount}</span>
              {urgentCount > 0 && <span className={styles.metricAlertDot} />}
            </div>
            <span className={styles.metricLabel}>Overdue</span>
          </button>

          <div className={styles.metricDivider} />

          <button
            type="button"
            className={`${styles.metricItem} ${debtorsCount > 0 ? styles.metricDebtItem : ''}`}
            onClick={() => onNavigate('/collections')}
            aria-label="View uncollected debtor balances"
          >
            <div className={styles.metricTop}>
              <span className={styles.metricNum}>
                {hideProjected ? '******' : formatCurrency(debtTotal, currentShop?.currency)}
              </span>
            </div>
            <span className={styles.metricLabel}>Debt Due</span>
          </button>
        </div>
      </section>

      {/* 2. OPay-Inspired Master Actions & Atelier Switchboard */}
      <QuickCommandHub
        onNavigate={onNavigate}
        uncutFabricsCount={uncutFabricsCount}
        inProductionCount={inProductionCount}
        fittingsTodayCount={dueTodayCount}
        customersCount={customers?.length || 0}
        debtorsCount={debtorsCount}
        debtTotal={debtTotal}
      />

      {/* 3. Progressive Discover Placement: Top for Days 1 to 10 */}
      {showDiscoverTop && <DiscoverCarousel onNavigate={onNavigate} />}

      {currentShop?.businessMode !== 'bespoke' && <MarketDayWidget />}

      {/* 4. Today's Schedule & Fittings (Calendar) */}
      <TodaysAgendaWidget />

      {/* 5. Today's Workshop Priorities (Open Loops & Bottlenecks) */}
      <TodayPrioritiesWidget
        loops={openLoops}
        onNavigate={onNavigate}
      />

      {/* 6. Studio Milestones & Atelier Growth */}
      <MilestonesCard />

      {/* 7. Artisan Bench — Team Craft Workload */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Artisan Bench</span>
      </div>

      {teamSnapshot.length === 0 ? (
        <div className={styles.teamInviteCard}>
          <div className={styles.teamInviteLeft}>
            <div className={styles.teamInviteIconWrap}>
              <Symbol name="group_add" size={18} />
            </div>
            <div>
              <span className={styles.teamInviteTitle}>Delegate to Apprentices & Tailors</span>
              <span className={styles.teamInviteSub}>Assign garments by craft role & track completed pieces</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.teamInviteBtn}
            onClick={() => onNavigate('/settings/staff')}
          >
            Add Team
          </button>
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
                  <Image
                    src={staff.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className={styles.teamAvatarImage}
                  />
                ) : (
                  <div className={styles.teamAvatar}>{staff.name[0]}</div>
                )}
                <div>
                  <div className={styles.teamName}>
                    {staff.name}
                    <span className={styles.craftBadge}>
                      {CRAFT_ROLE_LABELS[staff.craftRole || 'tailor']}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.teamStatsRow}>
                <div className={styles.teamStat}>
                  <span className={styles.teamStatValue}>{active}</span>
                  <span className={styles.teamStatLabel}>Active</span>
                </div>
                <div className={styles.teamStat}>
                  <span
                    className={`${styles.teamStatValue} ${
                      overdue > 0 ? styles.teamStatAlert : ''
                    }`}
                  >
                    {overdue}
                  </span>
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

      {/* 8. Progressive Discover Placement: Bottom for Days 11 to 30 */}
      {showDiscoverBottom && <DiscoverCarousel onNavigate={onNavigate} />}
    </>
  );
}
