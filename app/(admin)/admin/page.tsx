import Link from 'next/link';
import {
  getOverviewStats,
  getSignupSeries,
  getAffiliatePerformance,
  getRateLimitHotspots,
  getOrganizations,
} from '@/lib/admin/queries';
import { ROUTES } from '@/lib/routes';
import Symbol from '@/components/ui/Symbol/Symbol';
import AdminModeFilter from './AdminModeFilter';
import SignupChart from './SignupChart';
import styles from './page.module.css';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode = 'all' } = await searchParams;

  const [stats, signupSeries, affiliates, hotspots, recentShopsData] = await Promise.all([
    getOverviewStats(),
    getSignupSeries(30),
    getAffiliatePerformance(),
    getRateLimitHotspots(),
    getOrganizations({ page: 1, pageSize: 6 }),
  ]);

  const cards = [
    {
      label: 'Total Organizations',
      value: stats.totalOrganizations,
      icon: 'store',
      sub: `${stats.totalShops} registered workshops`,
      href: `${ROUTES.admin}/organizations`,
    },
    {
      label: 'Estimated MRR',
      value: formatNaira(stats.mrrEstimateNgn),
      icon: 'payments',
      sub: `${stats.premiumCount} paid shops (${stats.freeCount} free)`,
      highlight: true,
    },
    {
      label: 'Revenue (Last 30d)',
      value: formatNaira(stats.revenueLast30dNgn),
      icon: 'monitoring',
      sub: `${stats.cancellations30d} cancellations`,
    },
    {
      label: 'Tailor Shop Mode Mix',
      value: `${stats.bespokeShopsCount} / ${stats.rtwShopsCount} / ${stats.hybridShopsCount}`,
      icon: 'layers',
      sub: 'Bespoke / RTW / Hybrid',
      href: `${ROUTES.admin}/organizations`,
    },
    {
      label: 'All-Time Garment Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: 'checkroom',
      sub: `${stats.ordersLast30d} orders in last 30d`,
    },
    {
      label: 'Customer Directory',
      value: stats.totalCustomers.toLocaleString(),
      icon: 'group',
      sub: 'Total clients across all shops',
      href: `${ROUTES.admin}/organizations`,
    },
    {
      label: 'New Signups (7d / 30d)',
      value: `${stats.signups7d} / ${stats.signups30d}`,
      icon: 'bolt',
      sub: 'Verified onboarding rate',
      href: `${ROUTES.admin}/active-users`,
    },
    {
      label: 'Premium Conversion',
      value: stats.totalShops > 0 ? `${Math.round((stats.premiumCount / stats.totalShops) * 100)}%` : '0%',
      icon: 'verified',
      sub: 'Paid conversion ratio',
    },
  ];

  return (
    <div className={styles.container}>
      {/* ── Top Header with Mode Filter Switch ── */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.heading}>Platform Command Center</h1>
          <p className={styles.subheading}>
            Real-time multi-tenant telemetry across bespoke, RTW, and hybrid fashion houses.
          </p>
        </div>

        <AdminModeFilter
          counts={{
            all: stats.totalShops,
            bespoke: stats.bespokeShopsCount,
            rtw: stats.rtwShopsCount,
            hybrid: stats.hybridShopsCount,
          }}
        />
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className={styles.cardGrid}>
        {cards.map((card) => {
          const content = (
            <div key={card.label} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>{card.label}</span>
                <div className={styles.cardIcon}>
                  <Symbol name={card.icon} size={16} />
                </div>
              </div>
              <span className={styles.cardValue}>{card.value}</span>
              <span className={`${styles.cardMeta} ${card.highlight ? styles.highlightMeta : ''}`}>
                {card.sub}
              </span>
            </div>
          );

          if (card.href) {
            return (
              <Link key={card.label} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                {content}
              </Link>
            );
          }
          return content;
        })}
      </div>

      {/* ── Prominent Tailor Shops & Overrides Section ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <h2 className={styles.sectionHeading}>Registered Tailor Shops & Overrides</h2>
            <p className={styles.sectionHint}>
              Select any tailor shop to switch operational modes (Bespoke / RTW / Hybrid), grant VIP comped access, or adjust daily streaks.
            </p>
          </div>
          <Link href={`${ROUTES.admin}/organizations`} className={styles.sectionLink}>
            <span>View All {stats.totalOrganizations} Shops</span>
            <Symbol name="arrow_forward" size={14} />
          </Link>
        </div>

        {recentShopsData.rows.length === 0 ? (
          <p className={styles.empty}>No tailor shops registered yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tailor Shop</th>
                  <th>Operating Mode</th>
                  <th>Owner</th>
                  <th>Subscription</th>
                  <th>Clients</th>
                  <th>Orders</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentShopsData.rows.map((shop) => {
                  const modeClass =
                    shop.businessMode === 'rtw'
                      ? styles.modeBadgeRtw
                      : shop.businessMode === 'hybrid'
                      ? styles.modeBadgeHybrid
                      : styles.modeBadgeBespoke;

                  return (
                    <tr key={shop.id}>
                      <td>
                        <Link href={`/admin/organizations/${shop.id}`} className={styles.rowLink}>
                          {shop.name}
                        </Link>
                      </td>
                      <td>
                        <span className={modeClass}>
                          {shop.businessMode === 'rtw' ? 'Ready-to-Wear' : shop.businessMode === 'hybrid' ? 'Hybrid' : 'Bespoke'}
                        </span>
                      </td>
                      <td>{shop.ownerEmail || '—'}</td>
                      <td>
                        <span className={shop.subscriptionStatus === 'active' ? styles.badgeActive : styles.badgeInactive}>
                          {shop.subscriptionStatus === 'active' ? 'Active Premium' : shop.subscriptionStatus || 'Free'}
                        </span>
                      </td>
                      <td>{shop.customerCount}</td>
                      <td>{shop.orderCount}</td>
                      <td>{formatDate(shop.createdAt)}</td>
                      <td>
                        <Link href={`/admin/organizations/${shop.id}`} className={styles.manageLink}>
                          <Symbol name="tune" size={12} />
                          <span>Manage & Overrides</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 30-Day Growth Trajectory ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <h2 className={styles.sectionHeading}>New Workshop Signups — Last 30 Days</h2>
            <p className={styles.sectionHint}>Daily organization registrations from onboarding</p>
          </div>
          <Link href={`${ROUTES.admin}/active-users`} className={styles.sectionLink}>
            <span>View Live DAU/MAU</span>
            <Symbol name="arrow_forward" size={14} />
          </Link>
        </div>
        <SignupChart data={signupSeries} />
      </section>

      {/* ── Affiliate & Partner Performance ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <h2 className={styles.sectionHeading}>Affiliate & Referral Partners</h2>
            <p className={styles.sectionHint}>Top promoters driving workshop registrations</p>
          </div>
          <Link href={`${ROUTES.admin}/affiliates`} className={styles.sectionLink}>
            <span>Manage Affiliate Links</span>
            <Symbol name="arrow_forward" size={14} />
          </Link>
        </div>

        {affiliates.length === 0 ? (
          <p className={styles.empty}>No affiliate partners registered yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Partner Name</th>
                  <th>Promo Code</th>
                  <th>Signups Driven</th>
                  <th>Paid Conversions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.name}</strong></td>
                    <td>
                      <code className={styles.codePill}>{a.code}</code>
                    </td>
                    <td>{a.signups} shops</td>
                    <td>{a.premiumConversions} paid</td>
                    <td>
                      <span className={a.active ? styles.badgeActive : styles.badgeInactive}>
                        {a.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Rate-Limit Hotspots (Security & Scraping Defense) ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <h2 className={styles.sectionHeading}>Rate-Limit Hotspots — Last 24 Hours</h2>
            <p className={styles.sectionHint}>
              High-frequency request IPs against public lookbook & order-tracking endpoints
            </p>
          </div>
          <Link href={`${ROUTES.admin}/activity`} className={styles.sectionLink}>
            <span>View Audit Logs</span>
            <Symbol name="arrow_forward" size={14} />
          </Link>
        </div>

        {hotspots.length === 0 ? (
          <p className={styles.empty}>Zero abuse or rate-limit violations recorded in the last 24 hours.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Target Endpoint / Origin Key</th>
                  <th>Requests (24h Window)</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h) => (
                  <tr key={h.key}>
                    <td>
                      <code className={styles.codePill}>{h.key}</code>
                    </td>
                    <td><strong>{h.hits.toLocaleString()}</strong> hits</td>
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
