import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

// Mirrors the real customers list markup (same CSS classes, both the mobile
// card list and the desktop table are present — CSS hides one per breakpoint
// exactly like the real content does) so the skeleton matches at every size.
export default function CustomersSkeleton() {
  const rows = Array.from({ length: 6 });

  return (
    <>
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <Skeleton width={36} height={26} />
          <Skeleton width={100} height={12} />
        </div>
        <div className={styles.statCard}>
          <Skeleton width={36} height={26} />
          <Skeleton width={100} height={12} />
        </div>
      </div>

      <div className={styles.actionArea}>
        <Skeleton width="100%" height={44} borderRadius={8} />
      </div>

      <div className={styles.mobileList}>
        {rows.map((_, i) => (
          <div key={i} className={styles.mobileCard}>
            <div className={styles.cardHeader}>
              <Skeleton width={44} height={44} borderRadius="50%" />
              <div className={styles.cardInfo}>
                <Skeleton width={140} height={15} />
                <Skeleton width={110} height={12} />
                <Skeleton width={90} height={11} />
              </div>
            </div>
            <div className={styles.cardMetrics}>
              <div className={styles.metric}>
                <Skeleton width={40} height={11} />
                <Skeleton width={24} height={16} />
              </div>
              <div className={styles.metric}>
                <Skeleton width={40} height={11} />
                <Skeleton width={60} height={16} />
              </div>
              <div className={styles.metric}>
                <Skeleton width={40} height={11} />
                <Skeleton width={60} height={16} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.desktopTableContainer}>
        <table className={styles.desktopTable}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Orders (Active)</th>
              <th>Total Spend</th>
              <th>Balance</th>
              <th className={styles.alignRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i} className={styles.tableRow}>
                <td>
                  <div className={styles.customerCell}>
                    <Skeleton width={32} height={32} borderRadius="50%" />
                    <Skeleton width={120} height={14} />
                  </div>
                </td>
                <td>
                  <Skeleton width={110} height={13} />
                  <Skeleton width={80} height={11} />
                </td>
                <td><Skeleton width={80} height={20} borderRadius={12} /></td>
                <td><Skeleton width={70} height={14} /></td>
                <td><Skeleton width={70} height={14} /></td>
                <td className={styles.alignRight}><Skeleton width={90} height={30} borderRadius={6} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
