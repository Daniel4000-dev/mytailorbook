import Skeleton from '@/components/ui/Skeleton/Skeleton';
import pageStyles from '../../page.module.css';
import discoverStyles from './DiscoverBanner.module.css';
import styles from './OwnerDashboard.module.css';

// Mirrors desktop/OwnerDashboard.tsx's layout 1:1 (discover banner, finance
// row, two-column team/attention split) so nothing reflows once real data
// arrives.
export default function DashboardSkeleton() {
  return (
    <div className={styles.content}>
      <div className={discoverStyles.banner}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <div className={discoverStyles.text}>
          <Skeleton width={160} height={14} />
          <Skeleton width={220} height={12} />
        </div>
      </div>

      <div className={pageStyles.sectionHeader}>
        <Skeleton width={140} height={16} />
      </div>

      <div className={pageStyles.financeGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={pageStyles.financeCard}>
            <Skeleton width={90} height={12} />
            <Skeleton width={70} height={22} borderRadius={4} />
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          <div className={pageStyles.sectionHeader}>
            <Skeleton width={130} height={16} />
          </div>
          <div className={styles.teamGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={pageStyles.teamCard}>
                <div className={pageStyles.teamCardHeader}>
                  <Skeleton width={36} height={36} borderRadius="50%" />
                  <Skeleton width={80} height={14} />
                </div>
                <div className={pageStyles.teamStatsRow}>
                  <Skeleton width={28} height={20} />
                  <Skeleton width={28} height={20} />
                  <Skeleton width={28} height={20} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rail}>
          <div className={pageStyles.sectionHeader}>
            <Skeleton width={150} height={16} />
          </div>
          <div className={pageStyles.attentionList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={pageStyles.attentionRow}>
                <div className={pageStyles.attentionInfo}>
                  <Skeleton width={120} height={14} />
                  <Skeleton width={180} height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
