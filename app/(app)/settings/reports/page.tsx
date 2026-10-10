'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFinancialReport, type FinancialReport } from '@/app/actions';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useData } from '@/contexts/DataContext';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency } from '@/lib/formatters';
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

export default function ReportsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { currentShop } = useData();
  const isPremium = !!currentShop && PREMIUM_STATUSES.includes(currentShop.subscriptionStatus);

  const [range, setRange] = useState<RangeKey>('month');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFinancialReport(fromDateFor(range)).then((res) => {
      if (cancelled) return;
      if (!res || 'error' in res) {
        setError((res as { error: string } | null)?.error ?? 'Could not load report');
        setReport(null);
      } else {
        setReport(res.data ?? null);
        setError(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <PageLayout width="narrow" header={<TopBar title="Reports" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
        <MilestonesCard />
        {currentShop && <GeneralExpenses shopId={currentShop.id} currency={currentShop.currency} />}
      </div>
      {!isPremium ? (
        <div style={{ textAlign: 'center', marginTop: '64px', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', marginBottom: '24px' }}>
            <Symbol name="bar_chart" size={48} style={{ color: 'var(--sf-nav)' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>Advanced Financial Analytics</h2>
          <p style={{ color: 'var(--sf-text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
            Understand your cash flow, analyze your profit margins, and identify your top-spending customers. Financial reports are a Premium feature.
          </p>
          <Button variant="primary" onClick={() => router.push(ROUTES.settingsBilling)} style={{ padding: '12px 32px' }}>
            Upgrade to Premium
          </Button>
        </div>
      ) : (
        <>
          <p className={styles.intro}>Revenue, outstanding balance, and margin across your organization.</p>

          <div className={styles.rangeRow}>
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

          {error ? (
            <p className={styles.error}>{error}</p>
          ) : !report ? (
            <p className={styles.intro}>Loading…</p>
          ) : (
        <>
          <div className={styles.totalsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Revenue & Expense Trend</span>
              {report.totals.trendData.length > 0 ? (
                <TrendChart data={report.totals.trendData} />
              ) : (
                <p className={styles.emptyMargin}>No financial data in this period.</p>
              )}
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Expense Breakdown</span>
              {report.totals.expenseBreakdown.reduce((sum, d) => sum + d.value, 0) > 0 ? (
                <DonutChart data={report.totals.expenseBreakdown} />
              ) : (
                <p className={styles.emptyMargin}>No expenses logged.</p>
              )}
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Cash Flow</span>
              <DebtMeter collected={report.totals.collected} outstanding={report.totals.outstanding} />
            </div>
          </div>

          <div className={styles.marginCard}>
            <span className={styles.groupLabel}>Margin Summary</span>
            {report.totals.ordersWithCostCount === 0 ? (
              <p className={styles.emptyMargin}>No orders in this range have cost details entered yet.</p>
            ) : (
              <>
                <div className={styles.marginRow}>
                  <span>Revenue ({report.totals.ordersWithCostCount} order{report.totals.ordersWithCostCount === 1 ? '' : 's'} with cost data)</span>
                  <span>{formatCurrency(report.totals.revenueWithCostData)}</span>
                </div>
                <div className={styles.marginRow}>
                  <span>Cost</span>
                  <span>-{formatCurrency(report.totals.costTotal)}</span>
                </div>
                <div className={`${styles.marginRow} ${styles.marginTotalRow}`}>
                  <span>Margin</span>
                  <span>{formatCurrency(report.totals.marginTotal)}</span>
                </div>
                
                {report.totals.mostProfitableStyle && (
                  <div className={styles.marginRow} style={{ marginTop: '16px', color: 'var(--sf-text-secondary)', fontSize: '13px' }}>
                    <span>Top Style: <strong>{report.totals.mostProfitableStyle.styleName}</strong></span>
                    <span style={{ color: 'var(--sf-success)' }}>{formatCurrency(report.totals.mostProfitableStyle.profit)} avg margin</span>
                  </div>
                )}
                
                {report.totals.mostProfitableOrder && (
                  <div className={styles.marginRow} style={{ color: 'var(--sf-text-secondary)', fontSize: '13px' }}>
                    <span>Top Order: <strong>{report.totals.mostProfitableOrder.customerName}</strong> ({report.totals.mostProfitableOrder.styleName})</span>
                    <span style={{ color: 'var(--sf-success)' }}>{formatCurrency(report.totals.mostProfitableOrder.profit)} margin</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.marginCard}>
            <span className={styles.groupLabel}>Profit & Loss (P&L)</span>
            {report.totals.collected === 0 && report.totals.totalExpenses === 0 ? (
              <p className={styles.emptyMargin}>No cash flow activity in this period.</p>
            ) : (
              <>
                <div className={styles.marginRow}>
                  <span>Total Revenue (Collected)</span>
                  <span style={{ color: 'var(--sf-success)' }}>{formatCurrency(report.totals.collected)}</span>
                </div>
                <div className={styles.marginRow}>
                  <span>Total Expenses (Cash Out)</span>
                  <span style={{ color: 'var(--sf-error)' }}>-{formatCurrency(report.totals.totalExpenses)}</span>
                </div>
                <div className={`${styles.marginRow} ${styles.marginTotalRow}`}>
                  <span>Net Profit</span>
                  <span style={{ color: report.totals.netProfit >= 0 ? 'var(--sf-success)' : 'var(--sf-error)' }}>
                    {formatCurrency(report.totals.netProfit)}
                  </span>
                </div>
              </>
            )}
          </div>

          {report.branches.length > 1 && (
            <div className={styles.branchSection}>
              <span className={styles.groupLabel}>By Branch</span>
              <div className={styles.card}>
                {report.branches.map((branch) => (
                  <div key={branch.shopId} className={styles.branchRow}>
                    <div className={styles.branchName}>
                      {branch.shopName}
                      {branch.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                    </div>
                    <div className={styles.branchStats}>
                      <span>Collected: {formatCurrency(branch.collected)}</span>
                      <span>Outstanding: {formatCurrency(branch.outstanding)}</span>
                      <span>Margin: {branch.ordersWithCostCount > 0 ? formatCurrency(branch.marginTotal) : '—'}</span>
                      <span>Net Profit: {formatCurrency(branch.netProfit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
          )}
        </>
      )}
    </PageLayout>
  );
}
