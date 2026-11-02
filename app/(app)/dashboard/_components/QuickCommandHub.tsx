'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import styles from './QuickCommandHub.module.css';

interface QuickCommandHubProps {
  onNavigate: (href: string) => void;
  uncutFabricsCount?: number;
  inProductionCount?: number;
  fittingsTodayCount?: number;
  customersCount?: number;
  debtorsCount?: number;
  debtTotal?: number;
}

export default function QuickCommandHub({
  onNavigate,
  uncutFabricsCount = 0,
  fittingsTodayCount = 0,
}: QuickCommandHubProps) {
  return (
    <div className={styles.container}>
      {/* ── Primary Creation Action Bar ── */}
      <div className={styles.masterBar}>
        <button
          type="button"
          className={styles.primaryActionBtn}
          onClick={() => onNavigate(ROUTES.orderNew)}
          aria-label="Create New Order"
        >
          <Symbol name="add" size={19} className={styles.btnIcon} />
          <span>New Order</span>
        </button>

        <button
          type="button"
          className={styles.portfolioActionBtn}
          onClick={() => onNavigate(ROUTES.portfolio)}
          aria-label="View Shop Portfolio"
        >
          <Symbol name="photo_library" size={19} className={styles.btnIcon} />
          <span>Portfolio</span>
        </button>
      </div>

      {/* ── Workshop Switchboard Grid ── */}
      <div className={styles.switchboardCard}>
        <div className={styles.grid}>
          {/* 1. Cutting Table */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.fabrics)}
            aria-label="Cutting Table & Fabric Swatches"
          >
            <div className={`${styles.iconWrap} ${styles.iconCutting}`}>
              <Symbol name="content_cut" size={22} />
              {uncutFabricsCount > 0 && (
                <span className={styles.tileBadge}>{uncutFabricsCount}</span>
              )}
            </div>
            <span className={styles.tileLabel}>Cutting Table</span>
          </button>

          {/* 2. Catalogues & Lookbooks */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate('/catalogues')}
            aria-label="Style Lookbooks & VIP Catalogues"
          >
            <div className={`${styles.iconWrap} ${styles.iconLookbook}`}>
              <Symbol name="collections_bookmark" size={21} />
            </div>
            <span className={styles.tileLabel}>Catalogues</span>
          </button>

          {/* 3. Quick Quote Estimator */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.quotes)}
            aria-label="Quick Price Estimator"
          >
            <div className={`${styles.iconWrap} ${styles.iconQuotes}`}>
              <Symbol name="calculate" size={22} />
            </div>
            <span className={styles.tileLabel}>Quick Quote</span>
          </button>

          {/* 4. Daily Cash Drawer */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.reconciliation)}
            aria-label="Daily Cash Drawer & Expenses"
          >
            <div className={`${styles.iconWrap} ${styles.iconTill}`}>
              <Symbol name="point_of_sale" size={22} />
            </div>
            <span className={styles.tileLabel}>Cash Drawer</span>
          </button>

          {/* 5. Materials & Trims Inventory */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.inventory)}
            aria-label="Haberdashery, Trims & Accessories Inventory"
          >
            <div className={`${styles.iconWrap} ${styles.iconInventory}`}>
              <Symbol name="inventory_2" size={21} />
            </div>
            <span className={styles.tileLabel}>Inventory</span>
          </button>
        </div>
      </div>
    </div>
  );
}
