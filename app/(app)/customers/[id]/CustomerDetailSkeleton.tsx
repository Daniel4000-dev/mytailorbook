import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

// Mirrors the real customer profile markup (same CSS classes/grid) so the
// skeleton occupies the same two-column layout the real content will fill.
export default function CustomerDetailSkeleton() {
  return (
    <>
      <div className={styles.leftColumn}>
        <div className={`${styles.card} ${styles.profileHeader}`}>
          <Skeleton width={72} height={72} borderRadius="50%" />
          <Skeleton width={140} height={20} />
          <Skeleton width={120} height={14} />
          <Skeleton width={110} height={12} />
        </div>

        <div className={`${styles.card} ${styles.statsGrid}`}>
          <div className={styles.stat}>
            <Skeleton width={30} height={20} />
            <Skeleton width={50} height={12} />
          </div>
          <div className={styles.stat}>
            <Skeleton width={60} height={20} />
            <Skeleton width={50} height={12} />
          </div>
          <div className={styles.stat}>
            <Skeleton width={60} height={20} />
            <Skeleton width={50} height={12} />
          </div>
        </div>

        <div className={`${styles.card} ${styles.notesSection}`}>
          <Skeleton width={130} height={16} />
          <Skeleton width="100%" height={80} borderRadius={8} />
        </div>
      </div>

      <div className={styles.rightColumn}>
        <div className={styles.card}>
          <Skeleton width={130} height={16} />
          <Skeleton width="100%" height={280} borderRadius={8} />
        </div>

        <div className={styles.card}>
          <Skeleton width={130} height={16} />
          <div className={styles.orderList}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderMeta}>
                    <Skeleton width={70} height={22} borderRadius={12} />
                    <Skeleton width={70} height={12} />
                  </div>
                </div>
                <Skeleton width="90%" height={14} />
                <div className={styles.orderFinancials}>
                  <Skeleton width={70} height={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
