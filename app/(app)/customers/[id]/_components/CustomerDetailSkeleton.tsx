import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from '../page.module.css';

/**
 * Exactly mirrors the rendered customer profile layout (executiveCard, cardMainRow,
 * statsTray, actionCommandStrip, segmentTabBar, and measurementDossierCard) so the skeleton matches pixel-for-pixel.
 */
export default function CustomerDetailSkeleton() {
  return (
    <>
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

          {/* Inset 3-Metric Executive Stats Strip */}
          <div className={styles.statsTray}>
            <div className={styles.statBox}>
              <Skeleton width={32} height={20} borderRadius={4} />
              <Skeleton width={44} height={11} borderRadius={3} style={{ marginTop: 4 }} />
            </div>
            <div className={styles.statBoxDivider} />
            <div className={styles.statBox}>
              <Skeleton width={60} height={20} borderRadius={4} />
              <Skeleton width={55} height={11} borderRadius={3} style={{ marginTop: 4 }} />
            </div>
            <div className={styles.statBoxDivider} />
            <div className={styles.statBox}>
              <Skeleton width={56} height={20} borderRadius={4} />
              <Skeleton width={58} height={11} borderRadius={3} style={{ marginTop: 4 }} />
            </div>
          </div>

          {/* Balanced Action Command Strip (4 buttons: New Order, WhatsApp, Quote, Call) */}
          <div className={styles.actionCommandStrip}>
            <Skeleton width="100%" height={42} borderRadius={12} />
            <Skeleton width="100%" height={42} borderRadius={12} />
            <Skeleton width="100%" height={42} borderRadius={12} />
            <Skeleton width="100%" height={42} borderRadius={12} />
          </div>
        </section>

        {/* ── 2. Segmented Rail Tab Bar (4 tabs: Measurements, Orders, Fabrics, Style Fits) ── */}
        <div className={styles.segmentTabBar} style={{ pointerEvents: 'none' }}>
          <Skeleton width="100%" height={34} borderRadius={9999} />
          <Skeleton width="100%" height={34} borderRadius={9999} />
          <Skeleton width="100%" height={34} borderRadius={9999} />
          <Skeleton width="100%" height={34} borderRadius={9999} />
        </div>
      </div>

      {/* ── 3. Active Tab Content (Measurement Dossier) ── */}
      <div className={styles.tabContent}>
        <section className={styles.measurementDossierCard} style={{ pointerEvents: 'none' }}>
          <div className={styles.dossierHeaderRow}>
            <div className={styles.dossierActionRow}>
              <Skeleton width={72} height={28} borderRadius={9999} />
              <Skeleton width={72} height={28} borderRadius={9999} />
              <Skeleton width={72} height={28} borderRadius={9999} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 14 }}>
            <Skeleton width="100%" height={64} borderRadius={12} />
            <Skeleton width="100%" height={64} borderRadius={12} />
            <Skeleton width="100%" height={64} borderRadius={12} />
            <Skeleton width="100%" height={64} borderRadius={12} />
            <Skeleton width="100%" height={64} borderRadius={12} />
            <Skeleton width="100%" height={64} borderRadius={12} />
          </div>
        </section>
      </div>
    </>
  );
}
