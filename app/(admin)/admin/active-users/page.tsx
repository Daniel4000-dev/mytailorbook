import { getActiveUsersStats } from '@/lib/admin/queries';
import styles from './page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ActiveUsersPage() {
  const stats = await getActiveUsersStats();

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Active Users Analytics</h1>
      <p className={styles.subheading}>
        Monitor real-time engagement and track how actively tailors are using the platform.
      </p>

      {/* Top Level Metric Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Symbol name="person" size={24} className={styles.iconOnline} fill />
            <h3 className={styles.statTitle}>Online Now</h3>
          </div>
          <p className={styles.statValue}>{stats.onlineNow}</p>
          <p className={styles.statSubtext}>Active within the last 15 mins</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Symbol name="calendar_today" size={24} className={styles.iconDaily} fill />
            <h3 className={styles.statTitle}>Daily Active (DAU)</h3>
          </div>
          <p className={styles.statValue}>{stats.dailyActive}</p>
          <p className={styles.statSubtext}>Active in the last 24 hours</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Symbol name="date_range" size={24} className={styles.iconWeekly} fill />
            <h3 className={styles.statTitle}>Weekly Active (WAU)</h3>
          </div>
          <p className={styles.statValue}>{stats.weeklyActive}</p>
          <p className={styles.statSubtext}>Active in the last 7 days</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Symbol name="event_note" size={24} className={styles.iconMonthly} fill />
            <h3 className={styles.statTitle}>Monthly Active (MAU)</h3>
          </div>
          <p className={styles.statValue}>{stats.monthlyActive}</p>
          <p className={styles.statSubtext}>Active in the last 30 days</p>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <h2>Power Users (Last 7 Days)</h2>
        <p>Shops that have recorded the most mutating actions (orders, customers, etc).</p>
      </div>

      {stats.actionPerformers.length === 0 ? (
        <div className={styles.emptyState}>No activity recorded in the last 7 days.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Organization / Shop</th>
                <th>Actions Performed</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {stats.actionPerformers.map((shop) => (
                <tr key={shop.shopId}>
                  <td className={styles.boldCell}>{shop.orgName}</td>
                  <td>{shop.actionCount}</td>
                  <td>
                    <span className={`${styles.gradeBadge} ${shop.actionCount >= 20 ? styles.gradeHigh : shop.actionCount >= 5 ? styles.gradeMedium : styles.gradeLow}`}>
                      {shop.actionCount >= 20 ? 'High' : shop.actionCount >= 5 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
