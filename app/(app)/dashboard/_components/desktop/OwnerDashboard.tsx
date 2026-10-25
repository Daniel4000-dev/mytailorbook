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
import DiscoverBanner from './DiscoverBanner';
import TodayPrioritiesWidget from '../TodayPrioritiesWidget';
import pageStyles from '../../page.module.css';
import styles from './OwnerDashboard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
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
    readyCount,
    debtTotal,
    debtorsCount,
    teamSnapshot,
  } = useOwnerDashboardData(orders, staffMembers);

  const openLoops = useOpenLoops(orders, customers, exceptions);

  // Show tips only in first 30 days
  const createdAt = currentShop?.createdAt ? new Date(currentShop.createdAt) : new Date();
  const daysOld = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24));
  const showDiscover = daysOld <= 30;

  return (
    <div className={styles.content}>
      {/* 1-Tap Quick Action Command Utilities */}
      <QuickCommandHub
        onNavigate={onNavigate}
        uncutFabricsCount={uncutFabricsCount}
      />

      {currentShop?.businessMode !== 'bespoke' && <MarketDayWidget />}

      {/* Hero: Dominant Atelier Financial & Operational Command */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroIdentity}>
            <span className={styles.heroEyebrow}>Atelier Command Center</span>
            <span className={styles.heroShopName}>{currentShop?.name || 'Bespoke Atelier'}</span>
          </div>
          <button
            type="button"
            className={styles.heroCta}
            onClick={() => onNavigate(ROUTES.orderNew)}
          >
            <Symbol name="add" size={18} />
            <span>New Bespoke Order</span>
          </button>
        </div>

        <div className={styles.heroMain}>
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

      {/* 2-Column Command Workspace */}
      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          {/* Workfloor Floor Overview */}
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Workfloor Operations</span>
          </div>

          <div className={pageStyles.operationalGrid}>
            <button
              type="button"
              className={pageStyles.operationalCard}
              onClick={() => onNavigate('/fabrics')}
            >
              <div className={pageStyles.operationalHeader}>
                <Symbol name="texture" size={18} className={pageStyles.operationalIcon} />
                {uncutFabricsCount > 0 && (
                  <span className={pageStyles.operationalBadgeAlert}>
                    <Symbol name="content_cut" size={10} />
                    <span>{uncutFabricsCount}</span>
                  </span>
                )}
              </div>
              <span className={pageStyles.operationalValue}>{uncutFabricsCount}</span>
              <span className={pageStyles.operationalLabel}>Uncut Fabrics</span>
            </button>

            <button
              type="button"
              className={pageStyles.operationalCard}
              onClick={() => onNavigate('/production')}
            >
              <div className={pageStyles.operationalHeader}>
                <Symbol name="dry_cleaning" size={18} className={pageStyles.operationalIcon} />
              </div>
              <span className={pageStyles.operationalValue}>{inProductionCount}</span>
              <span className={pageStyles.operationalLabel}>In Production</span>
            </button>

            <button
              type="button"
              className={pageStyles.operationalCard}
              onClick={() => onNavigate('/production?status=Ready')}
            >
              <div className={pageStyles.operationalHeader}>
                <Symbol name="check_circle" size={18} className={pageStyles.operationalIcon} />
              </div>
              <span className={pageStyles.operationalValue}>{readyCount}</span>
              <span className={pageStyles.operationalLabel}>Ready for Pickup</span>
            </button>
          </div>

          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Artisan Bench</span>
          </div>

          {teamSnapshot.length === 0 ? (
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <EmptyState
                icon={<Symbol name="group" size={32} />}
                title="No staff added yet"
                description="Invite your team to view their live workloads."
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
                      <Image
                        src={staff.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className={pageStyles.teamAvatarImage}
                      />
                    ) : (
                      <div className={pageStyles.teamAvatar}>{staff.name[0]}</div>
                    )}
                    <div className={pageStyles.teamName}>
                      {staff.name}
                      <span className={pageStyles.craftBadge}>
                        {CRAFT_ROLE_LABELS[staff.craftRole || 'tailor']}
                      </span>
                    </div>
                  </div>
                  <div className={pageStyles.teamStatsRow}>
                    <div className={pageStyles.teamStat}>
                      <span className={pageStyles.teamStatValue}>{active}</span>
                      <span className={pageStyles.teamStatLabel}>Active</span>
                    </div>
                    <div className={pageStyles.teamStat}>
                      <span
                        className={`${pageStyles.teamStatValue} ${
                          overdue > 0 ? pageStyles.teamStatAlert : ''
                        }`}
                      >
                        {overdue}
                      </span>
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
          {/* Today's Priorities (Unified Fittings & Open Loops) */}
          <TodayPrioritiesWidget loops={openLoops} onNavigate={onNavigate} />

          {/* Tips only for first 30 days */}
          {showDiscover && <DiscoverBanner onNavigate={onNavigate} />}
        </div>
      </div>
    </div>
  );
}
