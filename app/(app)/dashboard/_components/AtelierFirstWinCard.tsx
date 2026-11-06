'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import styles from './AtelierFirstWinCard.module.css';

interface AtelierFirstWinCardProps {
  shopName: string;
  onNavigate: (href: string) => void;
}

export default function AtelierFirstWinCard({
  shopName,
  onNavigate,
}: AtelierFirstWinCardProps) {
  return (
    <div className={styles.card} role="region" aria-label="Shop Quick Launch">
      <div className={styles.pickStitchBorder} aria-hidden="true" />

      <div className={styles.header}>
        <div className={styles.headerTopRow}>
          <span className={styles.badge}>
            <Symbol name="auto_awesome" size={13} />
            <span>Quick Start</span>
          </span>
          <span className={styles.xpBonusPill}>
            <Symbol name="workspace_premium" size={13} />
            <span>Master Tailor · 50 XP Unlocked</span>
          </span>
        </div>

        <h2 className={styles.title}>Welcome to {shopName || 'Your Shop'}</h2>
        <p className={styles.subtitle}>
          Your digital workspace is ready. Take your first craft action to build momentum and start your shop streak:
        </p>
      </div>

      <div className={styles.deck}>
        {/* 1. Primary Action: First Order & Measurements */}
        <button
          type="button"
          className={styles.actionCardHero}
          onClick={() => onNavigate(ROUTES.orderNew)}
          aria-label="Create your first client order"
        >
          <div className={styles.actionLeft}>
            <div className={styles.iconBoxHero}>
              <Symbol name="content_cut" size={22} />
            </div>
            <div className={styles.actionMeta}>
              <div className={styles.actionMetaTop}>
                <h3 className={styles.actionTitleHero}>Create First Order &amp; Measure Client</h3>
                <span className={styles.rewardTag}>
                  <Symbol name="bolt" size={11} />
                  <span>+25 Craft XP</span>
                </span>
              </div>
              <p className={styles.actionDescHero}>
                Record customer body measurements, set a delivery date, and generate a live order tracking link.
              </p>
            </div>
          </div>
          <div className={styles.actionBtnHero}>
            <span>New Order</span>
            <Symbol name="arrow_forward" size={14} />
          </div>
        </button>

        {/* 2. Secondary Action: Build Client Measurement Book */}
        <button
          type="button"
          className={styles.actionCardSecondary}
          onClick={() => onNavigate(ROUTES.customers)}
          aria-label="Add a customer to your measurement book"
        >
          <div className={styles.actionLeft}>
            <div className={styles.iconBoxSecondary}>
              <Symbol name="person_add" size={18} />
            </div>
            <div className={styles.actionMeta}>
              <h3 className={styles.actionTitleSecondary}>Build Your Client Book</h3>
              <p className={styles.actionDescSecondary}>
                Save client phone number and sizing profile once. Never ask for their measurements again.
              </p>
            </div>
          </div>
          <div className={styles.actionBtnSecondary}>
            <span>Add Client</span>
            <Symbol name="arrow_forward" size={12} />
          </div>
        </button>

        {/* 3. Tertiary Action: Cutting Table & Fabrics */}
        <button
          type="button"
          className={styles.actionCardSecondary}
          onClick={() => onNavigate(ROUTES.fabrics)}
          aria-label="Explore the cutting table"
        >
          <div className={styles.actionLeft}>
            <div className={styles.iconBoxSecondary}>
              <Symbol name="checkroom" size={18} />
            </div>
            <div className={styles.actionMeta}>
              <h3 className={styles.actionTitleSecondary}>Cutting Table &amp; Fabrics</h3>
              <p className={styles.actionDescSecondary}>
                Organize material swatches, track fabric arrivals, and assign cuts to your apprentices.
              </p>
            </div>
          </div>
          <div className={styles.actionBtnSecondary}>
            <span>Cutting Table</span>
            <Symbol name="arrow_forward" size={12} />
          </div>
        </button>
      </div>
    </div>
  );
}

