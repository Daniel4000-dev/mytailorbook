'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './QuickCommandHub.module.css';

interface QuickCommandHubProps {
  onNavigate: (href: string) => void;
  uncutFabricsCount?: number;
}

export default function QuickCommandHub({
  onNavigate,
  uncutFabricsCount = 0,
}: QuickCommandHubProps) {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <button
          type="button"
          className={`${styles.tile} ${styles.fabricsTile}`}
          onClick={() => onNavigate('/fabrics')}
          aria-label="Cutting Table"
        >
          {uncutFabricsCount > 0 && (
            <span className={styles.badgeAlert}>
              {uncutFabricsCount} uncut
            </span>
          )}
          <div className={styles.iconWrap}>
            <Symbol name="texture" size={20} />
          </div>
          <span className={styles.tileLabel}>Cutting Table</span>
        </button>

        <button
          type="button"
          className={`${styles.tile} ${styles.quoteTile}`}
          onClick={() => onNavigate('/quotes')}
          aria-label="Quick Quote"
        >
          <div className={styles.iconWrap}>
            <Symbol name="calculate" size={20} />
          </div>
          <span className={styles.tileLabel}>Quick Quote</span>
        </button>

        <button
          type="button"
          className={`${styles.tile} ${styles.tillTile}`}
          onClick={() => onNavigate('/reconciliation')}
          aria-label="Cash Drawer"
        >
          <div className={styles.iconWrap}>
            <Symbol name="point_of_sale" size={20} />
          </div>
          <span className={styles.tileLabel}>Daily Till</span>
        </button>
      </div>
    </div>
  );
}
