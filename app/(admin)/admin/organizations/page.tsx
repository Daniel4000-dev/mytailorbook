import Link from 'next/link';
import { getOrganizations } from '@/lib/admin/queries';
import styles from './page.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: string | null) {
  if (!status || status === 'free') return 'Free';
  if (status === 'active') return 'Active';
  if (status === 'past_due') return 'Past due';
  if (status === 'canceled') return 'Canceled';
  return status;
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const page = Number(params.page) || 1;

  const { rows, total, pageSize } = await getOrganizations({ search, page, pageSize: 20 });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div>
      <h1 className={styles.heading}>Organizations</h1>
      <p className={styles.subheading}>{total} total</p>

      <form className={styles.searchForm} action={`/admin/organizations`}>
        <input
          className={styles.searchInput}
          type="text"
          name="q"
          placeholder="Search by name…"
          defaultValue={search ?? ''}
        />
        <button className={styles.searchButton} type="submit">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p className={styles.empty}>No organizations found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Shops</th>
                <th>Customers</th>
                <th>Orders</th>
                <th>Referral</th>
                <th>Signed up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => (
                <tr key={org.id}>
                  <td>
                    <Link href={`/admin/organizations/${org.id}`} className={styles.rowLink}>
                      {org.name}
                    </Link>
                  </td>
                  <td>{org.ownerEmail ?? '—'}</td>
                  <td>{statusLabel(org.subscriptionStatus)}</td>
                  <td>{org.shopCount}</td>
                  <td>{org.customerCount}</td>
                  <td>{org.orderCount}</td>
                  <td>{org.affiliateCode ? <code>{org.affiliateCode}</code> : '—'}</td>
                  <td>{formatDate(org.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/organizations?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(p) })}`}
              className={p === page ? `${styles.pageLink} ${styles.pageLinkActive}` : styles.pageLink}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
