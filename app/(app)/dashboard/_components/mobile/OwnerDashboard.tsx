'use client';

import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import QuickCommandHub from '../QuickCommandHub';
import DiscoverCarousel from './DiscoverCarousel';
import ShopTodayCard from '../ShopTodayCard';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import TodaysAgendaWidget from '../TodaysAgendaWidget';
import MarketDayWidget from '@/components/ui/MarketDayWidget/MarketDayWidget';

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
  const { currentShop, customers, exceptions } = useData();
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
      {/* Quick 1-Tap Command Center Hub */}
      <QuickCommandHub
        onNavigate={onNavigate}
        uncutFabricsCount={uncutFabricsCount}
        debtorsCount={debtorsCount}
      />

      <DiscoverCarousel onNavigate={onNavigate} />

      {currentShop?.businessMode !== 'bespoke' && <MarketDayWidget />}

      {/* Today's Fittings & Appointments */}
      <TodaysAgendaWidget />

      {/* Workfloor Operational Pulse */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Workfloor Pulse</span>
      </div>

      <div className={styles.operationalGrid}>
        <button
          type="button"
          className={styles.operationalCard}
          onClick={() => onNavigate('/fabrics')}
          aria-label="View uncut fabrics on cutting board"
        >
          <div className={styles.operationalHeader}>
            <Symbol name="texture" size={18} className={styles.operationalIcon} />
            {uncutFabricsCount > 0 && (
              <span className={styles.operationalBadgeAlert}>
                <Symbol name="content_cut" size={10} />
                <span>{uncutFabricsCount}</span>
              </span>
            )}
          </div>
          <span className={styles.operationalValue}>{uncutFabricsCount}</span>
          <span className={styles.operationalLabel}>Uncut Fabrics</span>
        </button>

        <button
          type="button"
          className={styles.operationalCard}
          onClick={() => onNavigate('/production')}
          aria-label="View active floor production"
        >
          <div className={styles.operationalHeader}>
            <Symbol name="dry_cleaning" size={18} className={styles.operationalIcon} />
          </div>
          <span className={styles.operationalValue}>{inProductionCount}</span>
          <span className={styles.operationalLabel}>In Production</span>
        </button>

        <button
          type="button"
          className={styles.operationalCard}
          onClick={() => onNavigate('/production?status=Ready')}
          aria-label="View garments ready for delivery"
        >
          <div className={styles.operationalHeader}>
            <Symbol name="check_circle" size={18} className={styles.operationalIcon} />
          </div>
          <span className={styles.operationalValue}>{readyCount}</span>
          <span className={styles.operationalLabel}>Ready Pickup</span>
        </button>
      </div>

      {/* Financial Health Overview */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Executive Pulse</span>
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

        <div
          className={`${styles.financeCard} ${debtorsCount > 0 ? styles.alertCard : ''}`}
          onClick={() => onNavigate('/collections')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Uncollected</span>
            <Symbol name="account_balance_wallet" size={16} />
          </div>
          <span className={styles.cardValue}>
            {hideProjected ? '******' : formatCurrency(debtTotal, currentShop?.currency)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Overdue & Rush</span>
            {urgentCount > 0 && <Symbol name="local_fire_department" size={16} />}
          </div>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>

        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Due Today</span>
            <Symbol name="event" size={16} />
          </div>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      {/* Monthly Goal Progress */}
      <div
        style={{
          margin: '16px 4px',
          padding: '16px',
          background: 'var(--sf-bg-surface)',
          borderRadius: 'var(--sf-radius-lg)',
          border: '1px solid var(--sf-border-light)',
          boxShadow: 'var(--sf-shadow-xs)',
        }}
      >
        {currentShop?.monthlyRevenueTarget ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>
                Monthly Target
              </span>
              <span style={{ color: 'var(--sf-text-secondary)', fontFamily: 'var(--sf-font-numeric)' }}>
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
                backgroundColor: 'var(--sf-surface-variant)',
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
                      : 'var(--sf-accent-indigo)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-out',
                }}
              />
            </div>
            <p
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--sf-text-secondary)',
                textAlign: 'center',
              }}
            >
              {monthlyRevenue >= currentShop.monthlyRevenueTarget
                ? 'Monthly target achieved! Exceptional craftsmanship.'
                : `${
                    hideCollected
                      ? '******'
                      : formatCurrency(
                          currentShop.monthlyRevenueTarget - monthlyRevenue,
                          currentShop?.currency
                        )
                  } remaining to hit goal.`}
            </p>
            {currentShop.monthlyRevenueTarget > monthlyRevenue && (
              <button
                type="button"
                onClick={() => onNavigate('/quotes')}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  background: 'var(--sf-surface-variant)',
                  color: 'var(--sf-text-primary)',
                  padding: '8px',
                  borderRadius: 'var(--sf-radius-md)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--sf-border-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Symbol name="calculate" size={16} />
                <span>Send Quotations to Close Gap</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--sf-text-primary)',
                }}
              >
                Set Atelier Monthly Goal
              </span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                Track target revenue against actual production.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/settings/studio')}
              style={{
                background: 'var(--sf-accent-indigo)',
                color: '#fff',
                padding: '7px 14px',
                borderRadius: 'var(--sf-radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Set Goal
            </button>
          </div>
        )}
      </div>

      {/* Shop Today Open Loops */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Shop Today</span>
      </div>
      <ShopTodayCard loops={openLoops} onNavigate={onNavigate} shop={currentShop} />

      {/* Team Workload Snapshot */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Team Workload</span>
      </div>

      {teamSnapshot.length === 0 ? (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <EmptyState
            icon={<Symbol name="group" size={32} />}
            title="No artisans assigned yet"
            description="Invite tailors and apprentices to view their production workloads."
            action={{ label: 'Manage Team', onClick: () => onNavigate('/settings/staff') }}
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
                <div className={styles.teamName}>{staff.name}</div>
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
    </>
  );
}
