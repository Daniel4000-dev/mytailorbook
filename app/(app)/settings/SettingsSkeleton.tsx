import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

// Mirrors the real settings page markup (identity strip + grouped rows)
// so the skeleton occupies the same layout the real content will fill in.
export default function SettingsSkeleton() {
  return (
    <>
      <div className={styles.identityStrip}>
        <Skeleton width={56} height={56} borderRadius="50%" />
        <div className={styles.identityText}>
          <Skeleton width={130} height={18} />
          <Skeleton width={90} height={12} />
        </div>
      </div>

      <div className={styles.groups}>
        {[2, 1, 1, 2, 1].map((rowCount, i) => (
          <div key={i} className={styles.group}>
            <Skeleton width={100} height={12} />
            <div className={styles.groupCard}>
              {Array.from({ length: rowCount }).map((_, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                  <Skeleton width={20} height={20} borderRadius={4} />
                  <Skeleton width={140} height={14} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
