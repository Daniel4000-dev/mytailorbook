'use client';

import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
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
        {/* Tailor's Hand-Basting Pick-Stitch Border */}
        <div className={styles.heroStitchBorder} aria-hidden="true" />

        {/* Sartorial Heritage Watermark Crest */}
        <div className={styles.heroWatermark} aria-hidden="true">
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="90" cy="90" r="82" stroke="white" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="90" cy="90" r="70" stroke="white" strokeWidth="0.7" opacity="0.3" />
            <circle cx="90" cy="90" r="54" stroke="white" strokeWidth="1" strokeDasharray="6 4" opacity="0.35" />
            <circle cx="90" cy="90" r="38" stroke="white" strokeWidth="0.7" opacity="0.25" />
            <path d="M50 130L130 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M130 130L50 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <circle cx="48" cy="132" r="14" stroke="white" strokeWidth="2" opacity="0.5" />
            <circle cx="132" cy="132" r="14" stroke="white" strokeWidth="2" opacity="0.5" />
            <circle cx="90" cy="90" r="4.5" fill="white" opacity="0.8" />
            <path d="M90 20V160" stroke="white" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.45" />
            <ellipse cx="90" cy="30" rx="3" ry="7" stroke="white" strokeWidth="1.2" opacity="0.7" />
          </svg>
        </div>

        <div className={styles.heroHeader}>
          <div className={styles.heroIdentity}>
            <div className={styles.heroHallmark}>
              <Symbol name="needle" size={9} />
              <span>BESPOKE ATELIER</span>
            </div>
            <h1 className={styles.heroShopName}>{currentShop?.name || 'Bespoke Atelier'}</h1>
          </div>
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
                <Symbol name={hideCollected ? 'visibility_off' : 'visibility'} size={14} />
              </button>
            </div>
            <div className={styles.heroRevenueValue}>
              {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
            </div>
          </div>
        </div>

        {/* Engraved Sartorial Selvedge Strip */}
        <div className={styles.engravedSelvedgeStrip} aria-hidden="true">
          <span className={styles.selvedgeRulerTicks} />
          <span className={styles.selvedgeLabel}>
            ATELIER COMMAND · REF #{currentShop?.id?.slice(0, 4)?.toUpperCase() || 'SUITE'}
          </span>
          <span className={styles.selvedgeRulerTicks} />
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
        ) : null}

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
