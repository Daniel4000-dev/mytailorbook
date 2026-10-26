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
  inProductionCount = 0,
  fittingsTodayCount = 0,
  customersCount = 0,
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

      {/* ── Tier 2: 4×2 Atelier Services Switchboard Grid ── */}
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

          {/* 2. Sewing Production */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.production)}
            aria-label="Sewing Floor & Production Kanban"
          >
            <div className={`${styles.iconWrap} ${styles.iconSewing}`}>
              <Symbol name="precision_manufacturing" size={22} />
              {inProductionCount > 0 && (
                <span className={`${styles.tileBadge} ${styles.tileBadgeNeutral}`}>
                  {inProductionCount}
                </span>
              )}
            </div>
            <span className={styles.tileLabel}>Production</span>
          </button>

          {/* 3. Fittings & Calendar */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.calendar)}
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

          {/* 4. Customer Directory */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.customers)}
            aria-label="Client Directory & Anatomical Measurements"
          >
            <div className={`${styles.iconWrap} ${styles.iconCustomers}`}>
              <Symbol name="group" size={22} />
              {customersCount > 0 && (
                <span className={`${styles.tileBadge} ${styles.tileBadgeNeutral}`}>
                  {customersCount}
                </span>
              )}
            </div>
            <span className={styles.tileLabel}>Customers</span>
          </button>

          {/* 5. Quick Quote */}
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

          {/* 6. Daily Till */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(ROUTES.reconciliation)}
            aria-label="Daily Cash Drawer & POS Reconciliation"
          >
            <div className={`${styles.iconWrap} ${styles.iconTill}`}>
              <Symbol name="point_of_sale" size={22} />
            </div>
            <span className={styles.tileLabel}>Daily Till</span>
          </button>

          {/* 7. Style Catalogues */}
          <button
            type="button"
            className={styles.tile}
            onClick={() => onNavigate('/catalogues')}
            aria-label="Style Lookbooks & VIP Outreach"
          >
            <div className={`${styles.iconWrap} ${styles.iconLookbook}`}>
              <Symbol name="collections_bookmark" size={21} />
            </div>
            <span className={styles.tileLabel}>Catalogues</span>
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
