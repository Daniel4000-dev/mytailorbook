import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

// WhatsApp 'You' Tab Style Skeleton:
// Matches the centered thought bubble, 84px avatar, name, and inset grouped cards.
export default function SettingsSkeleton() {
  return (
    <>
      {/* Centered Hero Profile Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 16px', gap: 10 }}>
        <Skeleton width={140} height={28} borderRadius={18} />
        <Skeleton width={84} height={84} borderRadius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Skeleton width={160} height={22} />
          <Skeleton width={110} height={13} />
        </div>
      </div>

      {/* Grouped Section Skeletons */}
      <div className={styles.groups}>
        {[4, 2, 4, 2, 1].map((rowCount, i) => (
          <div key={i} className={styles.groupCard}>
            {Array.from({ length: rowCount }).map((_, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px' }}>
                <Skeleton width={22} height={22} borderRadius={6} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Skeleton width={120 + (j * 15)} height={15} />
                  <Skeleton width={90 + (j * 12)} height={11} />
                </div>
                <Skeleton width={12} height={12} borderRadius={2} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
