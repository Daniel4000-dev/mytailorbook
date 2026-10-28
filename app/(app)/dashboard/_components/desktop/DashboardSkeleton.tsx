import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './OwnerDashboard.module.css';

// Mirrors desktop/OwnerDashboard.tsx's modern luxury layout so nothing reflows
export default function DashboardSkeleton() {
  return (
    <div className={styles.content}>
      {/* Atelier Hero Skeleton */}
      <div className={styles.hero} style={{ minHeight: '190px' }}>
        <div className={styles.heroTop}>
          <div className={styles.heroIdentity}>
            <Skeleton width={180} height={24} />
          </div>
          <Skeleton width={160} height={38} borderRadius={10} />
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroPrimaryStat}>
            <Skeleton width={90} height={12} />
            <Skeleton width={140} height={32} />
          </div>
          <div className={styles.heroStatRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.heroStat}>
                <Skeleton width={80} height={12} />
                <Skeleton width={60} height={20} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Switchboard Skeleton */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Skeleton width={44} height={44} borderRadius={14} />
              <Skeleton width={64} height={12} />
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Content Skeleton */}
      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          {/* Sourcing Fabrics / Market Day Skeleton */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width={140} height={16} borderRadius={4} />
              <Skeleton width={200} height={12} borderRadius={4} />
            </div>
            <Skeleton width={110} height={32} borderRadius={100} />
          </div>

          {/* Agenda Card Skeleton */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <Skeleton width={180} height={16} />
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton width="100%" height={48} borderRadius={12} />
              <Skeleton width="100%" height={48} borderRadius={12} />
            </div>
          </div>

          {/* Team Bench Card Skeleton */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <Skeleton width={140} height={16} />
            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={70} borderRadius={12} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.rail}>
          {/* Priorities Rail Card Skeleton */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            padding: '16px',
          }}>
            <Skeleton width={150} height={16} />
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton width="100%" height={56} borderRadius={12} />
              <Skeleton width="100%" height={56} borderRadius={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
