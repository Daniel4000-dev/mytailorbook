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
import pageStyles from '../../page.module.css';
import styles from './OwnerDashboard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import MarketDayWidget from '@/components/ui/MarketDayWidget/MarketDayWidget';

// ============================================================
// Owner Dashboard — desktop (Executive Atelier Command Center)
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
    debtTotal,
    debtorsCount,
    teamSnapshot,
  } = useOwnerDashboardData(orders, staffMembers);

  const openLoops = useOpenLoops(orders, customers, exceptions);

  return (
    <div className={styles.content}>
      {currentShop?.businessMode !== 'bespoke' && <MarketDayWidget />}

      {/* Hero: Dominant Atelier Financial & Operational Command */}
      <div className={styles.hero}>
        {/* Tailor's Hand-Basting Pick-Stitch Border */}
        <div className={styles.heroStitchBorder} aria-hidden="true" />

        {/* Sartorial Heritage Watermark Crest */}
        <div className={styles.heroWatermark} aria-hidden="true">
          <svg width="220" height="220" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
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

        <div className={styles.heroTop}>
          <div className={styles.heroIdentity}>
            <div className={styles.heroHallmark}>
              <Symbol name="needle" size={9} />
              <span>BESPOKE ATELIER</span>
            </div>
            <span className={styles.heroShopName}>{currentShop?.name || 'Bespoke Atelier'}</span>
          </div>
          <div className={styles.heroPrimaryStat}>
            <div className={styles.heroPrimaryLabelRow}>
              <span className={styles.heroPrimaryLabel}>Total Collected</span>
              <button
                type="button"
                onClick={toggleHideCollected}
                className={styles.heroPrivacyBtn}
                title={hideCollected ? 'Show Balance' : 'Hide Balance'}
              >
                {hideCollected ? (
                  <Symbol name="visibility_off" size={16} />
                ) : (
                  <Symbol name="visibility" size={16} />
                )}
              </button>
            </div>
            <span className={styles.heroPrimaryValue}>
              {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
            </span>
          </div>
        </div>

        {/* Engraved Sartorial Selvedge Strip */}
        <div className={styles.engravedSelvedgeStrip} aria-hidden="true">
          <span className={styles.selvedgeRulerTicks} />
          <span className={styles.selvedgeLabel}>
            ATELIER COMMAND CENTER · SPECIFICATION NO. {currentShop?.id?.slice(0, 6)?.toUpperCase() || 'SUITE'}
          </span>
          <span className={styles.selvedgeRulerTicks} />
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroStatRow}>
            <div
              className={styles.heroStat}
              onClick={() => onNavigate('/collections')}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.heroStatLabelRow}>
                <span className={styles.heroStatLabel}>Uncollected Debt</span>
                <Symbol name="account_balance_wallet" size={13} />
              </div>
              <span className={`${styles.heroStatValue} ${debtorsCount > 0 ? styles.heroStatDue : ''}`}>
                {hideProjected ? '******' : formatCurrency(debtTotal, currentShop?.currency)}
              </span>
            </div>

            <div className={styles.heroStatDivider} />

            <div
              className={styles.heroStat}
              onClick={() => onNavigate('/fabrics')}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.heroStatLabelRow}>
                <span className={styles.heroStatLabel}>Uncut Fabrics</span>
                <Symbol name="texture" size={13} />
              </div>
              <span className={`${styles.heroStatValue} ${uncutFabricsCount > 0 ? styles.heroStatDanger : ''}`}>
                {uncutFabricsCount}
              </span>
            </div>

            <div className={styles.heroStatDivider} />

            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Overdue & Rush</span>
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

        {/* Monthly Target Progress */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {currentShop?.monthlyRevenueTarget ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              >
                <span style={{ fontWeight: 500 }}>Monthly Revenue Target</span>
                <span style={{ fontFamily: 'var(--sf-font-numeric)' }}>
                  {hideCollected ? '******' : formatCurrency(monthlyRevenue, currentShop?.currency)} /{' '}
                  {hideCollected
                    ? '******'
                    : formatCurrency(currentShop.monthlyRevenueTarget, currentShop?.currency)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (monthlyRevenue / currentShop.monthlyRevenueTarget) * 100
                    )}%`,
                    height: '100%',
                    backgroundColor:
                      monthlyRevenue >= currentShop.monthlyRevenueTarget
                        ? 'var(--sf-accent-emerald)'
                        : '#ffffff',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#ffffff' }}>
                <span style={{ display: 'block', fontWeight: 500, fontSize: '14px' }}>
                  Set Atelier Monthly Goal
                </span>
                <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  Track target revenue directly on your dashboard.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/settings/studio')}
                style={{
                  background: '#ffffff',
                  color: '#1E1B4B',
                  padding: '7px 16px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Set Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OPay-Inspired Master Actions & Atelier Switchboard */}
      <QuickCommandHub
        onNavigate={onNavigate}
        uncutFabricsCount={uncutFabricsCount}
        inProductionCount={inProductionCount}
        fittingsTodayCount={dueTodayCount}
        customersCount={customers?.length || 0}
        debtorsCount={debtorsCount}
        debtTotal={debtTotal}
      />

      {/* 2-Column Command Workspace */}
      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          {/* Today's Schedule & Fittings (Calendar) */}
          <TodaysAgendaWidget />

          {/* Artisan Bench — Team Craft Workload */}
          {teamSnapshot.length === 0 ? (
            <div className={pageStyles.teamInviteCard}>
              <div className={pageStyles.teamInviteLeft}>
                <div className={pageStyles.teamInviteIconWrap}>
                  <Symbol name="group_add" size={18} />
                </div>
                <div>
                  <span className={pageStyles.teamInviteTitle}>Delegate to Apprentices &amp; Tailors</span>
                  <span className={pageStyles.teamInviteSub}>Assign garments by craft role &amp; track completed pieces</span>
                </div>
              </div>
              <button
                type="button"
                className={pageStyles.teamInviteBtn}
                onClick={() => onNavigate('/settings/staff')}
              >
                Add Team
              </button>
            </div>
          ) : (
            <div className={pageStyles.teamBenchCard}>
              <div className={pageStyles.teamBenchHeader}>
                <div className={pageStyles.teamBenchTitleRow}>
                  <Symbol name="group" size={16} className={pageStyles.teamBenchIcon} />
                  <span className={pageStyles.teamBenchTitle}>Team Workload</span>
                  <span className={pageStyles.teamBenchBadge}>
                    {teamSnapshot.length} Tailor{teamSnapshot.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  className={pageStyles.teamBenchLink}
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
                    className={pageStyles.teamCard}
                    onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
                    type="button"
                  >
                    <div className={pageStyles.teamCardLeft}>
                      {staff.avatarUrl ? (
                        <Image
                          src={staff.avatarUrl}
                          alt=""
                          width={38}
                          height={38}
                          className={pageStyles.teamAvatarImage}
                        />
                      ) : (
                        <div className={pageStyles.teamAvatar}>{staff.name[0]}</div>
                      )}
                      <div className={pageStyles.teamInfo}>
                        <div className={pageStyles.teamNameRow}>
                          <span className={pageStyles.teamName}>{staff.name}</span>
                          <span className={pageStyles.craftBadge}>
                            {CRAFT_ROLE_LABELS[staff.craftRole || 'tailor']}
                          </span>
                        </div>
                        <span className={pageStyles.teamCompletedNote}>
                          {completed} completed piece{completed === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className={pageStyles.teamCardRight}>
                      <div className={pageStyles.teamBadges}>
                        <span className={pageStyles.teamActiveBadge}>
                          {active} Active
                        </span>
                        {overdue > 0 && (
                          <span className={pageStyles.teamOverdueBadge}>
                            {overdue} Overdue
                          </span>
                        )}
                      </div>
                      <Symbol name="chevron_right" size={16} className={pageStyles.teamChevron} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Studio Milestones & Growth */}
          <MilestonesCard />
        </div>

        <div className={styles.rail}>
          {/* Today's Priorities (Unified Fittings & Open Loops) */}
          <TodayPrioritiesWidget loops={openLoops} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
