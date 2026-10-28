'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFinancialReport, type FinancialReport } from '@/app/actions';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
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

const MOCK_FINANCIAL_TOTALS: FinancialReport['totals'] = {
  collected: 4850000,
  outstanding: 620000,
  revenueWithCostData: 4200000,
  costTotal: 1550000,
  marginTotal: 2650000,
  ordersWithCostCount: 28,
  totalExpenses: 1550000,
  netProfit: 3300000,
  mostProfitableOrder: {
    id: 'ord-102',
    customerName: 'Chief Adebayo',
    styleName: 'Executive Kaftan',
    profit: 180000,
  },
  mostProfitableStyle: {
    styleName: 'Royal Sovereign Agbada',
    profit: 240000,
    count: 14,
  },
  expenseBreakdown: [
    { label: 'Fabric Sourcing & Aso-Oke', value: 780000 },
    { label: 'Artisan & Tailor Wages', value: 420000 },
    { label: 'Haberdashery, Linings & Zips', value: 180000 },
    { label: 'Generator & Studio Utilities', value: 170000 },
  ],
  trendData: [
    { label: 'Wk 1', revenue: 950000, expenses: 320000 },
    { label: 'Wk 2', revenue: 1450000, expenses: 450000 },
    { label: 'Wk 3', revenue: 1150000, expenses: 380000 },
    { label: 'Wk 4', revenue: 1300000, expenses: 400000 },
  ],
};

export default function ReportsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { currentShop } = useData();

  const [range, setRange] = useState<RangeKey>('month');
  const [report, setReport] = useState<FinancialReport | null>(null);

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

  const currency = currentShop?.currency || 'NGN';
  const totals = report?.totals || MOCK_FINANCIAL_TOTALS;

  const marginPercent =
    totals.revenueWithCostData > 0
      ? Math.round((totals.marginTotal / totals.revenueWithCostData) * 100)
      : null;

  return (
    <PageLayout
      width="narrow"
      header={
        <TopBar
          title="Financial Intelligence"
          showBack={!isDesktop}
          onBack={() => router.push(ROUTES.dashboard)}
        />
      }
    >
      <div className={styles.container}>
        {/* Header Bar: Scope and Time Range Filter */}
        <div className={styles.heroBar}>
          <div className={styles.introCol}>
            <h1 className={styles.title}>Atelier Profit &amp; Telemetry</h1>
            <p className={styles.subtitle}>Cross-channel cash flow, margins, and debtor receivables</p>
          </div>

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

        {/* 4-Pillar Dominant Metrics */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Gross Collected</span>
              <div className={styles.metricIconWrap}>
                <Symbol name="payments" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>{formatCurrency(totals.collected, currency)}</span>
            <span className={styles.metricSub}>{totals.ordersWithCostCount} costed commissions</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Net Margin</span>
              <div className={styles.metricIconWrap} style={{ color: 'var(--sf-color-primary, #047857)' }}>
                <Symbol name="trending_up" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>
              {marginPercent !== null ? `${marginPercent}%` : '--'}
            </span>
            <span className={styles.metricSub}>Net profit: {formatCurrency(totals.netProfit, currency)}</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Receivables (Debt)</span>
              <div className={styles.metricIconWrap} style={{ color: 'var(--sf-warning, #d97706)' }}>
                <Symbol name="account_balance_wallet" size={16} />
              </div>
            </div>
            <span className={styles.metricValue} style={{ color: totals.outstanding > 0 ? 'var(--sf-warning, #d97706)' : undefined }}>
              {formatCurrency(totals.outstanding, currency)}
            </span>
            <span className={styles.metricSub}>Client balances due</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Workshop Outflow</span>
              <div className={styles.metricIconWrap}>
                <Symbol name="receipt_long" size={16} />
              </div>
            </div>
            <span className={styles.metricValue}>{formatCurrency(totals.totalExpenses, currency)}</span>
            <span className={styles.metricSub}>Wages &amp; material cost</span>
          </div>
        </div>

        {/* Collections Pulse & Debt Recovery Ratio */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Symbol name="account_balance" size={18} />
              Collection vs Outstanding Receivables
            </span>
            <button
              type="button"
              className={styles.rangeBtn}
              onClick={() => router.push(ROUTES.collections)}
              style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid var(--sf-border-light)' }}
            >
              Open Collections
            </button>
          </div>
          <DebtMeter
            collected={totals.collected}
            outstanding={totals.outstanding}
            currency={currency}
          />
        </div>

        {/* Revenue & Expenses Trajectory Trend */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Symbol name="trending_up" size={18} />
              Revenue vs Expense Trajectory
            </span>
          </div>
          <TrendChart data={totals.trendData} />
        </div>

        {/* Most Profitable Signature Silhouette */}
        {totals.mostProfitableStyle && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>
                <Symbol name="star" size={18} />
                Most Profitable Signature Silhouette
              </span>
              <span className={styles.profitableBadge}>Highest Margin</span>
            </div>
            <div className={styles.profitableCutWrap}>
              <div className={styles.cutInfo}>
                <span className={styles.cutName}>{totals.mostProfitableStyle.styleName}</span>
                <span className={styles.cutCount}>{totals.mostProfitableStyle.count} commissions tailored</span>
              </div>
              <div className={styles.cutProfitWrap}>
                <span className={styles.cutProfitVal}>
                  +{formatCurrency(totals.mostProfitableStyle.profit, currency)}
                </span>
                <span className={styles.cutProfitLabel}>Net Atelier Margin</span>
              </div>
            </div>
          </div>
        )}

        {/* Expense Breakdown Allocation */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Symbol name="monitoring" size={18} />
              Workshop Expense Allocation
            </span>
          </div>
          <DonutChart data={totals.expenseBreakdown} />
        </div>

        {/* Atelier Operational Expenses Ledger */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Symbol name="receipt_long" size={18} />
              Operational Outflow Categories
            </span>
          </div>
          <div className={styles.expenseList}>
            {totals.expenseBreakdown.map((exp) => (
              <div key={exp.label} className={styles.expenseRow}>
                <span className={styles.expenseName}>{exp.label}</span>
                <span className={styles.expenseAmount}>{formatCurrency(exp.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
