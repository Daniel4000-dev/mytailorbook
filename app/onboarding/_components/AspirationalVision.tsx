'use client';

import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './AspirationalVision.module.css';

function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AspirationalVision({
  shopName,
  businessMode = 'bespoke',
  onFinish,
}: {
  shopName: string;
  businessMode?: 'bespoke' | 'rtw' | 'hybrid';
  onFinish: () => void;
}) {
  const isRtw = businessMode === 'rtw';
  const isHybrid = businessMode === 'hybrid';

  return (
    <div className={styles.visionContainer}>
      <div className={styles.ambientGlow} />
      <div className={styles.ambientGlowSecondary} />

      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className={styles.messageBox}>
          <div className={styles.monogram}>{getMonogram(shopName)}</div>

          <div className={styles.statusPill}>
            <Symbol name={isRtw || isHybrid ? 'verified' : 'workspace_premium'} size={15} />
            <span>
              {isRtw
                ? 'Showroom Live · Ready-to-Wear'
                : isHybrid
                ? 'Workshop & Showroom Live'
                : 'Workshop Live · Bespoke Tailoring'}
            </span>
          </div>

          <h2 className={styles.title}>
            {isRtw
              ? 'Your Showroom is Ready'
              : isHybrid
              ? 'Your Workshop & Showroom are Ready'
              : 'Your Workshop is Ready'}
          </h2>

          <p className={styles.subtitle}>
            Welcome to <strong>{shopName || 'Your Workshop'}</strong>. Your bespoke management system is active. Here is what is ready for you on Day 1:
          </p>

          <div className={styles.blueprintGrid}>
            <div className={styles.blueprintItem}>
              <div className={styles.blueprintIconBox}>
                <Symbol name="straighten" size={18} />
              </div>
              <div className={styles.blueprintText}>
                <h4>Client Measurement Book</h4>
                <p>Record full client anatomy once — remembered automatically for every future order with 1-tap WhatsApp sharing.</p>
              </div>
            </div>

            <div className={styles.blueprintItem}>
              <div className={styles.blueprintIconBox}>
                <Symbol name="inventory_2" size={18} />
              </div>
              <div className={styles.blueprintText}>
                <h4>Live Production Board</h4>
                <p>Keep your cutting and sewing tables on schedule with clear deadlines and client progress links.</p>
              </div>
            </div>

            <div className={styles.blueprintItem}>
              <div className={styles.blueprintIconBox}>
                <Symbol name="payments" size={18} />
              </div>
              <div className={styles.blueprintText}>
                <h4>Deposit &amp; Balance Control</h4>
                <p>Track cash deposits, outstanding client balances, and settled payments with zero debt slips.</p>
              </div>
            </div>
          </div>

          <button type="button" className={styles.finishBtn} onClick={onFinish}>
            <span>Enter Workshop Dashboard</span>
            <Symbol name="arrow_forward" size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
