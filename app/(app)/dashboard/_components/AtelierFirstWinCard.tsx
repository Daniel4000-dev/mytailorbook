'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import { isXpSystemEnabled } from '@/lib/xp';
import styles from './AtelierFirstWinCard.module.css';

interface AtelierFirstWinCardProps {
  shopName: string;
  onNavigate: (href: string) => void;
  businessMode?: 'bespoke' | 'rtw' | 'hybrid';
  shopSlug?: string;
}

export default function AtelierFirstWinCard({
  shopName,
  onNavigate,
  businessMode = 'bespoke',
  shopSlug,
}: AtelierFirstWinCardProps) {
  const xpEnabled = isXpSystemEnabled();

  if (businessMode === 'rtw') {
    return (
      <div className={styles.card} role="region" aria-label="RTW Showroom Quick Launch">
        <div className={styles.pickStitchBorder} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.headerTopRow}>
            <span className={styles.badge}>
              <Symbol name="auto_awesome" size={13} />
              <span>Showroom Launch</span>
            </span>
            <span className={styles.xpBonusPill}>
              <Symbol name={xpEnabled ? 'workspace_premium' : 'verified'} size={13} />
              <span>{xpEnabled ? 'Ready-to-Wear · 50 XP Unlocked' : 'Showroom Ready'}</span>
            </span>
          </div>

          <h2 className={styles.title}>Welcome to {shopName || 'Your Shop'}</h2>
          <p className={styles.subtitle}>
            Your digital showroom and POS counter are ready. Take your first retail action to start stocking your rack:
          </p>
        </div>

        <div className={styles.deck}>
          {/* 1. Primary Action: Stock the Rack */}
          <button
            type="button"
            className={styles.actionCardHero}
            onClick={() => onNavigate(ROUTES.stock)}
            aria-label="Stock your rack with garments and sizes"
          >
            <div className={styles.actionLeft}>
              <div className={styles.iconBoxHero}>
                <Symbol name="storefront" size={22} />
              </div>
              <div className={styles.actionMeta}>
                <div className={styles.actionMetaTop}>
                  <h3 className={styles.actionTitleHero}>Stock Your Rack &amp; Set Prices</h3>
                  <span className={styles.rewardTag}>
                    <Symbol name={xpEnabled ? 'bolt' : 'star'} size={11} />
                    <span>{xpEnabled ? '+25 Craft XP' : 'Step 1'}</span>
                  </span>
                </div>
                <p className={styles.actionDescHero}>
                  Add finished garments (Senator, Agbada, Kaftan) with standard sizes (S, M, L, XL), quantities, and retail prices.
                </p>
              </div>
            </div>
            <div className={styles.actionBtnHero}>
              <span>Add Stock</span>
              <Symbol name="arrow_forward" size={14} />
            </div>
          </button>

          {/* 2. Secondary Action: Open Counter POS */}
          <button
            type="button"
            className={styles.actionCardSecondary}
            onClick={() => onNavigate(ROUTES.stock)}
            aria-label="Open counter POS to record sales"
          >
            <div className={styles.actionLeft}>
              <div className={styles.iconBoxSecondary}>
                <Symbol name="point_of_sale" size={18} />
              </div>
              <div className={styles.actionMeta}>
                <h3 className={styles.actionTitleSecondary}>Sell Off-the-Rack (Counter POS)</h3>
                <p className={styles.actionDescSecondary}>
                  Process 1-tap counter sales with instant cash or transfer receipts and live inventory deduction.
                </p>
              </div>
            </div>
            <div className={styles.actionBtnSecondary}>
              <span>Open POS</span>
              <Symbol name="arrow_forward" size={12} />
            </div>
          </button>

          {/* 3. Tertiary Action: Share Public Showroom */}
          <button
            type="button"
            className={styles.actionCardSecondary}
            onClick={() => onNavigate(shopSlug ? `/catalogue/${shopSlug}?view=rack` : ROUTES.stock)}
            aria-label="View and share your digital showroom floor"
          >
            <div className={styles.actionLeft}>
              <div className={styles.iconBoxSecondary}>
                <Symbol name="checkroom" size={18} />
              </div>
              <div className={styles.actionMeta}>
                <h3 className={styles.actionTitleSecondary}>Share Public Showroom Floor</h3>
                <p className={styles.actionDescSecondary}>
                  Share your live showroom floor on WhatsApp so customers can browse in-stock pieces and style ensembles.
                </p>
              </div>
            </div>
            <div className={styles.actionBtnSecondary}>
              <span>Showroom</span>
              <Symbol name="arrow_forward" size={12} />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (businessMode === 'hybrid') {
    return (
      <div className={styles.card} role="region" aria-label="Hybrid Atelier Quick Launch">
        <div className={styles.pickStitchBorder} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.headerTopRow}>
            <span className={styles.badge}>
              <Symbol name="auto_awesome" size={13} />
              <span>Full Suite Launch</span>
            </span>
            <span className={styles.xpBonusPill}>
              <Symbol name={xpEnabled ? 'workspace_premium' : 'verified'} size={13} />
              <span>{xpEnabled ? 'Hybrid Studio · 50 XP Unlocked' : 'Studio Ready'}</span>
            </span>
          </div>

          <h2 className={styles.title}>Welcome to {shopName || 'Your Shop'}</h2>
          <p className={styles.subtitle}>
            Your bespoke cutting table and ready-to-wear showroom floor are ready. Choose where you want to start:
          </p>
        </div>

        <div className={styles.deck}>
          {/* 1. Primary Action: First Custom Order */}
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
                  <h3 className={styles.actionTitleHero}>Create Custom Order &amp; Measure Client</h3>
                  <span className={styles.rewardTag}>
                    <Symbol name={xpEnabled ? 'bolt' : 'star'} size={11} />
                    <span>{xpEnabled ? '+25 Craft XP' : 'Custom'}</span>
                  </span>
                </div>
                <p className={styles.actionDescHero}>
                  Record bespoke client body measurements, schedule fitting dates, and generate live tracking links.
                </p>
              </div>
            </div>
            <div className={styles.actionBtnHero}>
              <span>New Order</span>
              <Symbol name="arrow_forward" size={14} />
            </div>
          </button>

          {/* 2. Secondary Action: Stock RTW Rack */}
          <button
            type="button"
            className={styles.actionCardSecondary}
            onClick={() => onNavigate(ROUTES.stock)}
            aria-label="Stock your ready-to-wear rack"
          >
            <div className={styles.actionLeft}>
              <div className={styles.iconBoxSecondary}>
                <Symbol name="storefront" size={18} />
              </div>
              <div className={styles.actionMeta}>
                <h3 className={styles.actionTitleSecondary}>Stock Ready-to-Wear Rack</h3>
                <p className={styles.actionDescSecondary}>
                  Add finished off-the-rack pieces with standard sizes (S, M, L, XL) and sell via Counter POS.
                </p>
              </div>
            </div>
            <div className={styles.actionBtnSecondary}>
              <span>Stock Rack</span>
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
                <Symbol name="texture" size={18} />
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
            <Symbol name={xpEnabled ? 'workspace_premium' : 'verified'} size={13} />
            <span>{xpEnabled ? 'Master Tailor · 50 XP Unlocked' : 'Workspace Ready'}</span>
          </span>
        </div>

        <h2 className={styles.title}>Welcome to {shopName || 'Your Shop'}</h2>
        <p className={styles.subtitle}>
          Your digital workspace is ready. Take your first craft action to {xpEnabled ? 'build momentum and start your shop streak:' : 'start managing your shop orders:'}
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
                  <Symbol name={xpEnabled ? 'bolt' : 'star'} size={11} />
                  <span>{xpEnabled ? '+25 Craft XP' : 'Step 1'}</span>
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

