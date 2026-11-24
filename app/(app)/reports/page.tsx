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
  '30d': '30 Days',
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

function useAnimatedNumber(target: number, durationMs = 450): number {
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + delta * eased));

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
  const [hideFigures, setHideFigures] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    getFinancialReport(fromDateFor(range))
      .then((res) => {
        if (cancelled) return;
        if (!res || 'error' in res || !res.data) {
          setReport(null);
        } else {
          setReport(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const currency = getShopCurrency(currentShop);

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

  const totalSegregated = (activeTotals.bespokeRevenue || 0) + (activeTotals.showroomRevenue || 0);
  const bespokeShare =
    totalSegregated > 0
      ? Math.round(((activeTotals.bespokeRevenue || 0) / totalSegregated) * 100)
      : activeTotals.collected > 0
      ? 100
      : 0;
  const showroomShare = totalSegregated > 0 ? 100 - bespokeShare : 0;

  const maskOrCurrency = (val: number) =>
    hideFigures ? '******' : formatCurrency(val, currency);

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
        {/* ── 1. Sartorial Woven Indigo Ledger Hero (Matches Dashboard Craft Grammar) ── */}
        <section className={styles.sartorialHero}>
          <div className={styles.heroStitchBorder} aria-hidden="true" />

          <div className={styles.heroTopBar}>
            <div className={styles.heroIdentity}>
              <span className={styles.heroEyebrow}>Financial Ledger</span>
              <h1 className={styles.heroShopName}>
                {currentShop?.name || 'Workshop Accounts'}
              </h1>
            </div>

            <div className={styles.heroControls}>
              {report && report.branches.length > 1 && (
                <select
                  className={styles.branchSelect}
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  aria-label="Filter by branch"
                >
                  <option value="all">All Branches</option>
                  {report.branches.map((b) => (
                    <option key={b.shopId} value={b.shopId}>
                      {b.shopName}
                    </option>
                  ))}
                </select>
              )}

              <div className={styles.rangeToggle} role="group" aria-label="Time horizon">
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.rangeToggleBtn} ${
                      range === key ? styles.rangeToggleBtnActive : ''
                    }`}
                    onClick={() => setRange(key)}
                  >
                    {RANGE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Net Profit Readout */}
          <div className={styles.heroMainRow}>
            <div className={styles.heroNetBlock}>
              <div className={styles.heroNetLabelRow}>
                <span className={styles.heroNetLabel}>
                  Net Profit ({RANGE_LABELS[range]})
                </span>
                <button
                  type="button"
                  className={styles.heroPrivacyBtn}
                  onClick={() => setHideFigures((v) => !v)}
                  aria-label={hideFigures ? 'Show figures' : 'Hide figures'}
                  title={hideFigures ? 'Show figures' : 'Hide figures'}
                >
                  <Symbol name={hideFigures ? 'visibility_off' : 'visibility'} size={14} />
                </button>
              </div>
              <div className={styles.heroValueRow}>
                <span className={styles.heroPrimaryValue}>
                  {maskOrCurrency(animNetProfit)}
                </span>
                {marginPercent !== null && !hideFigures && (
                  <span className={styles.heroMarginTag}>{marginPercent}% margin</span>
                )}
              </div>
            </div>
          </div>

          {/* Integrated 4-Cell Recessed Ledger Deck */}
          <div className={styles.ledgerDeck}>
            <div className={styles.ledgerCell}>
              <span className={styles.ledgerCellLabel}>Collected</span>
              <span className={styles.ledgerCellValue}>
                {maskOrCurrency(animCollected)}
              </span>
              <span className={styles.ledgerCellSub}>
                {isRtw
                  ? `${activeTotals.showroomUnitsSold} pcs sold`
                  : `${activeTotals.bespokeOrdersCount} orders`}
              </span>
            </div>

            <button
              type="button"
              className={`${styles.ledgerCell} ${styles.ledgerCellInteractive}`}
              onClick={() => router.push(ROUTES.reconciliation)}
            >
              <span className={styles.ledgerCellLabel}>Expenses</span>
              <span className={styles.ledgerCellValue}>
                {maskOrCurrency(animExpenses)}
              </span>
              <span className={styles.ledgerCellSub}>Open register</span>
            </button>

            <button
              type="button"
              className={`${styles.ledgerCell} ${styles.ledgerCellInteractive}`}
              onClick={() => router.push(ROUTES.collections)}
            >
              <span className={styles.ledgerCellLabel}>Unpaid Balances</span>
              <span className={styles.ledgerCellValue}>
                {maskOrCurrency(animOutstanding)}
              </span>
              <span className={styles.ledgerCellSub}>Client debtors</span>
            </button>

            <div className={styles.ledgerCell}>
              <span className={styles.ledgerCellLabel}>Costed Orders</span>
              <span className={styles.ledgerCellValue}>
                {activeTotals.ordersWithCostCount}
              </span>
              <span className={styles.ledgerCellSub}>
                {marginPercent !== null ? `${marginPercent}% avg margin` : 'Track costs'}
              </span>
            </div>
          </div>
        </section>

        {/* ── 2. Monthly Revenue vs. Expense Ledger Chart ── */}
        <section className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 className={styles.panelTitle}>Monthly Revenue &amp; Expenses</h2>
              <span className={styles.panelSubtitle}>
                Six-month comparison of collected revenue against shop spend
              </span>
            </div>
          </div>
          <TrendChart data={activeTotals.trendData} currency={currency} />
        </section>

        {/* ── 3. Two-Column Section: Collections & Channel Performance ── */}
        <div className={styles.dualGrid}>
          {/* Collections vs Unpaid Balances */}
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>Collections &amp; Unpaid Balances</h2>
                <span className={styles.panelSubtitle}>
                  Cash received vs outstanding customer balances
                </span>
              </div>
              <button
                type="button"
                className={styles.quietLinkBtn}
                onClick={() => router.push(ROUTES.collections)}
              >
                <span>Debtors</span>
                <Symbol name="arrow_forward" size={13} />
              </button>
            </div>
            <DebtMeter
              collected={activeTotals.collected}
              outstanding={activeTotals.outstanding}
              currency={currency}
            />
          </section>

          {/* Channel Breakdown */}
          {isHybrid ? (
            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <h2 className={styles.panelTitle}>Bespoke vs. Showroom</h2>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.bespokeOrdersCount + activeTotals.showroomOrdersCount} total orders
                  </span>
                </div>
              </div>

              <div
                className={styles.channelSplitTrack}
                role="progressbar"
                aria-valuenow={bespokeShare}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={styles.channelSplitBespoke} style={{ width: `${bespokeShare}%` }} />
                <div className={styles.channelSplitShowroom} style={{ width: `${showroomShare}%` }} />
              </div>

              <div className={styles.channelsGrid}>
                <div className={styles.channelCard}>
                  <div className={styles.channelCardHeader}>
                    <span className={styles.channelTitle}>Bespoke Tailoring</span>
                    <span className={styles.channelShareBadge}>{bespokeShare}%</span>
                  </div>
                  <span className={styles.channelAmount}>
                    {maskOrCurrency(activeTotals.bespokeRevenue || activeTotals.collected)}
                  </span>
                  <div className={styles.channelStatsRow}>
                    <span>{activeTotals.bespokeOrdersCount} commissions</span>
                    <span>
                      Paid: {maskOrCurrency(activeTotals.bespokeCollected || activeTotals.collected)}
                    </span>
                  </div>
                </div>

                <div className={styles.channelCard}>
                  <div className={styles.channelCardHeader}>
                    <span className={styles.channelTitle}>Showroom Rack</span>
                    <span className={styles.channelShareBadge}>{showroomShare}%</span>
                  </div>
                  <span className={styles.channelAmount}>
                    {maskOrCurrency(activeTotals.showroomRevenue)}
                  </span>
                  <div className={styles.channelStatsRow}>
                    <span>{activeTotals.showroomUnitsSold} pieces</span>
                    <span>Paid: {maskOrCurrency(activeTotals.showroomCollected)}</span>
                  </div>
                </div>
              </div>
            </section>
          ) : isRtw ? (
            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <h2 className={styles.panelTitle}>Showroom Sales</h2>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.showroomUnitsSold} pieces sold across {activeTotals.showroomOrdersCount} checkouts
                  </span>
                </div>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelCardHeader}>
                  <span className={styles.channelTitle}>Showroom Gross Revenue</span>
                  <span className={styles.channelShareBadge}>Counter POS</span>
                </div>
                <span className={styles.channelAmount}>
                  {maskOrCurrency(activeTotals.showroomRevenue || activeTotals.collected)}
                </span>
                <div className={styles.channelStatsRow}>
                  <span>
                    Collected: {maskOrCurrency(activeTotals.showroomCollected || activeTotals.collected)}
                  </span>
                  <span>
                    Avg piece:{' '}
                    {activeTotals.showroomUnitsSold > 0
                      ? maskOrCurrency(
                          Math.round(
                            (activeTotals.showroomRevenue || activeTotals.collected) /
                              activeTotals.showroomUnitsSold
                          )
                        )
                      : '--'}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <h2 className={styles.panelTitle}>Bespoke Commissions</h2>
                  <span className={styles.panelSubtitle}>
                    {activeTotals.bespokeOrdersCount} custom client commissions
                  </span>
                </div>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelCardHeader}>
                  <span className={styles.channelTitle}>Total Commission Value</span>
                  <span className={styles.channelShareBadge}>Bespoke</span>
                </div>
                <span className={styles.channelAmount}>
                  {maskOrCurrency(activeTotals.bespokeRevenue || activeTotals.collected)}
                </span>
                <div className={styles.channelStatsRow}>
                  <span>
                    Collected: {maskOrCurrency(activeTotals.bespokeCollected || activeTotals.collected)}
                  </span>
                  <span>
                    Avg order:{' '}
                    {activeTotals.bespokeOrdersCount > 0
                      ? maskOrCurrency(
                          Math.round(
                            (activeTotals.bespokeRevenue || activeTotals.collected) /
                              activeTotals.bespokeOrdersCount
                          )
                        )
                      : '--'}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── 4. Best-Earning Style & Top Order ── */}
        {(activeTotals.mostProfitableStyle || activeTotals.mostProfitableOrder) && (
          <div className={styles.dualGrid}>
            {activeTotals.mostProfitableStyle && (
              <section className={styles.panelCard}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleGroup}>
                    <h2 className={styles.panelTitle}>Best-Earning Style</h2>
                    <span className={styles.panelSubtitle}>
                      Highest average profit per costed garment
                    </span>
                  </div>
                </div>
                <div className={styles.highlightRow}>
                  <div className={styles.cutInfo}>
                    <span className={styles.cutName}>
                      {activeTotals.mostProfitableStyle.styleName}
                    </span>
                    <span className={styles.cutCount}>
                      {activeTotals.mostProfitableStyle.count} costed commissions
                    </span>
                  </div>
                  <div className={styles.cutProfitWrap}>
                    <span className={styles.cutProfitVal}>
                      +{maskOrCurrency(Math.round(activeTotals.mostProfitableStyle.profit))}
                    </span>
                    <span className={styles.cutProfitLabel}>avg net profit</span>
                  </div>
                </div>
              </section>
            )}

            {activeTotals.mostProfitableOrder && (
              <section
                className={`${styles.panelCard} ${styles.clickablePanel}`}
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
              >
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleGroup}>
                    <h2 className={styles.panelTitle}>Top Single Commission</h2>
                    <span className={styles.panelSubtitle}>
                      Highest net margin earned on an order
                    </span>
                  </div>
                  <Symbol name="arrow_forward" size={15} />
                </div>
                <div className={styles.highlightRow}>
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
                      +{maskOrCurrency(Math.round(activeTotals.mostProfitableOrder.profit))}
                    </span>
                    <span className={styles.cutProfitLabel}>net order profit</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── 5. Shop Expense Breakdown ── */}
        <section className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 className={styles.panelTitle}>Shop Expense Breakdown</h2>
              <span className={styles.panelSubtitle}>
                Distribution across materials, labor, and shop operations
              </span>
            </div>
            <button
              type="button"
              className={styles.quietLinkBtn}
              onClick={() => router.push(ROUTES.reconciliation)}
            >
              <span>Expense Register</span>
              <Symbol name="arrow_forward" size={13} />
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
        </section>
      </div>
    </PageLayout>
  );
}
