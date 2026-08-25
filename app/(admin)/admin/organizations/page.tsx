import Link from 'next/link';
import { getOrganizations, listAffiliates } from '@/lib/admin/queries';
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

const STATUS_OPTIONS = [
  { value: '', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'canceled', label: 'Canceled' },
];

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; affiliate?: string; from?: string; to?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const status = params.status?.trim() || undefined;
  const affiliateId = params.affiliate?.trim() || undefined;
  const dateFrom = params.from?.trim() || undefined;
  const dateTo = params.to?.trim() || undefined;
  const page = Number(params.page) || 1;

  const [{ rows, total, pageSize }, affiliates] = await Promise.all([
    getOrganizations({ search, status, affiliateId, dateFrom, dateTo, page, pageSize: 20 }),
    listAffiliates(),
  ]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const currentFilters: Record<string, string> = {
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
    ...(affiliateId ? { affiliate: affiliateId } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  };
  const exportHref = `/admin/organizations/export?${new URLSearchParams(currentFilters)}`;

  return (
    <div>
      <div className={styles.headingRow}>
        <div>
          <h1 className={styles.heading}>Organizations</h1>
          <p className={styles.subheading}>{total} total</p>
        </div>
        <a className={styles.exportLink} href={exportHref}>
          Export CSV
        </a>
      </div>

      <form className={styles.filterForm} action="/admin/organizations">
        <input className={styles.searchInput} type="text" name="q" placeholder="Search name or email…" defaultValue={search ?? ''} />
        <select className={styles.select} name="status" defaultValue={status ?? ''}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select className={styles.select} name="affiliate" defaultValue={affiliateId ?? ''}>
          <option value="">All affiliates</option>
          {affiliates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.code})
            </option>
          ))}
        </select>
        <input className={styles.dateInput} type="date" name="from" defaultValue={dateFrom ?? ''} aria-label="Signed up after" />
        <input className={styles.dateInput} type="date" name="to" defaultValue={dateTo ?? ''} aria-label="Signed up before" />
        <button className={styles.searchButton} type="submit">
          Filter
        </button>
        {(search || status || affiliateId || dateFrom || dateTo) && (
          <Link className={styles.clearLink} href="/admin/organizations">
            Clear
          </Link>
        )}
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
              href={`/admin/organizations?${new URLSearchParams({ ...currentFilters, page: String(p) })}`}
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
