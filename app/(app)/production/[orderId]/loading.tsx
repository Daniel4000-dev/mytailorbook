import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

/** Route-level fallback — shown the instant navigation starts, before the
 *  page component itself is even ready, so a tap gets visible feedback
 *  right away instead of the old page just sitting frozen. */
export default function OrderDetailLoading() {
  return (
    <PageLayout header={<TopBar title="Order" showBack />}>
      <div className={styles.detailWrapper}>
        <Skeleton width="100%" height={48} borderRadius={8} />

        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Skeleton width={56} height={56} borderRadius="50%" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="40%" height={14} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <Skeleton width={140} height={16} />
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Skeleton width="100%" height={60} borderRadius={8} />
            <Skeleton width="100%" height={60} borderRadius={8} />
          </div>
        </div>

        <div className={styles.card}>
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={100} borderRadius={8} />
        </div>
      </div>
    </PageLayout>
  );
}
