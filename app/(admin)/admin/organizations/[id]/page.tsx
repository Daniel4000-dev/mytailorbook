import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrganizationDetail } from '@/lib/admin/queries';
import Symbol from '@/components/ui/Symbol/Symbol';
import ShopControlsCard from './ShopControlsCard';
import styles from './page.module.css';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string | null) {
  if (!status || status === 'free') return 'Free';
  if (status === 'active') return 'Active Premium';
  if (status === 'past_due') return 'Past Due';
  if (status === 'canceled') return 'Canceled';
  return status;
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganizationDetail(id);
  if (!org) notFound();

  return (
    <div className={styles.container}>
      {/* ── Breadcrumb & Top Bar ── */}
      <div className={styles.topNav}>
        <Link href="/admin/organizations" className={styles.backLink}>
          <Symbol name="arrow_back" size={14} />
          <span>Back to Tailor Shops</span>
        </Link>
      </div>

      {/* ── Hero Card ── */}
      <div className={styles.heroCard}>
        <div className={styles.headingRow}>
          <div>
            <h1 className={styles.heading}>{org.name}</h1>
            <p className={styles.subheading}>
              <span>Signed up {formatDate(org.createdAt)}</span>
              <span>·</span>
              <span>
                Owner: <span className={styles.ownerTag}>{org.ownerName || '—'}</span>{' '}
                {org.ownerEmail ? `(${org.ownerEmail})` : ''}
              </span>
              {org.affiliateCode && (
                <>
                  <span>·</span>
                  <span>
                    Referred by <code className={styles.affiliateChip}>{org.affiliateCode}</code>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Summary Cards ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Clients</span>
            <span className={styles.kpiIconWrap}>
              <Symbol name="person" size={16} />
            </span>
          </div>
          <span className={styles.kpiValue}>{org.customerCount.toLocaleString()}</span>
          <span className={styles.kpiNote}>Measurement profiles stored</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Garment Orders</span>
            <span className={styles.kpiIconWrap}>
              <Symbol name="checkroom" size={16} />
            </span>
          </div>
          <span className={styles.kpiValue}>{org.orderCount.toLocaleString()}</span>
          <span className={styles.kpiNote}>Lifetime orders booked</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Staff & Apprentices</span>
            <span className={styles.kpiIconWrap}>
              <Symbol name="group" size={16} />
            </span>
          </div>
          <span className={styles.kpiValue}>{org.staffCount}</span>
          <span className={styles.kpiNote}>Active workshop members</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Shop Branches</span>
            <span className={styles.kpiIconWrap}>
              <Symbol name="store" size={16} />
            </span>
          </div>
          <span className={styles.kpiValue}>{org.shops.length}</span>
          <span className={styles.kpiNote}>Operating workshops</span>
        </div>
      </div>

      {/* ── Production Pipeline (Orders by Status) ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionHeading}>Production Pipeline</h2>
            <p className={styles.sectionSubhead}>Active order distribution across sewing stages</p>
          </div>
        </div>

        <div className={styles.pipelineBox}>
          {Object.keys(org.ordersByStatus).length === 0 ? (
            <p className={styles.empty}>No garment orders logged yet.</p>
          ) : (
            <div className={styles.pipelineGrid}>
              {Object.entries(org.ordersByStatus).map(([status, count]) => (
                <div key={status} className={styles.statusPill}>
                  <span>{status}</span>
                  <span className={styles.statusCount}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Shop Operational Overrides & Branches ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionHeading}>Workshop Branches & Controls</h2>
            <p className={styles.sectionSubhead}>
              Manage operating mode (Bespoke / RTW / Hybrid), grant VIP extensions, and adjust streaks
            </p>
          </div>
        </div>

        <div>
          {org.shops.map((shop) => (
            <ShopControlsCard key={shop.id} orgId={org.id} shop={shop} />
          ))}
        </div>
      </section>

      {/* ── Team & Staff Directory ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionHeading}>Team & Apprentices Roster</h2>
            <p className={styles.sectionSubhead}>{org.team.length} members registered in this business</p>
          </div>
        </div>

        <div className={styles.tableCard}>
          {org.team.length === 0 ? (
            <p className={styles.empty}>No team profiles found.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {org.team.map((member) => {
                    const initials = (member.name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    const roleClass =
                      member.role === 'Owner' || member.role === 'OrgAdmin'
                        ? styles.roleOwner
                        : member.role === 'BranchManager'
                        ? styles.roleManager
                        : styles.roleStaff;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className={styles.profileCell}>
                            <div className={styles.avatar}>{initials}</div>
                            <div className={styles.profileNameCol}>
                              <span className={styles.profileName}>{member.name || 'Unnamed Staff'}</span>
                              <span className={styles.profileEmail}>{member.email || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.roleBadge} ${roleClass}`}>{member.role || 'Staff'}</span>
                        </td>
                        <td>{member.active ? 'Active' : 'Deactivated'}</td>
                        <td>{formatDate(member.lastActiveAt)}</td>
                        <td>{formatDate(member.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Billing & VIP Grants History ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionHeading}>Billing & Grants History</h2>
            <p className={styles.sectionSubhead}>Subscription transactions, Paystack invoices, and admin comp events</p>
          </div>
        </div>

        <div className={styles.tableCard}>
          {org.billingEvents.length === 0 ? (
            <p className={styles.empty}>No billing events recorded yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Resulting Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {org.billingEvents.map((e, i) => (
                    <tr key={i}>
                      <td>
                        <code>{e.eventType}</code>
                      </td>
                      <td>{statusLabel(e.status)}</td>
                      <td>
                        {e.amountKobo != null && e.amountKobo > 0
                          ? `₦${(e.amountKobo / 100).toLocaleString('en-NG')}`
                          : e.eventType.includes('comp') || e.amountKobo === 0
                          ? '₦0 (Comped)'
                          : '—'}
                      </td>
                      <td>{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Admin Audit Trail for this Shop ── */}
      {org.auditLogs.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionHeading}>Admin Override Audit Trail</h2>
              <p className={styles.sectionSubhead}>Recent operational overrides applied to this business</p>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Changes / Details</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {org.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.adminName || 'Admin'}</strong>
                      </td>
                      <td>
                        <code>{log.action}</code>
                      </td>
                      <td>
                        <div className={styles.auditDiff}>
                          {log.diff ? JSON.stringify(log.diff) : '—'}
                        </div>
                      </td>
                      <td>{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
