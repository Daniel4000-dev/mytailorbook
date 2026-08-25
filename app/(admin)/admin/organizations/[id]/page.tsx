import { notFound } from 'next/navigation';
import { getOrganizationDetail } from '@/lib/admin/queries';
import styles from './page.module.css';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: string | null) {
  if (!status || status === 'free') return 'Free';
  if (status === 'active') return 'Active';
  if (status === 'past_due') return 'Past due';
  if (status === 'canceled') return 'Canceled';
  return status;
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganizationDetail(id);
  if (!org) notFound();

  return (
    <div>
      <h1 className={styles.heading}>{org.name}</h1>
      <p className={styles.subheading}>
        Signed up {formatDate(org.createdAt)} · Owner: {org.ownerName || '—'} ({org.ownerEmail || '—'})
        {org.affiliateCode && (
          <>
            {' '}
            · Referred via <code>{org.affiliateCode}</code>
          </>
        )}
      </p>

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Customers</span>
          <span className={styles.cardValue}>{org.customerCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Orders</span>
          <span className={styles.cardValue}>{org.orderCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Staff</span>
          <span className={styles.cardValue}>{org.staffCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Shops</span>
          <span className={styles.cardValue}>{org.shops.length}</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Orders by status</h2>
        {Object.keys(org.ordersByStatus).length === 0 ? (
          <p className={styles.empty}>No orders yet.</p>
        ) : (
          <div className={styles.statusRow}>
            {Object.entries(org.ordersByStatus).map(([status, n]) => (
              <span key={status} className={styles.statusPill}>
                {status}: {n}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Shops / branches</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Primary</th>
                <th>Plan</th>
                <th>Period ends</th>
                <th>Grace expires</th>
              </tr>
            </thead>
            <tbody>
              {org.shops.map((shop) => (
                <tr key={shop.id}>
                  <td>{shop.name}</td>
                  <td>{shop.isPrimary ? 'Yes' : 'No'}</td>
                  <td>{statusLabel(shop.subscriptionStatus)}</td>
                  <td>{formatDate(shop.currentPeriodEnd)}</td>
                  <td>{formatDate(shop.graceExpiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Billing history</h2>
        {org.billingEvents.length === 0 ? (
          <p className={styles.empty}>No billing events recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resulting status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {org.billingEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{e.eventType}</td>
                    <td>{statusLabel(e.status)}</td>
                    <td>{e.amountKobo != null ? `₦${(e.amountKobo / 100).toLocaleString('en-NG')}` : '—'}</td>
                    <td>{formatDate(e.createdAt)}</td>
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
