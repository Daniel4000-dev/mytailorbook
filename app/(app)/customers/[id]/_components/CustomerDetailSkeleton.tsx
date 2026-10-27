import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

// Mirrors the real customer profile markup (same CSS classes/single-column
// stack) so the skeleton occupies the same layout the real content will fill.
export default function CustomerDetailSkeleton() {
  return (
    <>
      <div className={styles.profileHeader}>
        <div className={styles.avatarWrap}>
          <Skeleton width={72} height={72} borderRadius="50%" />
        </div>
        <Skeleton width={150} height={22} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginTop: 4 }} />

        {/* 3-Metric Pulse */}
        <div className={styles.metricStrip} style={{ pointerEvents: 'none' }}>
          <div className={styles.metricItem}>
            <Skeleton width={32} height={20} borderRadius={4} />
            <Skeleton width={44} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem}>
            <Skeleton width={60} height={20} borderRadius={4} />
            <Skeleton width={60} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem}>
            <Skeleton width={50} height={20} borderRadius={4} />
            <Skeleton width={50} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
        </div>

        {/* Action Strip */}
        <div className={styles.appleActionStrip}>
          <Skeleton width="48%" height={38} borderRadius={19} />
          <Skeleton width="48%" height={38} borderRadius={19} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: '14px 0', padding: 4, background: 'var(--sf-surface-variant)', borderRadius: 14 }}>
        <Skeleton width="100%" height={32} borderRadius={10} />
        <Skeleton width="100%" height={32} borderRadius={10} />
        <Skeleton width="100%" height={32} borderRadius={10} />
      </div>

      {/* Body: Measurement Anatomy / Spec Cards */}
      <div style={{ padding: '16px', background: 'var(--sf-bg-surface)', borderRadius: 16, border: '1px solid var(--sf-border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <Skeleton width={130} height={16} borderRadius={4} />
          <Skeleton width={80} height={26} borderRadius={13} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Skeleton width="100%" height={52} borderRadius={10} />
          <Skeleton width="100%" height={52} borderRadius={10} />
          <Skeleton width="100%" height={52} borderRadius={10} />
          <Skeleton width="100%" height={52} borderRadius={10} />
        </div>
      </div>
    </>
  );
}
