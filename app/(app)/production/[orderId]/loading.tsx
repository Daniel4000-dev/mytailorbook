import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

/** Route-level fallback — shown the instant navigation starts, before the
 *  page component itself is even ready, so a tap gets visible feedback
 *  right away instead of the old page just sitting frozen. */
export default function OrderDetailLoading() {
  return (
    <PageLayout header={<TopBar title="Order Dossier" showBack />}>
      <div className={styles.detailWrapper}>
        {/* Command Hero Card Skeleton */}
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.heroCustomer}>
              <Skeleton width={52} height={52} borderRadius={14} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <Skeleton width="55%" height={20} borderRadius={6} />
                <Skeleton width="35%" height={14} borderRadius={4} />
              </div>
            </div>
            <Skeleton width={110} height={36} borderRadius={18} />
          </div>

          {/* Stepper ribbon placeholder */}
          <div style={{ marginTop: 16 }}>
            <Skeleton width="100%" height={40} borderRadius={12} />
          </div>

          {/* Meta strip placeholder */}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, overflow: 'hidden' }}>
            <Skeleton width={110} height={28} borderRadius={14} />
            <Skeleton width={90} height={28} borderRadius={14} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </div>
        </div>

        {/* Dossier Tab Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 4, background: 'var(--sf-surface-variant)', borderRadius: 14 }}>
          <Skeleton width="100%" height={34} borderRadius={10} />
          <Skeleton width="100%" height={34} borderRadius={10} />
          <Skeleton width="100%" height={34} borderRadius={10} />
        </div>

        {/* Tab Content Cards */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={120} height={16} borderRadius={4} />
            <Skeleton width={80} height={26} borderRadius={13} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Skeleton width="100%" height={56} borderRadius={10} />
            <Skeleton width="100%" height={56} borderRadius={10} />
            <Skeleton width="100%" height={56} borderRadius={10} />
            <Skeleton width="100%" height={56} borderRadius={10} />
          </div>
        </div>

        <div className={styles.card}>
          <Skeleton width={140} height={16} borderRadius={4} />
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Skeleton width="100%" height={110} borderRadius={12} />
            <Skeleton width="100%" height={110} borderRadius={12} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
