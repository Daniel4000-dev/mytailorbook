import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

// Mirrors the real Owner/Staff dashboard markup 1:1 (same CSS classes) so the
// skeleton occupies exactly the same layout the real content will fill in.
export default function DashboardSkeleton() {
  return (
    <>
      <div className={styles.discoverSection}>
        <div className={styles.sectionHeader}>
          <Skeleton width={80} height={16} />
        </div>
        <div className={styles.discoverScroll}>
          <div className={styles.discoverCard}>
            <div className={styles.discoverText}>
              <Skeleton width={40} height={40} borderRadius="50%" />
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
              <Skeleton width={80} height={12} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <Skeleton width={140} height={16} />
      </div>

      <div className={styles.financeGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.financeCard}>
            <Skeleton width={90} height={12} />
            <Skeleton width={70} height={22} borderRadius={4} />
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <Skeleton width={130} height={16} />
      </div>

      <div className={styles.teamGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.teamCard}>
            <div className={styles.teamCardHeader}>
              <Skeleton width={36} height={36} borderRadius="50%" />
              <Skeleton width={80} height={14} />
            </div>
            <div className={styles.teamStatsRow}>
              <Skeleton width={28} height={20} />
              <Skeleton width={28} height={20} />
              <Skeleton width={28} height={20} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <Skeleton width={150} height={16} />
      </div>

      <div className={styles.attentionList}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.attentionRow}>
            <div className={styles.attentionInfo}>
              <Skeleton width={120} height={14} />
              <Skeleton width={180} height={12} />
            </div>
            <div className={styles.attentionMeta}>
              <Skeleton width={70} height={22} borderRadius={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
