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
            <Symbol name="monitoring" size={24} className={styles.iconStickiness} fill />
            <h3 className={styles.statTitle}>Stickiness (DAU/MAU)</h3>
          </div>
          <p className={styles.statValue}>
            {stats.monthlyActive > 0 ? Math.round((stats.dailyActive / stats.monthlyActive) * 100) : 0}%
          </p>
          <p className={styles.statSubtext}>Daily users returning per month</p>
        </div>
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
            <Symbol name="calendar_month" size={24} className={styles.iconDaily} fill />
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

      <div className={styles.splitLayout}>
        <div className={styles.splitColumn}>
          <div className={styles.sectionHeader}>
            <h2>Global Action Distribution (7d)</h2>
            <p>What all active users are doing across the platform.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Frequency</th>
                </tr>
              </thead>
              <tbody>
                {stats.globalActionDistribution.map((item) => (
                  <tr key={item.action}>
                    <td className={styles.boldCell}>{item.action}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.splitColumn}>
          <div className={styles.sectionHeader}>
            <h2>Daily Engagement by Role (24h)</h2>
            <p>Which user roles are most active today.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Active Users</th>
                </tr>
              </thead>
              <tbody>
                {stats.engagementByRole.map((item) => (
                  <tr key={item.role}>
                    <td className={styles.boldCell}>{item.role}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <h2>Recent Global Activity Feed</h2>
        <p>A real-time list of the latest actions across all shops.</p>
      </div>
      
      <div className={styles.tableWrap} style={{ marginBottom: '2rem', maxHeight: '400px', overflowY: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Shop/Org</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentActivityFeed.map((item, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(item.createdAt).toLocaleTimeString()} - {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className={styles.boldCell}>{item.actorName}</td>
                <td>{item.orgName}</td>
                <td>
                  <span className={styles.breakdownItem}>{item.action}</span> ({item.entityType})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <th>Action Breakdown</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {stats.actionPerformers.map((shop) => (
                <tr key={shop.shopId}>
                  <td className={styles.boldCell}>{shop.orgName}</td>
                  <td>{shop.actionCount}</td>
                  <td>
                    <div className={styles.breakdownList}>
                      {shop.actionBreakdown.slice(0, 3).map(b => (
                        <span key={b.action} className={styles.breakdownItem}>
                          {b.action} ({b.count})
                        </span>
                      ))}
                      {shop.actionBreakdown.length > 3 && (
                        <span className={styles.breakdownItem}>
                          +{shop.actionBreakdown.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
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
