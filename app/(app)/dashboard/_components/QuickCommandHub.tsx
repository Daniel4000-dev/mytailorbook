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
  businessMode?: 'bespoke' | 'rtw' | 'hybrid';
  shopSlug?: string;
  stockCount?: number;
}

export default function QuickCommandHub({
  onNavigate,
  uncutFabricsCount = 0,
  businessMode = 'bespoke',
  shopSlug,
  stockCount = 0,
}: QuickCommandHubProps) {
  const showroomUrl = shopSlug ? `/catalogue/${shopSlug}?view=rack` : ROUTES.stock;

  return (
    <div className={styles.container}>
      {/* ── Primary Creation Action Bar ── */}
      <div className={styles.masterBar}>
        {businessMode === 'rtw' ? (
          <>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => onNavigate(ROUTES.stock)}
              aria-label="Stock Rack and Counter POS"
            >
              <Symbol name="storefront" size={19} className={styles.btnIcon} />
              <span>Stock / POS</span>
            </button>

            <button
              type="button"
              className={styles.portfolioActionBtn}
              onClick={() => onNavigate(showroomUrl)}
              aria-label="View Public Showroom Floor"
            >
              <Symbol name="checkroom" size={19} className={styles.btnIcon} />
              <span>Showroom</span>
            </button>
          </>
        ) : businessMode === 'hybrid' ? (
          <>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => onNavigate(ROUTES.orderNew)}
              aria-label="Create New Custom Order"
            >
              <Symbol name="add" size={19} className={styles.btnIcon} />
              <span>New Order</span>
            </button>

            <button
              type="button"
              className={styles.portfolioActionBtn}
              onClick={() => onNavigate(ROUTES.stock)}
              aria-label="Manage Stock and Counter POS"
            >
              <Symbol name="storefront" size={19} className={styles.btnIcon} />
              <span>Stock / POS</span>
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* ── Workshop Switchboard Grid (Balanced 6-Tile Layout) ── */}
      <div className={styles.switchboardCard}>
        <div className={styles.grid}>
          {businessMode === 'rtw' ? (
            /* 1. RTW: Stock Rack & POS */
            <button
              type="button"
              className={styles.tile}
              onClick={() => onNavigate(ROUTES.stock)}
              aria-label="Ready-to-Wear Stock Rack & POS"
            >
              <div className={`${styles.iconWrap} ${styles.iconLookbook}`}>
                <Symbol name="storefront" size={22} />
                {stockCount > 0 && (
                  <span className={styles.tileBadge}>{stockCount}</span>
                )}
              </div>
              <span className={styles.tileLabel}>Rack / POS</span>
            </button>
          ) : (
            /* 1. Bespoke & Hybrid: Cutting Table */
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
          )}

          {businessMode === 'hybrid' ? (
            /* 2. Hybrid: Stock Rack */
            <button
              type="button"
              className={styles.tile}
              onClick={() => onNavigate(ROUTES.stock)}
              aria-label="Ready-to-Wear Stock Rack"
            >
              <div className={`${styles.iconWrap} ${styles.iconLookbook}`}>
                <Symbol name="storefront" size={21} />
                {stockCount > 0 && (
                  <span className={styles.tileBadge}>{stockCount}</span>
                )}
              </div>
              <span className={styles.tileLabel}>Stock Rack</span>
            </button>
          ) : (
            /* 2. Bespoke & RTW: Catalogues & Lookbooks */
            <button
              type="button"
              className={styles.tile}
              onClick={() => onNavigate(ROUTES.catalogues)}
              aria-label="Style Lookbooks & VIP Catalogues"
            >
              <div className={`${styles.iconWrap} ${styles.iconLookbook}`}>
                <Symbol name="collections_bookmark" size={21} />
              </div>
              <span className={styles.tileLabel}>Catalogues</span>
            </button>
          )}

          {/* 3. Materials & Trims Inventory */}
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

          {/* 4. Shop Expenses & Register */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.reconciliation)}
            aria-label="Daily Shop Expenses & Fuel"
          >
            <div className={`${styles.iconWrap} ${styles.iconExpenses}`}>
              <Symbol name="receipt_long" size={22} />
            </div>
            <span className={styles.tileLabel}>Shop Expenses</span>
          </button>

          {/* 5. Workshop Notes */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.notes)}
            aria-label="Workshop Tasks, Market List & Craft Notes"
          >
            <div className={`${styles.iconWrap} ${styles.iconNotes}`}>
              <Symbol name="notes" size={22} />
            </div>
            <span className={styles.tileLabel}>Notes</span>
          </button>

          {/* 6. Quick Quote Estimator */}
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
        </div>
      </div>
    </div>
  );
}
