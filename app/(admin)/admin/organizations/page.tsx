import Link from 'next/link';
import { getOrganizations, listAffiliates } from '@/lib/admin/queries';
import Symbol from '@/components/ui/Symbol/Symbol';
import AdminModeFilter from '../AdminModeFilter';
import styles from './page.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadgeClass(status: string | null) {
  if (status === 'active') return styles.planActive;
  if (status === 'past_due' || status === 'canceled') return styles.planPastDue;
  return styles.planFree;
}

function modeBadgeClass(mode: string | null) {
  if (mode === 'rtw') return styles.modeRtw;
  if (mode === 'hybrid') return styles.modeHybrid;
  return styles.modeBespoke;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'active', label: 'Active Premium' },
  { value: 'past_due', label: 'Past due' },
  { value: 'canceled', label: 'Canceled' },
];

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    mode?: string;
    affiliate?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const status = params.status?.trim() || undefined;
  const mode = params.mode?.trim() || undefined;
  const affiliateId = params.affiliate?.trim() || undefined;
  const dateFrom = params.from?.trim() || undefined;
  const dateTo = params.to?.trim() || undefined;
  const page = Number(params.page) || 1;

  const [{ rows, total, pageSize }, affiliates] = await Promise.all([
    getOrganizations({ search, status, mode, affiliateId, dateFrom, dateTo, page, pageSize: 20 }),
    listAffiliates(),
  ]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const currentFilters: Record<string, string> = {
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
    ...(mode ? { mode } : {}),
    ...(affiliateId ? { affiliate: affiliateId } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  };
  const exportHref = `/admin/organizations/export?${new URLSearchParams(currentFilters)}`;

  return (
    <div className={styles.container}>
      {/* ── Page Header ── */}
      <div className={styles.headingRow}>
        <div>
          <h1 className={styles.heading}>Ateliers & Organizations</h1>
          <p className={styles.subheading}>{total} fashion houses registered across all modes</p>
        </div>

        <div className={styles.headerActions}>
          <AdminModeFilter />
          <a className={styles.exportLink} href={exportHref}>
            <Symbol name="ios_share" size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div className={styles.filterCard}>
        <form className={styles.filterForm} action="/admin/organizations">
          {mode && <input type="hidden" name="mode" value={mode} />}
          <input
            className={styles.searchInput}
            type="text"
            name="q"
            placeholder="Search studio name or owner email…"
            defaultValue={search ?? ''}
          />
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
          <input
            className={styles.dateInput}
            type="date"
            name="from"
            defaultValue={dateFrom ?? ''}
            aria-label="Signed up after"
          />
          <input
            className={styles.dateInput}
            type="date"
            name="to"
            defaultValue={dateTo ?? ''}
            aria-label="Signed up before"
          />
          <button className={styles.searchButton} type="submit">
            <Symbol name="search" size={14} />
            <span>Filter</span>
          </button>
          {(search || status || affiliateId || dateFrom || dateTo) && (
            <Link className={styles.clearLink} href={`/admin/organizations${mode ? `?mode=${mode}` : ''}`}>
              Clear Filters
            </Link>
          )}
        </form>
      </div>

      {/* ── Table Card ── */}
      <div className={styles.tableCard}>
        {rows.length === 0 ? (
          <p className={styles.empty}>No organizations match the selected criteria.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Atelier / Organization</th>
                  <th>Operating Mode</th>
                  <th>Owner Email</th>
                  <th>Subscription</th>
                  <th>Branches</th>
                  <th>Clients</th>
                  <th>Orders</th>
                  <th>Affiliate Referral</th>
                  <th>Registered</th>
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
                    <td>
                      <span className={`${styles.modeBadge} ${modeBadgeClass(org.businessMode)}`}>
                        {org.businessMode}
                      </span>
                    </td>
                    <td>{org.ownerEmail ?? '—'}</td>
                    <td>
                      <span className={`${styles.planBadge} ${statusBadgeClass(org.subscriptionStatus)}`}>
                        {org.subscriptionStatus || 'Free'}
                      </span>
                    </td>
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
    </div>
  );
}
