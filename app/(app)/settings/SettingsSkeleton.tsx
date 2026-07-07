import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

// Mirrors the real settings page markup (same CSS classes) so the skeleton
// occupies the same section/card layout the real content will fill in.
export default function SettingsSkeleton() {
  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <Skeleton width={140} height={14} />
        <div className={styles.card}>
          <div className={styles.profileRow}>
            <Skeleton width={56} height={56} borderRadius="50%" />
            <div className={styles.profileInfo}>
              <Skeleton width={130} height={16} />
              <Skeleton width={90} height={12} />
              <Skeleton width={160} height={12} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <Skeleton width={130} height={14} />
        <div className={styles.card}>
          <div className={styles.profileRow}>
            <Skeleton width={56} height={56} borderRadius="50%" />
            <div className={styles.profileInfo}>
              <Skeleton width={150} height={16} />
              <Skeleton width={110} height={12} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <Skeleton width={150} height={14} />
        <div className={styles.card}>
          <div className={styles.staffList}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={styles.staffItem}>
                <Skeleton width={40} height={40} borderRadius="50%" />
                <div className={styles.staffInfo}>
                  <Skeleton width={120} height={14} />
                  <Skeleton width={160} height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
