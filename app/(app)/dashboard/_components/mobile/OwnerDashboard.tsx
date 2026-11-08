'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { CRAFT_ROLE_LABELS } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import { useShowroomStockMetrics } from '../../_hooks/useShowroomStockMetrics';
import QuickCommandHub from '../QuickCommandHub';
import TodayPrioritiesWidget from '../TodayPrioritiesWidget';
import ProfileSetupProgress from '../ProfileSetupProgress';
import PodCoOpBanner from '../PodCoOpBanner';
import AtelierFirstWinCard from '../AtelierFirstWinCard';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
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
  const businessMode = currentShop?.businessMode || 'bespoke';
  const isRtw = businessMode === 'rtw';
  const isHybrid = businessMode === 'hybrid';
  const [hybridLens, setHybridLens] = useState<'bespoke' | 'rtw'>('bespoke');

  const showroomMetrics = useShowroomStockMetrics(currentShop?.id, isRtw || isHybrid);

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

  const isDayOne = isRtw
    ? orders.length === 0 && showroomMetrics.totalPieces === 0
    : isHybrid
    ? orders.length === 0 && showroomMetrics.totalPieces === 0
    : orders.length === 0;

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
            <h1 className={styles.heroShopName}>{currentShop?.name || 'My Shop'}</h1>
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
            <div
              className={styles.heroRevenueValue}
              onClick={() => onNavigate(ROUTES.reports)}
              style={{ cursor: 'pointer' }}
              title="Open Financial Intelligence"
            >
              {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
            </div>
          </div>
        </div>

        {/* Integrated Monthly Target Progress Bar */}
        {currentShop?.monthlyRevenueTarget ? (
          <div
            className={styles.monthlyProgressWrap}
            onClick={() => onNavigate(ROUTES.reports)}
            style={{ cursor: 'pointer' }}
            title="View Sales Reports"
          >
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

        {/* Hybrid Segmented Lens Switcher */}
        {isHybrid && (
          <div className={styles.hybridToggleWrap}>
            <div className={styles.hybridToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={hybridLens === 'bespoke'}
                className={`${styles.hybridToggleBtn} ${hybridLens === 'bespoke' ? styles.hybridToggleBtnActive : ''}`}
                onClick={() => setHybridLens('bespoke')}
              >
                Bespoke Studio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={hybridLens === 'rtw'}
                className={`${styles.hybridToggleBtn} ${hybridLens === 'rtw' ? styles.hybridToggleBtnActive : ''}`}
                onClick={() => setHybridLens('rtw')}
              >
                Showroom Rack
              </button>
            </div>
          </div>
        )}

        {/* Operations Dashboard Grid — Elevated Cockpit Deck */}
        {isRtw || (isHybrid && hybridLens === 'rtw') ? (
          showroomMetrics.totalPieces > 0 || orders.length > 0 ? (
            <div className={styles.operationsGrid}>
              {/* Row 1: On Rack, Low Stock, Overdue Payment */}
              <button
                type="button"
                className={styles.operationsCard}
                onClick={() => onNavigate(ROUTES.stock)}
                aria-label="View garments in stock on rack"
              >
                <div className={styles.metricTop}>
                  <span className={styles.metricNum}>{showroomMetrics.totalPieces}</span>
                </div>
                <span className={styles.metricLabel}>On Rack</span>
              </button>

              <button
                type="button"
                className={`${styles.operationsCard} ${showroomMetrics.lowStockCount > 0 ? styles.metricAlertItem : ''}`}
                onClick={() => onNavigate(ROUTES.stock)}
                aria-label="View low stock alerts"
              >
                <div className={styles.metricTop}>
                  <span className={styles.metricNum}>{showroomMetrics.lowStockCount}</span>
                  {showroomMetrics.lowStockCount > 0 && <span className={styles.metricAlertDot} />}
                </div>
                <span className={styles.metricLabel}>Low Stock</span>
              </button>

              <button
                type="button"
                className={`${styles.operationsCard} ${debtorsCount > 0 ? styles.metricDebtItem : ''}`}
                onClick={() => onNavigate(ROUTES.collections)}
                aria-label="View uncollected debtor balances"
              >
                <div className={styles.metricTop}>
                  <span className={styles.metricNum}>
                    {hideProjected ? '******' : formatCurrency(debtTotal, currentShop?.currency)}
                  </span>
                </div>
                <span className={styles.metricLabel}>Overdue payment</span>
              </button>

              {/* Row 2: Counter POS, Public Showroom */}
              <button
                type="button"
                className={`${styles.operationsCard} ${styles.operationsCardWide}`}
                onClick={() => onNavigate(ROUTES.stock)}
                aria-label="Open Counter POS"
              >
                <div className={styles.metricTop}>
                  <span className={styles.metricNum}>POS</span>
                </div>
                <span className={styles.metricLabel}>Counter POS</span>
              </button>

              <button
                type="button"
                className={`${styles.operationsCard} ${styles.operationsCardWide}`}
                onClick={() => onNavigate(currentShop?.slug ? `/catalogue/${currentShop.slug}?view=rack` : ROUTES.stock)}
                aria-label="View Public Showroom Floor"
              >
                <div className={styles.metricTop}>
                  <span className={styles.metricNum}>Live</span>
                </div>
                <span className={styles.metricLabel}>Showroom</span>
              </button>
            </div>
          ) : (
            <div className={styles.dayOneBanner}>
              <Symbol name="storefront" size={18} />
              <span>Ready for Day 1 — Add garments to your stock rack below to launch your digital showroom and start recording counter sales.</span>
            </div>
          )
        ) : orders.length > 0 ? (
          <div className={styles.operationsGrid}>
            {/* Row 1: Sewing, Cutting, Overdue Payment (3 cards) */}
            <button
              type="button"
              className={styles.operationsCard}
              onClick={() => onNavigate('/production')}
              aria-label="View active sewing production queue"
            >
              <div className={styles.metricTop}>
                <span className={styles.metricNum}>{inProductionCount}</span>
              </div>
              <span className={styles.metricLabel}>Sewing</span>
            </button>

            <button
              type="button"
              className={styles.operationsCard}
              onClick={() => onNavigate('/fabrics')}
              aria-label="View uncut fabrics on cutting table"
            >
              <div className={styles.metricTop}>
                <span className={styles.metricNum}>{uncutFabricsCount}</span>
                {uncutFabricsCount > 0 && <span className={styles.metricAlertDot} />}
              </div>
              <span className={styles.metricLabel}>Cutting</span>
            </button>

            <button
              type="button"
              className={`${styles.operationsCard} ${debtorsCount > 0 ? styles.metricDebtItem : ''}`}
              onClick={() => onNavigate('/collections')}
              aria-label="View uncollected debtor balances"
            >
              <div className={styles.metricTop}>
                <span className={styles.metricNum}>
                  {hideProjected ? '******' : formatCurrency(debtTotal, currentShop?.currency)}
                </span>
              </div>
              <span className={styles.metricLabel}>Overdue payment</span>
            </button>

            {/* Row 2: Ready, Overdue (2 wide cards, balanced) */}
            <button
              type="button"
              className={`${styles.operationsCard} ${styles.operationsCardWide}`}
              onClick={() => onNavigate('/production?status=Ready')}
              aria-label="View ready garments for pickup"
            >
              <div className={styles.metricTop}>
                <span className={styles.metricNum}>{readyCount}</span>
              </div>
              <span className={styles.metricLabel}>Ready</span>
            </button>

            <button
              type="button"
              className={`${styles.operationsCard} ${styles.operationsCardWide} ${urgentCount > 0 ? styles.metricAlertItem : ''}`}
              onClick={() => onNavigate('/production')}
              aria-label="View overdue and urgent orders"
            >
              <div className={styles.metricTop}>
                <span className={styles.metricNum}>{urgentCount}</span>
                {urgentCount > 0 && <span className={styles.metricAlertDot} />}
              </div>
              <span className={styles.metricLabel}>Overdue</span>
            </button>
          </div>
        ) : (
          <div className={styles.dayOneBanner}>
            <Symbol name="straighten" size={18} />
            <span>Ready for Day 1 — Create your first order below to start tracking your cutting and sewing board.</span>
          </div>
        )}
      </section>

      {/* 2. Shop First-Win Launchpad (Shown when shop is new on Day 1) */}
      {isDayOne && (
        <AtelierFirstWinCard
          shopName={currentShop?.name || 'Your Shop'}
          onNavigate={onNavigate}
          businessMode={businessMode}
          shopSlug={currentShop?.slug || currentShop?.id}
        />
      )}

      {/* 3. Complete Profile Setup Progress Status (Auto-hides when 100% complete) */}
      <ProfileSetupProgress onNavigate={onNavigate} />

      {/* 4. Quick Nav (Master Actions & Atelier Switchboard) */}
      <QuickCommandHub
        onNavigate={onNavigate}
        uncutFabricsCount={uncutFabricsCount}
        inProductionCount={inProductionCount}
        fittingsTodayCount={dueTodayCount}
        customersCount={customers?.length || 0}
        debtorsCount={debtorsCount}
        debtTotal={debtTotal}
        businessMode={businessMode}
        shopSlug={currentShop?.slug || currentShop?.id}
        stockCount={showroomMetrics.totalPieces}
      />

      {/* 5. Active Shop Sections (Unlocked once orders are live) */}
      {orders.length > 0 && (
        <>
          <PodCoOpBanner />
          <TodayPrioritiesWidget
            loops={openLoops}
            onNavigate={onNavigate}
          />
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
      )}
    </>
  );
}
