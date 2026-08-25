import { getAdminAuditLog } from '@/lib/admin/queries';
import styles from './page.module.css';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminActivityPage() {
  const entries = await getAdminAuditLog(100);

  return (
    <div>
      <h1 className={styles.heading}>Activity</h1>
      <p className={styles.subheading}>Every mutating action taken inside /admin — who did what, and when.</p>

      {entries.length === 0 ? (
        <p className={styles.empty}>No admin activity recorded yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.adminName ?? '—'}</td>
                  <td>{e.action}</td>
                  <td>
                    {e.targetType}
                    {e.targetId ? ` (${e.targetId.slice(0, 8)})` : ''}
                  </td>
                  <td>{e.diff ? JSON.stringify(e.diff) : '—'}</td>
                  <td>{formatDateTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
