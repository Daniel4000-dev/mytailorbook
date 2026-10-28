'use client';

import { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import MoreServicesSheet from './MoreServicesSheet';
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
  debtorsCount = 0,
  debtTotal = 0,
}: QuickCommandHubProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className={styles.container}>
      {/* ── Tier 1: High-Frequency Master Actions Bar (3 Core Verbs) ── */}
      <div className={styles.masterBar}>
        <button
          type="button"
          className={styles.primaryActionBtn}
          onClick={() => onNavigate(ROUTES.orderNew)}
          aria-label="Create New Bespoke Order"
        >
          <Symbol name="add" size={17} className={styles.btnIcon} />
          <span>New Order</span>
        </button>

        <button
          type="button"
          className={styles.secondaryActionBtn}
          onClick={() => onNavigate(ROUTES.customerNew)}
          aria-label="Measure New Client"
        >
          <Symbol name="straighten" size={16} className={styles.btnIcon} />
          <span>Measure</span>
        </button>

        <button
          type="button"
          className={styles.secondaryActionBtn}
          onClick={() => onNavigate(ROUTES.reconciliation)}
          aria-label="Record Payment or Till Deposit"
        >
          <Symbol name="point_of_sale" size={16} className={styles.btnIcon} />
          <span>Record Till</span>
        </button>
      </div>

      {/* ── Tier 2: 4×2 Strategic Atelier Switchboard Grid ──
          Strictly routes NOT captured on the Bottom Nav (Production, Catalogues, Customers, Settings),
          arranged in strict order of tailor workflow priority:
          Row 1: The Workshop Floor & Client Showcase
          1. Cutting Table (Fabrics awaiting pattern drafting & cutting)
          2. Fittings (Today's client fitting appointments & trials)
          3. Portfolio (Showcase masterworks & public storefront link)
          4. Quick Quote (Rapid price calculations for prospects)
          Row 2: Atelier Finances, Materials & Secondary Tools
          5. Collections (Uncollected balances & debt recovery)
          6. Daily Till (Cash drawer & operational expense tracking)
          7. Inventory (Haberdashery, trims, buttons & notions)
          8. More Tools (Slide-up launcher for Team bench, Stock POS, etc.)
      */}
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

          {/* 2. Fittings & Workshop Calendar */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.calendarWithFilter('fitting'))}
            aria-label="Fittings & Workshop Agenda"
          >
            <div className={`${styles.iconWrap} ${styles.iconFittings}`}>
              <Symbol name="calendar_today" size={21} />
              {fittingsTodayCount > 0 && (
                <span className={styles.tileBadge}>{fittingsTodayCount}</span>
              )}
            </div>
            <span className={styles.tileLabel}>Fittings</span>
          </button>

          {/* 3. Portfolio & Atelier Storefront */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.portfolio)}
            aria-label="Studio Showcase & Public Digital Storefront"
          >
            <div className={`${styles.iconWrap} ${styles.iconPortfolio}`}>
              <Symbol name="photo_library" size={22} />
            </div>
            <span className={styles.tileLabel}>Portfolio</span>
          </button>

          {/* 4. Quick Quote Estimator */}
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

          {/* 5. Collections & Debt Recovery */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.collections)}
            aria-label="Debt Recovery & Client Balances"
          >
            <div className={`${styles.iconWrap} ${styles.iconCollections}`}>
              <Symbol name="account_balance_wallet" size={22} />
              {debtorsCount > 0 && (
                <span className={`${styles.tileBadge} ${styles.tileBadgeDebt}`}>
                  {debtorsCount}
                </span>
              )}
            </div>
            <span className={styles.tileLabel}>Collections</span>
          </button>

          {/* 6. Daily Till & Cash Drawer */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.reconciliation)}
            aria-label="Daily Cash Drawer & Workshop Expenses"
          >
            <div className={`${styles.iconWrap} ${styles.iconTill}`}>
              <Symbol name="point_of_sale" size={22} />
            </div>
            <span className={styles.tileLabel}>Daily Till</span>
          </button>

          {/* 7. Materials & Trims Inventory */}
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

          {/* 8. More Services Launcher */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => setIsMoreOpen(true)}
            aria-label="More Atelier Tools & Secondary Services"
          >
            <div className={`${styles.iconWrap} ${styles.iconMore}`}>
              <Symbol name="apps" size={22} />
            </div>
            <span className={styles.tileLabel}>More Tools</span>
          </button>
        </div>
      </div>

      {/* ── Slide-up Sheet for Secondary Atelier Tools ── */}
      <MoreServicesSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onNavigate={onNavigate}
        debtTotal={debtTotal}
      />
    </div>
  );
}
