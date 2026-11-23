'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFinancialReport, type FinancialReport } from '@/app/actions';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency, getShopCurrency } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import DonutChart from './_components/DonutChart';
import TrendChart from './_components/TrendChart';
import DebtMeter from './_components/DebtMeter';
import styles from './page.module.css';

type RangeKey = 'month' | '30d' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  month: 'This Month',
  '30d': 'Last 30 Days',
  all: 'All Time',
};

function fromDateFor(range: RangeKey): string | undefined {
  const now = new Date();
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  if (range === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return undefined;
}

const EMPTY_FINANCIAL_TOTALS: FinancialReport['totals'] = {
  collected: 0,
  outstanding: 0,
  revenueWithCostData: 0,
  costTotal: 0,
  marginTotal: 0,
  ordersWithCostCount: 0,
  totalExpenses: 0,
  netProfit: 0,
  expenseBreakdown: [
    { label: 'Materials', value: 0 },
    { label: 'Labor', value: 0 },
    { label: 'Outsourced', value: 0 },
    { label: 'Logistics', value: 0 },
    { label: 'General', value: 0 },
  ],
  trendData: [],
  bespokeRevenue: 0,
  bespokeCollected: 0,
  bespokeOutstanding: 0,
  bespokeOrdersCount: 0,
  showroomRevenue: 0,
  showroomCollected: 0,
  showroomUnitsSold: 0,
  showroomOrdersCount: 0,
};

/** Smooth 60fps animated number interpolation hook */
function useAnimatedNumber(target: number, durationMs = 520): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    const delta = target - startVal;
    if (delta === 0) return;

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + delta * eased);
      setDisplay(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = target;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}

export default function ReportsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { currentShop, orders } = useData();

  const [range, setRange] = useState<RangeKey>('month');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingReport(true);
    getFinancialReport(fromDateFor(range))
      .then((res) => {
        if (cancelled) return;
        if (!res || 'error' in res || !res.data) {
          setReport(null);
        } else {
          setReport(res.data);
        }
        setLoadingReport(false);
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          setLoadingReport(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const currency = getShopCurrency(currentShop);

  // Instant client-side fallback computation from live DataContext orders while server action resolves
  const clientFallbackTotals = useMemo<FinancialReport['totals']>(() => {
    const cutoff = fromDateFor(range);
    const filteredOrders = (orders || []).filter((o) => {
      if (!cutoff) return true;
      return (o.createdAt || '') >= cutoff;
    });

    let collected = 0;
    let outstanding = 0;
    let bespokeRevenue = 0;
    let bespokeCollected = 0;
    let bespokeOutstanding = 0;
    let bespokeOrdersCount = 0;

    for (const o of filteredOrders) {
      const paid = o.depositPaid || 0;
      const bill = o.totalBill || 0;
      collected += paid;
      if (o.status !== 'Delivered') {
        outstanding += Math.max(0, bill - paid);
        bespokeOutstanding += Math.max(0, bill - paid);
      }
      bespokeOrdersCount += 1;
      bespokeRevenue += bill;
      bespokeCollected += paid;
    }

    return {
      ...EMPTY_FINANCIAL_TOTALS,
      collected,
      outstanding,
      netProfit: collected,
      bespokeRevenue,
      bespokeCollected,
      bespokeOutstanding,
      bespokeOrdersCount,
    };
  }, [orders, range]);

  const activeTotals = useMemo(() => {
    if (!report) return clientFallbackTotals;
    if (selectedBranchId !== 'all') {
      const foundBranch = report.branches.find((b) => b.shopId === selectedBranchId);
      if (foundBranch) return foundBranch;
    }
    return report.totals;
  }, [report, selectedBranchId, clientFallbackTotals]);

  const animCollected = useAnimatedNumber(activeTotals.collected);
  const animNetProfit = useAnimatedNumber(activeTotals.netProfit);
  const animOutstanding = useAnimatedNumber(activeTotals.outstanding);
  const animExpenses = useAnimatedNumber(activeTotals.totalExpenses);

  const businessMode =
    currentShop?.businessMode ||
    ((currentShop as unknown as Record<string, unknown>)?.business_mode as string) ||
    'bespoke';
  const isRtw = businessMode === 'rtw';
  const isHybrid = businessMode === 'hybrid';

  const totalBilledVolume = activeTotals.collected + activeTotals.outstanding;
  const collectionRatePct =
    totalBilledVolume > 0 ? Math.round((activeTotals.collected / totalBilledVolume) * 100) : 0;

  const marginPercent =
    activeTotals.revenueWithCostData > 0
      ? Math.round((activeTotals.marginTotal / activeTotals.revenueWithCostData) * 100)
      : activeTotals.collected > 0
      ? Math.max(
          0,
          Math.round(
            ((activeTotals.collected - activeTotals.totalExpenses) / activeTotals.collected) * 100
          )
        )
      : null;

  const expenseRatioPct =
    activeTotals.collected > 0
      ? Math.min(100, Math.round((activeTotals.totalExpenses / activeTotals.collected) * 100))
      : 0;

  const totalSegregated = (activeTotals.bespokeRevenue || 0) + (activeTotals.showroomRevenue || 0);
  const bespokeShare =
    totalSegregated > 0
      ? Math.round(((activeTotals.bespokeRevenue || 0) / totalSegregated) * 100)
      : activeTotals.collected > 0
      ? 100
      : 0;
  const showroomShare = totalSegregated > 0 ? 100 - bespokeShare : 0;

  const healthHeadline = useMemo(() => {
    if (totalBilledVolume === 0 && activeTotals.totalExpenses === 0) {
      return {
        badge: 'Telemetry Ready',
        tone: 'indigo' as const,
        summary: 'Record orders or showroom sales to watch your live cash flow pulse in real time.',
      };
    }
    if (activeTotals.netProfit > 0 && collectionRatePct >= 75) {
      return {
        badge: 'Strong Cash Flow',
        tone: 'emerald' as const,
        summary: `${collectionRatePct}% of billed revenue is already in cash with positive net profit.`,
      };
    }
    if (activeTotals.outstanding > activeTotals.collected) {
      return {
        badge: 'Collection Focus',
        tone: 'amber' as const,
        summary: `${formatCurrency(activeTotals.outstanding, currency)} is currently awaiting collection from clients.`,
      };
    }
    return {
      badge: 'Active Pulse',
      tone: 'indigo' as const,
      summary: `Tracking ${activeTotals.bespokeOrdersCount + activeTotals.showroomOrdersCount} orders across ${RANGE_LABELS[range].toLowerCase()}.`,
    };
  }, [totalBilledVolume, activeTotals, collectionRatePct, currency, range]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(ROUTES.dashboard);
    }
  };

  return (
    <PageLayout
      width="full"
      header={
        <TopBar
          title="Sales & Reports"
          showBack={!isDesktop}
          onBack={handleBack}
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. Executive Live Financial Pulse Hero ── */}
        <section className={styles.executiveHero}>
          <div className={styles.heroGlowOrb} aria-hidden="true" />

          <div className={styles.heroTopRow}>
            <div className={styles.liveBeaconWrap}>
              <span className={styles.livePulseDot} />
              <span className={styles.liveBeaconText}>Live Financial Intelligence</span>
              <span
                className={`${styles.healthPill} ${
                  healthHeadline.tone === 'emerald'
                    ? styles.healthPillEmerald
                    : healthHeadline.tone === 'amber'
                    ? styles.healthPillAmber
                    : styles.healthPillIndigo
                }`}
              >
                {healthHeadline.badge}
              </span>
            </div>

            <div className={styles.controlsCluster}>
              {/* Branch Filter if Multi-Branch */}
              {report && report.branches.length > 1 && (
                <select
                  className={styles.branchSelect}
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  aria-label="Filter by workshop branch"
                >
                  <option value="all">All Branches ({report.branches.length})</option>
                  {report.branches.map((b) => (
                    <option key={b.shopId} value={b.shopId}>
                      {b.shopName}
                    </option>
                  ))}
                </select>
              )}

              {/* Time Horizon Switcher */}
              <div className={styles.rangeRow} role="group" aria-label="Time horizon">
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.rangeBtn} ${range === key ? styles.rangeBtnActive : ''}`}
                    onClick={() => setRange(key)}
                  >
                    {RANGE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.heroMainGrid}>
            <div className={styles.heroPrimaryCol}>
              <span className={styles.heroOverline}>
                Net Workshop Take-Home ({RANGE_LABELS[range]})
              </span>
              <div className={styles.heroHeadlineRow}>
                <h1 className={styles.heroBigNumber}>
                  {formatCurrency(animNetProfit, currency)}
                </h1>
                {marginPercent !== null && (
                  <span className={styles.heroMarginChip}>
                    <Symbol
                      name={activeTotals.netProfit >= 0 ? 'trending_up' : 'trending_down'}
                      size={14}
                    />
                    <span>{marginPercent}% margin</span>
                  </span>
                )}
              </div>
              <p className={styles.heroSummaryText}>{healthHeadline.summary}</p>
            </div>

            {/* Quick Action & Velocity Strip inside Hero */}
            <div className={styles.heroQuickStats}>
              <div className={styles.heroStatItem}>
                <span className={styles.heroStatLabel}>Total Billed Volume</span>
                <span className={styles.heroStatValue}>
                  {formatCurrency(totalBilledVolume, currency)}
                </span>
                <span className={styles.heroStatMeta}>
                  {activeTotals.bespokeOrdersCount + activeTotals.showroomOrdersCount} total orders
                </span>
              </div>

              <div className={styles.heroStatDivider} />

              <div className={styles.heroStatItem}>
                <span className={styles.heroStatLabel}>Collection Velocity</span>
                <span className={styles.heroStatValue}>{collectionRatePct}%</span>
                <span className={styles.heroStatMeta}>cash conversion ratio</span>
              </div>

              <div className={styles.heroStatDivider} />

              <div className={styles.heroStatActions}>
                <button
                  type="button"
                  className={styles.heroActionBtn}
                  onClick={() => router.push(ROUTES.reconciliation)}
                >
                  <Symbol name="receipt_long" size={15} />
                  <span>Log Expense</span>
                </button>
                <button
                  type="button"
                  className={styles.heroActionBtnSecondary}
                  onClick={() => router.push(ROUTES.collections)}
                >
                  <Symbol name="account_balance_wallet" size={15} />
                  <span>Debtors</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. 4-Pillar Living Telemetry Cards ── */}
        <div className={styles.metricsGrid}>
          {/* Pillar 1: Gross Collected */}
          <div className={`${styles.metricCard} ${styles.metricCardEmerald}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Gross Collected</span>
              <div className={`${styles.metricIconWrap} ${styles.iconEmerald}`}>
                <Symbol name="payments" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>
              {formatCurrency(animCollected, currency)}
            </span>
            <div className={styles.metricMicroBar}>
              <div
                className={styles.metricMicroFillEmerald}
                style={{ width: `${Math.max(collectionRatePct, activeTotals.collected > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className={styles.metricSub}>
              {isRtw
                ? `${activeTotals.showroomUnitsSold} pieces sold`
                : `${activeTotals.bespokeOrdersCount} commissions (${collectionRatePct}% collected)`}
            </span>
          </div>

          {/* Pillar 2: Net Margin & Take-Home */}
          <div className={`${styles.metricCard} ${styles.metricCardIndigo}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Profit Margin</span>
              <div className={`${styles.metricIconWrap} ${styles.iconIndigo}`}>
                <Symbol name="trending_up" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>
              {marginPercent !== null ? `${marginPercent}%` : '--'}
            </span>
            <div className={styles.metricMicroBar}>
              <div
                className={styles.metricMicroFillIndigo}
                style={{ width: `${marginPercent !== null ? Math.max(Math.min(marginPercent, 100), 6) : 0}%` }}
              />
            </div>
            <span className={styles.metricSub}>
              Net: {formatCurrency(animNetProfit, currency)}
            </span>
          </div>

          {/* Pillar 3: Receivables (Debt) */}
          <div
            className={`${styles.metricCard} ${styles.metricCardAmber}`}
            onClick={() => router.push(ROUTES.collections)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(ROUTES.collections);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Receivables (Debt)</span>
              <div className={`${styles.metricIconWrap} ${styles.iconAmber}`}>
                <Symbol name="account_balance_wallet" size={16} />
              </div>
            </div>
            <span
              className={styles.metricValue}
              style={{ color: activeTotals.outstanding > 0 ? '#D97706' : undefined }}
            >
              {formatCurrency(animOutstanding, currency)}
            </span>
            <div className={styles.metricMicroBar}>
              <div
                className={styles.metricMicroFillAmber}
                style={{
                  width: `${
                    totalBilledVolume > 0
                      ? Math.max(100 - collectionRatePct, activeTotals.outstanding > 0 ? 8 : 0)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className={styles.metricSub}>
              {activeTotals.outstanding > 0 ? 'Tap to recover balances' : 'Zero unpaid client debt'}
            </span>
          </div>

          {/* Pillar 4: Workshop Outflow */}
          <div
            className={`${styles.metricCard} ${styles.metricCardRose}`}
            onClick={() => router.push(ROUTES.reconciliation)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(ROUTES.reconciliation);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Workshop Outflow</span>
              <div className={`${styles.metricIconWrap} ${styles.iconRose}`}>
                <Symbol name="receipt_long" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>
              {formatCurrency(animExpenses, currency)}
            </span>
            <div className={styles.metricMicroBar}>
              <div
                className={styles.metricMicroFillRose}
                style={{ width: `${Math.max(expenseRatioPct, activeTotals.totalExpenses > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className={styles.metricSub}>
              {expenseRatioPct > 0 ? `${expenseRatioPct}% of cash inflow` : 'Wages & material cost'}
            </span>
          </div>
        </div>

        {/* ── 3. Interactive Revenue vs Expense Trajectory Wave & Bar Chart ── */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <span className={styles.panelTitle}>
                <Symbol name="trending_up" size={18} />
                <span>Revenue vs Outflow Trajectory</span>
              </span>
              <span className={styles.panelSubtitle}>
                6-month cash flow horizon and monthly margin comparison
              </span>
            </div>
            {loadingReport && (
              <span className={styles.syncingPill}>Syncing telemetry...</span>
            )}
          </div>
          <TrendChart data={activeTotals.trendData} currency={currency} />
        </div>

        {/* ── 4. Two-Column Analytics Grid: Channel Split & Collection Pulse ── */}
        <div className={styles.dualPanelGrid}>
          {/* Left Panel: Channel Breakdown */}
          {isHybrid ? (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <span className={styles.panelTitle}>
                    <Symbol name="bar_chart" size={18} />
                    <span>Bespoke vs Showroom Split</span>
                  </span>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.bespokeOrdersCount + activeTotals.showroomOrdersCount} combined orders
                  </span>
                </div>
              </div>

              <div
                className={styles.channelSplitTrack}
                role="progressbar"
                aria-valuenow={bespokeShare}
                aria-valuemin={0}
                aria-valuemax={100}
                title={`Bespoke: ${bespokeShare}% | Showroom: ${showroomShare}%`}
              >
                <div className={styles.channelSplitBespoke} style={{ width: `${bespokeShare}%` }} />
                <div className={styles.channelSplitShowroom} style={{ width: `${showroomShare}%` }} />
              </div>

              <div className={styles.channelsGrid}>
                <div className={styles.channelCard}>
                  <div className={styles.channelCardHeader}>
                    <div className={styles.channelTitleWrap}>
                      <div className={styles.channelIconWrap}>
                        <Symbol name="straighten" size={16} />
                      </div>
                      <span className={styles.channelTitle}>Bespoke Tailoring</span>
                    </div>
                    <span className={styles.channelShareBadge}>{bespokeShare}%</span>
                  </div>
                  <span className={styles.channelAmount}>
                    {formatCurrency(activeTotals.bespokeRevenue || activeTotals.collected, currency)}
                  </span>
                  <div className={styles.channelStatsRow}>
                    <span>{activeTotals.bespokeOrdersCount} commissions</span>
                    <span>
                      Paid: {formatCurrency(activeTotals.bespokeCollected || activeTotals.collected, currency)}
                    </span>
                  </div>
                </div>

                <div className={styles.channelCard}>
                  <div className={styles.channelCardHeader}>
                    <div className={styles.channelTitleWrap}>
                      <div className={styles.channelIconWrap}>
                        <Symbol name="checkroom" size={16} />
                      </div>
                      <span className={styles.channelTitle}>Showroom Rack</span>
                    </div>
                    <span className={styles.channelShareBadge}>{showroomShare}%</span>
                  </div>
                  <span className={styles.channelAmount}>
                    {formatCurrency(activeTotals.showroomRevenue, currency)}
                  </span>
                  <div className={styles.channelStatsRow}>
                    <span>{activeTotals.showroomUnitsSold} pcs sold</span>
                    <span>Paid: {formatCurrency(activeTotals.showroomCollected, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : isRtw ? (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <span className={styles.panelTitle}>
                    <Symbol name="checkroom" size={18} />
                    <span>Ready-to-Wear Showroom</span>
                  </span>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.showroomUnitsSold} pieces sold across {activeTotals.showroomOrdersCount} checkouts
                  </span>
                </div>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelCardHeader}>
                  <div className={styles.channelTitleWrap}>
                    <div className={styles.channelIconWrap}>
                      <Symbol name="point_of_sale" size={16} />
                    </div>
                    <span className={styles.channelTitle}>Showroom Gross Revenue</span>
                  </div>
                  <span className={styles.channelShareBadge}>POS &amp; Rack</span>
                </div>
                <span className={styles.channelAmount}>
                  {formatCurrency(activeTotals.showroomRevenue || activeTotals.collected, currency)}
                </span>
                <div className={styles.channelStatsRow}>
                  <span>
                    Collected: {formatCurrency(activeTotals.showroomCollected || activeTotals.collected, currency)}
                  </span>
                  <span>
                    Avg piece:{' '}
                    {activeTotals.showroomUnitsSold > 0
                      ? formatCurrency(
                          Math.round(
                            (activeTotals.showroomRevenue || activeTotals.collected) /
                              activeTotals.showroomUnitsSold
                          ),
                          currency
                        )
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <span className={styles.panelTitle}>
                    <Symbol name="straighten" size={18} />
                    <span>Bespoke Commission Performance</span>
                  </span>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.bespokeOrdersCount} custom client commissions
                  </span>
                </div>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelCardHeader}>
                  <div className={styles.channelTitleWrap}>
                    <div className={styles.channelIconWrap}>
                      <Symbol name="content_cut" size={16} />
                    </div>
                    <span className={styles.channelTitle}>Custom Commission Volume</span>
                  </div>
                  <span className={styles.channelShareBadge}>Bespoke Craft</span>
                </div>
                <span className={styles.channelAmount}>
                  {formatCurrency(activeTotals.bespokeRevenue || activeTotals.collected, currency)}
                </span>
                <div className={styles.channelStatsRow}>
                  <span>
                    Collected: {formatCurrency(activeTotals.bespokeCollected || activeTotals.collected, currency)}
                  </span>
                  <span>
                    Avg ticket:{' '}
                    {activeTotals.bespokeOrdersCount > 0
                      ? formatCurrency(
                          Math.round(
                            (activeTotals.bespokeRevenue || activeTotals.collected) /
                              activeTotals.bespokeOrdersCount
                          ),
                          currency
                        )
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel: Collections Pulse & Debt Recovery */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <span className={styles.panelTitle}>
                  <Symbol name="account_balance" size={18} />
                  <span>Collection vs Receivables</span>
                </span>
                <span className={styles.panelSubtitle}>
                  Realized cash vs pending customer balances
                </span>
              </div>
              <button
                type="button"
                className={styles.panelActionLink}
                onClick={() => router.push(ROUTES.collections)}
              >
                <span>Open Collections</span>
                <Symbol name="arrow_forward" size={14} />
              </button>
            </div>
            <DebtMeter
              collected={activeTotals.collected}
              outstanding={activeTotals.outstanding}
              currency={currency}
            />
          </div>
        </div>

        {/* ── 5. Signature Profitability Champions (Style & VIP Order) ── */}
        {(activeTotals.mostProfitableStyle || activeTotals.mostProfitableOrder) && (
          <div className={styles.championsGrid}>
            {activeTotals.mostProfitableStyle && (
              <div className={styles.championCard}>
                <div className={styles.championHeader}>
                  <div className={styles.championBadgeWrap}>
                    <Symbol name="workspace_premium" size={16} />
                    <span>Most Profitable Silhouette</span>
                  </div>
                  <span className={styles.profitableBadge}>Highest Avg Margin</span>
                </div>
                <div className={styles.profitableCutWrap}>
                  <div className={styles.cutInfo}>
                    <span className={styles.cutName}>
                      {activeTotals.mostProfitableStyle.styleName}
                    </span>
                    <span className={styles.cutCount}>
                      {activeTotals.mostProfitableStyle.count} costed commissions tailored
                    </span>
                  </div>
                  <div className={styles.cutProfitWrap}>
                    <span className={styles.cutProfitVal}>
                      +{formatCurrency(Math.round(activeTotals.mostProfitableStyle.profit), currency)}
                    </span>
                    <span className={styles.cutProfitLabel}>Avg Profit / Garment</span>
                  </div>
                </div>
              </div>
            )}

            {activeTotals.mostProfitableOrder && (
              <div
                className={styles.championCard}
                onClick={() =>
                  router.push(ROUTES.productionOrder(activeTotals.mostProfitableOrder!.id))
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(ROUTES.productionOrder(activeTotals.mostProfitableOrder!.id));
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.championHeader}>
                  <div className={styles.championBadgeWrap}>
                    <Symbol name="star" size={16} />
                    <span>Top Single Commission</span>
                  </div>
                  <span className={styles.profitableBadge}>Peak Order Margin</span>
                </div>
                <div className={styles.profitableCutWrap}>
                  <div className={styles.cutInfo}>
                    <span className={styles.cutName}>
                      {activeTotals.mostProfitableOrder.customerName}
                    </span>
                    <span className={styles.cutCount}>
                      {activeTotals.mostProfitableOrder.styleName}
                    </span>
                  </div>
                  <div className={styles.cutProfitWrap}>
                    <span className={styles.cutProfitVal}>
                      +{formatCurrency(Math.round(activeTotals.mostProfitableOrder.profit), currency)}
                    </span>
                    <span className={styles.cutProfitLabel}>Net Commission Margin</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 6. Interactive Workshop Expense Allocation Donut & Breakdown ── */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <span className={styles.panelTitle}>
                <Symbol name="monitoring" size={18} />
                <span>Workshop Expense Allocation</span>
              </span>
              <span className={styles.panelSubtitle}>
                Interactive cost distribution across materials, labor, and operations
              </span>
            </div>
            <button
              type="button"
              className={styles.panelActionLink}
              onClick={() => router.push(ROUTES.reconciliation)}
            >
              <span>Manage Expenses</span>
              <Symbol name="arrow_forward" size={14} />
            </button>
          </div>
          <DonutChart
            data={
              activeTotals.expenseBreakdown.length > 0
                ? activeTotals.expenseBreakdown
                : EMPTY_FINANCIAL_TOTALS.expenseBreakdown
            }
            currency={currency}
          />
        </div>
      </div>
    </PageLayout>
  );
}
