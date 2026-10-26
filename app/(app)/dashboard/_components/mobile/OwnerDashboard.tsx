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
    dueTodayCount,
    uncutFabricsCount,
    inProductionCount,
    readyCount,
    debtTotal,
    debtorsCount,
    teamSnapshot,
  } = useOwnerDashboardData(orders, staffMembers);

  const openLoops = useOpenLoops(orders, customers, exceptions);

  return (
    <>
      {/* 1. Unified Atelier Command Hero Surface */}
      <section className={styles.atelierHero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroIdentity}>
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

      {currentShop?.businessMode !== 'bespoke' && <MarketDayWidget />}

      {/* 3. Today's Schedule & Fittings (Calendar) */}
      <TodaysAgendaWidget />

      {/* 4. Today's Workshop Priorities (Open Loops & Bottlenecks) */}
      <TodayPrioritiesWidget
        loops={openLoops}
        onNavigate={onNavigate}
      />

      {/* 5. Studio Milestones & Atelier Growth */}
      <MilestonesCard />

      {/* 6. Artisan Bench — Team Craft Workload */}
      {teamSnapshot.length === 0 ? (
        <div className={styles.teamInviteCard}>
          <div className={styles.teamInviteLeft}>
            <div className={styles.teamInviteIconWrap}>
              <Symbol name="group_add" size={18} />
            </div>
            <div>
              <span className={styles.teamInviteTitle}>Delegate to Apprentices &amp; Tailors</span>
              <span className={styles.teamInviteSub}>Assign garments by craft role &amp; track completed pieces</span>
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
        <div className={styles.teamBenchCard}>
          <div className={styles.teamBenchHeader}>
            <div className={styles.teamBenchTitleRow}>
              <Symbol name="group" size={16} className={styles.teamBenchIcon} />
              <span className={styles.teamBenchTitle}>Team Workload</span>
              <span className={styles.teamBenchBadge}>
                {teamSnapshot.length} Tailor{teamSnapshot.length === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              className={styles.teamBenchLink}
              onClick={() => onNavigate('/settings/staff')}
            >
              <span>Manage</span>
              <Symbol name="chevron_right" size={14} />
            </button>
          </div>
          <div className={styles.teamGrid}>
            {teamSnapshot.map(({ staff, active, overdue, completed }) => (
              <button
                key={staff.uid}
                className={styles.teamCard}
                onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
                type="button"
              >
                <div className={styles.teamCardLeft}>
                  {staff.avatarUrl ? (
                    <Image
                      src={staff.avatarUrl}
                      alt=""
                      width={38}
                      height={38}
                      className={styles.teamAvatarImage}
                    />
                  ) : (
                    <div className={styles.teamAvatar}>{staff.name[0]}</div>
                  )}
                  <div className={styles.teamInfo}>
                    <div className={styles.teamNameRow}>
                      <span className={styles.teamName}>{staff.name}</span>
                      <span className={styles.craftBadge}>
                        {CRAFT_ROLE_LABELS[staff.craftRole || 'tailor']}
                      </span>
                    </div>
                    <span className={styles.teamCompletedNote}>
                      {completed} completed piece{completed === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className={styles.teamCardRight}>
                  <div className={styles.teamBadges}>
                    <span className={styles.teamActiveBadge}>
                      {active} Active
                    </span>
                    {overdue > 0 && (
                      <span className={styles.teamOverdueBadge}>
                        {overdue} Overdue
                      </span>
                    )}
                  </div>
                  <Symbol name="chevron_right" size={16} className={styles.teamChevron} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
