'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFinancialReport, type FinancialReport } from '@/app/actions';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import { formatCurrency } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
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
  const [range, setRange] = useState<RangeKey>('month');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFinancialReport(fromDateFor(range)).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setReport(null);
      } else if (res.data) {
        setReport(res.data);
        setError(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <PageLayout width="narrow" header={<TopBar title="Reports" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
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
              <span className={styles.statLabel}>Collected</span>
              <span className={styles.statValue}>{formatCurrency(report.totals.collected)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Outstanding</span>
              <span className={styles.statValue}>{formatCurrency(report.totals.outstanding)}</span>
            </div>
          </div>

          <div className={styles.marginCard}>
            <span className={styles.groupLabel}>Margin</span>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
