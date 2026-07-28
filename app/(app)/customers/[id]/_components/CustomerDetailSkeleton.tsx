import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

// Mirrors the real customer profile markup (same CSS classes/single-column
// stack) so the skeleton occupies the same layout the real content will fill.
export default function CustomerDetailSkeleton() {
  return (
    <>
      <div className={styles.profileHeader}>
        <Skeleton width={72} height={72} borderRadius="50%" />
        <Skeleton width={140} height={20} />
        <Skeleton width={120} height={14} />
      </div>

      <div className={styles.section}>
        <Skeleton width={160} height={18} />
        <div className={styles.statsGrid}>
          <Skeleton width="100%" height={64} borderRadius={8} />
          <Skeleton width="100%" height={64} borderRadius={8} />
          <Skeleton width="100%" height={64} borderRadius={8} />
        </div>
      </div>

      <div className={styles.section}>
        <Skeleton width={190} height={18} />
        <Skeleton width="100%" height={90} borderRadius={8} />
      </div>

      <div className={styles.section}>
        <Skeleton width={130} height={18} />
        <div className={styles.orderList}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderMeta}>
                  <Skeleton width={140} height={14} />
                  <Skeleton width={70} height={12} />
                </div>
                <Skeleton width={70} height={22} borderRadius={12} />
              </div>
              <div className={styles.orderFinancials}>
                <Skeleton width={70} height={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
