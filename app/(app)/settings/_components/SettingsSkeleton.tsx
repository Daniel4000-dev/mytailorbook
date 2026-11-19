import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

// Mirrors the real executive workshop hero card and grouped settings sections
// so the skeleton occupies the exact same layout the real content will fill in.
export default function SettingsSkeleton() {
  return (
    <>
      {/* Executive Hero Card Skeleton */}
      <div className={styles.heroSkeletonCard}>
        <div className={styles.heroCardHeader}>
          <Skeleton width={62} height={62} borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width={160} height={20} />
            <Skeleton width={110} height={18} borderRadius={12} />
            <Skeleton width={140} height={12} />
          </div>
          <Skeleton width={16} height={16} borderRadius={4} />
        </div>
        <div className={styles.heroChipsStrip}>
          <Skeleton width={64} height={24} borderRadius={16} />
          <Skeleton width={110} height={24} borderRadius={16} />
          <Skeleton width={80} height={24} borderRadius={16} />
        </div>
      </div>

      {/* Grouped Section Skeletons */}
      <div className={styles.groups}>
        {[3, 2, 1, 2, 1].map((rowCount, i) => (
          <div key={i} className={styles.group}>
            <Skeleton width={110} height={11} borderRadius={4} style={{ marginLeft: 6 }} />
            <div className={styles.groupCard}>
              {Array.from({ length: rowCount }).map((_, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                  <Skeleton width={22} height={22} borderRadius={6} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Skeleton width={130 + (j * 15)} height={14} />
                    <Skeleton width={90 + (j * 20)} height={11} />
                  </div>
                  <Skeleton width={12} height={12} borderRadius={2} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
