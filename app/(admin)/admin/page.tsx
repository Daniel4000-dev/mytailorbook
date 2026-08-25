import Link from 'next/link';
import { getOverviewStats, getSignupSeries, getAffiliatePerformance } from '@/lib/admin/queries';
import { ROUTES } from '@/lib/routes';
import SignupChart from './SignupChart';
import styles from './page.module.css';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export default async function AdminOverviewPage() {
  const [stats, signupSeries, affiliates] = await Promise.all([
    getOverviewStats(),
    getSignupSeries(30),
    getAffiliatePerformance(),
  ]);

  const cards = [
    { label: 'Organizations', value: stats.totalOrganizations },
    { label: 'Shops / branches', value: stats.totalShops },
    { label: 'Premium subscriptions', value: stats.premiumCount },
    { label: 'Estimated MRR', value: formatNaira(stats.mrrEstimateNgn) },
    { label: 'Customers', value: stats.totalCustomers },
    { label: 'Orders (all-time)', value: stats.totalOrders },
    { label: 'Orders (last 30d)', value: stats.ordersLast30d },
    { label: 'Signups (7d / 30d)', value: `${stats.signups7d} / ${stats.signups30d}` },
  ];

  return (
    <div>
      <h1 className={styles.heading}>Overview</h1>

      <div className={styles.cardGrid}>
        {cards.map((card) => (
          <div key={card.label} className={styles.card}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue}>{card.value}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Signups — last 30 days</h2>
        <SignupChart data={signupSeries} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <h2 className={styles.sectionHeading}>Affiliate performance</h2>
          <Link href={`${ROUTES.admin}/affiliates`} className={styles.sectionLink}>
            Manage affiliates →
          </Link>
        </div>
        {affiliates.length === 0 ? (
          <p className={styles.empty}>No affiliates yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Signups</th>
                  <th>Premium conversions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>
                      <code>{a.code}</code>
                    </td>
                    <td>{a.signups}</td>
                    <td>{a.premiumConversions}</td>
                    <td>{a.active ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
