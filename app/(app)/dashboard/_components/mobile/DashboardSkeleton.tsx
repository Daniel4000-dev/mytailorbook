import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../../page.module.css';

// Mirrors the real Owner/Staff dashboard markup 1:1 (same CSS classes) so the
// skeleton occupies exactly the same layout the real content will fill in.
export default function DashboardSkeleton() {
  return (
    <>
      {/* 1. Unified Atelier Command Hero Skeleton */}
      <section className={styles.atelierHero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroIdentity}>
            <Skeleton width={140} height={22} borderRadius={6} />
          </div>
          <div className={styles.heroRevenueBlock}>
            <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width={130} height={28} borderRadius={6} />
          </div>
        </div>

        {/* 5-Pillar Workshop Metric Strip */}
        <div className={styles.workshopMetricStrip}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.metricItem} style={{ pointerEvents: 'none' }}>
              <div className={styles.metricTop}>
                <Skeleton width={28} height={22} borderRadius={4} />
              </div>
              <Skeleton width={40} height={10} borderRadius={3} style={{ marginTop: 4 }} />
            </div>
          ))}
        </div>
      </section>

      {/* 2. Quick Command Hub Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '14px 0' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', background: 'var(--sf-bg-surface)', borderRadius: 14, border: '1px solid var(--sf-border-light)' }}>
            <Skeleton width={38} height={38} borderRadius={12} />
            <Skeleton width={44} height={10} borderRadius={3} />
          </div>
        ))}
      </div>

      {/* 3. Today's Workshop Priorities Skeleton */}
      <div style={{ padding: '16px 14px', background: 'var(--sf-bg-surface)', borderRadius: 16, border: '1px solid var(--sf-border-light)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Skeleton width={130} height={16} borderRadius={4} />
          <Skeleton width={50} height={14} borderRadius={10} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--sf-surface-variant)', borderRadius: 12 }}>
              <Skeleton width={32} height={32} borderRadius={10} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width="60%" height={14} borderRadius={4} />
                <Skeleton width="40%" height={11} borderRadius={3} />
              </div>
              <Skeleton width={55} height={22} borderRadius={11} />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Artisan Bench / Team Workload Skeleton */}
      <div className={styles.sectionHeader} style={{ marginTop: 6, marginBottom: 10 }}>
        <Skeleton width={130} height={16} borderRadius={4} />
      </div>

      <div className={styles.teamGrid}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={styles.teamCard}>
            <div className={styles.teamCardHeader}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <Skeleton width={90} height={14} borderRadius={4} />
                <Skeleton width={60} height={11} borderRadius={3} />
              </div>
            </div>
            <div className={styles.teamStatsRow}>
              <Skeleton width={28} height={20} borderRadius={4} />
              <Skeleton width={28} height={20} borderRadius={4} />
              <Skeleton width={28} height={20} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
