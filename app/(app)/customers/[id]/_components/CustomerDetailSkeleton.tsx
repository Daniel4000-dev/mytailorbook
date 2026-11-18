import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

/**
 * Exactly mirrors the rendered customer profile layout (executiveCard, cardMainRow,
 * actionGrid, statsStrip, tabBar, and tabContent) so the skeleton matches pixel-for-pixel.
 */
export default function CustomerDetailSkeleton() {
  return (
    <div className={styles.profileBar}>
      {/* ── 1. Executive Card Hero ── */}
      <section className={styles.executiveCard} style={{ pointerEvents: 'none' }}>
        <div className={styles.cardMainRow}>
          <div className={styles.avatarWrap}>
            <Skeleton width={68} height={68} borderRadius="50%" />
          </div>

          <div className={styles.profileDetails}>
            <div className={styles.nameHeaderRow}>
              <Skeleton width={180} height={22} borderRadius={6} />
              <Skeleton width={50} height={18} borderRadius={9999} />
            </div>

            <div className={styles.metaRow} style={{ marginTop: 6, gap: 6 }}>
              <Skeleton width={120} height={24} borderRadius={9999} />
              <Skeleton width={56} height={20} borderRadius={9999} />
              <Skeleton width={70} height={20} borderRadius={9999} />
            </div>
          </div>
        </div>

        {/* Action Grid (WhatsApp, Call, New Order) */}
        <div className={styles.actionGrid} style={{ marginTop: 14 }}>
          <Skeleton width="100%" height={38} borderRadius={12} />
          <Skeleton width="100%" height={38} borderRadius={12} />
          <Skeleton width="100%" height={38} borderRadius={12} />
        </div>

        {/* 3-Metric Stats Strip */}
        <div className={styles.statsStrip} style={{ marginTop: 12 }}>
          <div className={styles.statItem}>
            <Skeleton width={40} height={18} borderRadius={4} />
            <Skeleton width={50} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Skeleton width={65} height={18} borderRadius={4} />
            <Skeleton width={60} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Skeleton width={55} height={18} borderRadius={4} />
            <Skeleton width={65} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </div>
        </div>
      </section>

      {/* ── 2. Segmented Tab Bar ── */}
      <div className={styles.tabBar} style={{ pointerEvents: 'none', margin: '12px 0 16px' }}>
        <Skeleton width="100%" height={36} borderRadius={10} />
        <Skeleton width="100%" height={36} borderRadius={10} />
        <Skeleton width="100%" height={36} borderRadius={10} />
      </div>

      {/* ── 3. Active Tab Content (Measurement Anatomy Grid) ── */}
      <div className={styles.tabContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Skeleton width={140} height={18} borderRadius={4} />
          <Skeleton width={90} height={30} borderRadius={9999} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Skeleton width="100%" height={56} borderRadius={12} />
          <Skeleton width="100%" height={56} borderRadius={12} />
          <Skeleton width="100%" height={56} borderRadius={12} />
          <Skeleton width="100%" height={56} borderRadius={12} />
        </div>
      </div>
    </div>
  );
}
