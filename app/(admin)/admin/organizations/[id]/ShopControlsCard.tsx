'use client';

import { useState, useTransition } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import {
  updateShopBusinessModeAction,
  grantCompedSubscriptionAction,
  revokeSubscriptionAction,
  updateShopStreakAction,
} from './actions';
import styles from './ShopControlsCard.module.css';

interface ShopData {
  id: string;
  name: string;
  slug: string | null;
  isPrimary: boolean;
  businessMode: 'bespoke' | 'rtw' | 'hybrid' | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  currentPeriodEnd: string | null;
  graceExpiresAt: string | null;
  streakCurrent: number;
  streakBest: number;
  streakFreezes: number;
  xp: number;
  createdAt: string | null;
}

interface ShopControlsCardProps {
  orgId: string;
  shop: ShopData;
}

type TabType = 'mode' | 'subscription' | 'streak';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ShopControlsCard({ orgId, shop }: ShopControlsCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('mode');
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom comp form state
  const [showCustomComp, setShowCustomComp] = useState(false);
  const [compPlan, setCompPlan] = useState('growth');
  const [compDays, setCompDays] = useState(30);
  const [compReason, setCompReason] = useState('VIP Tailor Onboarding');

  // Streak adjustment form state
  const [showStreakEdit, setShowStreakEdit] = useState(false);
  const [targetStreak, setTargetStreak] = useState(shop.streakCurrent);
  const [targetBest, setTargetBest] = useState(shop.streakBest);
  const [targetFreezes, setTargetFreezes] = useState(shop.streakFreezes);
  const [bonusXp, setBonusXp] = useState(0);
  const [streakNote, setStreakNote] = useState('');

  const currentMode = shop.businessMode || 'bespoke';
  const isCompedActive = shop.subscriptionStatus === 'active';

  function handleModeChange(newMode: 'bespoke' | 'rtw' | 'hybrid') {
    if (newMode === currentMode || isPending) return;
    setBanner(null);

    startTransition(async () => {
      const res = await updateShopBusinessModeAction({
        shopId: shop.id,
        orgId,
        mode: newMode,
      });

      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Mode updated successfully.' });
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to update mode.' });
      }
    });
  }

  function handleQuickGrant(days: number) {
    if (isPending) return;
    setBanner(null);

    startTransition(async () => {
      const res = await grantCompedSubscriptionAction({
        shopId: shop.id,
        orgId,
        plan: 'growth',
        durationDays: days,
        reason: `Quick grant of ${days} days VIP access`,
      });

      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Subscription extended.' });
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to grant subscription.' });
      }
    });
  }

  function handleCustomCompSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setBanner(null);

    startTransition(async () => {
      const res = await grantCompedSubscriptionAction({
        shopId: shop.id,
        orgId,
        plan: compPlan,
        durationDays: Number(compDays) || 30,
        reason: compReason.trim() || 'Custom VIP Grant',
      });

      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Subscription granted.' });
        setShowCustomComp(false);
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to grant subscription.' });
      }
    });
  }

  function handleRevertToFree() {
    if (isPending) return;
    const confirm = window.confirm(`Are you sure you want to revert "${shop.name}" back to the Free plan?`);
    if (!confirm) return;

    setBanner(null);
    startTransition(async () => {
      const res = await revokeSubscriptionAction({
        shopId: shop.id,
        orgId,
        reason: 'Admin manual demotion to Free tier',
      });

      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Reverted to Free tier.' });
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to revert.' });
      }
    });
  }

  function handleStreakSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setBanner(null);

    startTransition(async () => {
      const res = await updateShopStreakAction({
        shopId: shop.id,
        orgId,
        streakCurrent: Number(targetStreak) || 0,
        streakBest: Number(targetBest) || 0,
        streakFreezes: Number(targetFreezes) || 0,
        bonusXp: Number(bonusXp) || 0,
        note: streakNote.trim() || undefined,
      });

      if (res.success) {
        setBanner({ type: 'success', text: res.message || 'Streak updated.' });
        setShowStreakEdit(false);
      } else {
        setBanner({ type: 'error', text: res.error || 'Failed to update streak.' });
      }
    });
  }

  return (
    <div className={styles.card}>
      {/* ── Shop Header ── */}
      <div className={styles.header}>
        <div className={styles.shopInfo}>
          <div className={styles.shopTitleRow}>
            <h3 className={styles.shopName}>{shop.name}</h3>
            {shop.isPrimary && <span className={styles.primaryPill}>Main Branch</span>}
            {shop.slug && <span className={styles.slugChip}>/{shop.slug}</span>}
          </div>
          <span className={styles.shopMeta}>
            Registered {formatDate(shop.createdAt)} · ID: <code>{shop.id.slice(0, 8)}…</code>
          </span>
        </div>

        <div className={styles.badgesRow}>
          <span
            className={`${styles.modeBadge} ${
              currentMode === 'rtw'
                ? styles.modeRtw
                : currentMode === 'hybrid'
                ? styles.modeHybrid
                : styles.modeBespoke
            }`}
          >
            <Symbol name={currentMode === 'rtw' ? 'checkroom' : currentMode === 'hybrid' ? 'hub' : 'straighten'} size={14} />
            {currentMode === 'rtw' ? 'Ready-to-Wear' : currentMode === 'hybrid' ? 'Hybrid' : 'Bespoke'}
          </span>

          <span
            className={`${styles.subBadge} ${
              shop.subscriptionStatus === 'active'
                ? styles.subActive
                : shop.subscriptionStatus === 'past_due'
                ? styles.subPastDue
                : styles.subFree
            }`}
          >
            {shop.subscriptionStatus === 'active'
              ? `Active ${shop.subscriptionPlan ? `(${shop.subscriptionPlan.toUpperCase()})` : ''}`
              : shop.subscriptionStatus === 'past_due'
              ? 'Past Due'
              : 'Free Plan'}
          </span>
        </div>
      </div>

      {/* ── Status Feedback Banner ── */}
      {banner && (
        <div className={`${styles.feedbackBanner} ${banner.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
          <Symbol name={banner.type === 'success' ? 'check_circle' : 'error'} size={16} />
          <span>{banner.text}</span>
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div className={styles.tabNav}>
        <button
          type="button"
          onClick={() => setActiveTab('mode')}
          className={`${styles.tabBtn} ${activeTab === 'mode' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="tune" size={14} />
          <span>Operating Mode</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subscription')}
          className={`${styles.tabBtn} ${activeTab === 'subscription' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="verified" size={14} />
          <span>Subscription & VIP Grants</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('streak')}
          className={`${styles.tabBtn} ${activeTab === 'streak' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="local_fire_department" size={14} />
          <span>Daily Streak & Stats</span>
        </button>
      </div>

      {/* ── TAB 1: Operating Mode Switcher ── */}
      {activeTab === 'mode' && (
        <div className={styles.panel}>
          <div>
            <h4 className={styles.panelTitle}>Shop Workflow & Operating Mode</h4>
            <p className={styles.panelDesc}>
              Control which tools this tailor sees. Changes reflect instantly inside their shop app.
            </p>
          </div>

          <div className={styles.modeGrid}>
            {/* Bespoke Option */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleModeChange('bespoke')}
              className={`${styles.modeOption} ${currentMode === 'bespoke' ? styles.modeOptionSelected : ''}`}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeOptionTitle}>Bespoke (Custom Fit)</span>
                {currentMode === 'bespoke' && <span className={`${styles.modeBadgeTag} ${styles.modeBespoke}`}>Active</span>}
              </div>
              <p className={styles.modeOptionDetail}>
                Custom tailor workflow: individual client measurements, fabric cuts, fitting dates, and stage milestones.
              </p>
            </button>

            {/* Ready-to-Wear Option */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleModeChange('rtw')}
              className={`${styles.modeOption} ${currentMode === 'rtw' ? styles.modeOptionSelected : ''}`}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeOptionTitle}>Ready-to-Wear (RTW)</span>
                {currentMode === 'rtw' && <span className={`${styles.modeBadgeTag} ${styles.modeRtw}`}>Active</span>}
              </div>
              <p className={styles.modeOptionDetail}>
                Standard apparel production: size variants (S/M/L/XL), bulk batch runs, and rack inventory tracking.
              </p>
            </button>

            {/* Hybrid Option */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleModeChange('hybrid')}
              className={`${styles.modeOption} ${currentMode === 'hybrid' ? styles.modeOptionSelected : ''}`}
            >
              <div className={styles.modeHeader}>
                <span className={styles.modeOptionTitle}>Hybrid (Both Combined)</span>
                {currentMode === 'hybrid' && <span className={`${styles.modeBadgeTag} ${styles.modeHybrid}`}>Active</span>}
              </div>
              <p className={styles.modeOptionDetail}>
                Full-featured fashion business: sew custom made-to-measure orders alongside ready-to-wear collections.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: Subscription & VIP Comping ── */}
      {activeTab === 'subscription' && (
        <div className={styles.panel}>
          <div>
            <h4 className={styles.panelTitle}>VIP Premium Comping & Overrides</h4>
            <p className={styles.panelDesc}>
              Grant complimentary VIP access, test periods, or sponsor this shop without requiring Paystack billing.
            </p>
          </div>

          <div className={styles.subSummaryBox}>
            <div className={styles.subSummaryDetails}>
              <span className={styles.subSummaryLabel}>Current Plan Status</span>
              <span className={styles.subSummaryValue}>
                {shop.subscriptionStatus === 'active'
                  ? `Active ${shop.subscriptionPlan ? `(${shop.subscriptionPlan.toUpperCase()})` : 'Premium'}`
                  : shop.subscriptionStatus === 'past_due'
                  ? 'Past Due / In Grace Period'
                  : 'Free Tier'}
              </span>
            </div>
            <div className={styles.subSummaryDetails}>
              <span className={styles.subSummaryLabel}>Valid Through</span>
              <span className={styles.subSummaryValue}>
                {formatDate(shop.currentPeriodEnd)}
              </span>
            </div>

            <div className={styles.quickGrantRow}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleQuickGrant(30)}
                className={styles.quickGrantBtn}
              >
                <Symbol name="add_circle" size={14} />
                <span>+30 Days VIP</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleQuickGrant(90)}
                className={styles.quickGrantBtn}
              >
                <Symbol name="star" size={14} />
                <span>+90 Days Quarter</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleQuickGrant(365)}
                className={styles.quickGrantBtn}
              >
                <Symbol name="workspace_premium" size={14} />
                <span>+365 Days 1-Yr</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowCustomComp(!showCustomComp)}
                className={styles.quickGrantBtn}
              >
                <Symbol name="calendar_today" size={14} />
                <span>{showCustomComp ? 'Cancel' : 'Custom'}</span>
              </button>

              {isCompedActive && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRevertToFree}
                  className={`${styles.quickGrantBtn} ${styles.revertBtn}`}
                >
                  <Symbol name="close" size={14} />
                  <span>Revert to Free</span>
                </button>
              )}
            </div>
          </div>

          {showCustomComp && (
            <form onSubmit={handleCustomCompSubmit} className={styles.customGrantForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Plan</label>
                  <select
                    className={styles.formSelect}
                    value={compPlan}
                    onChange={(e) => setCompPlan(e.target.value)}
                  >
                    <option value="growth">Growth (Most Popular)</option>
                    <option value="pro">Pro (Multi-Branch)</option>
                    <option value="starter">Starter</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Days to Grant</label>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    className={styles.formInput}
                    value={compDays}
                    onChange={(e) => setCompDays(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reason / Internal Note</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={compReason}
                    onChange={(e) => setCompReason(e.target.value)}
                    placeholder="e.g. VIP tailor partnership, beta prize"
                  />
                </div>
              </div>

              <button type="submit" disabled={isPending} className={styles.actionBtn}>
                {isPending ? 'Applying Override…' : 'Apply VIP Grant'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── TAB 3: Daily Streak & Stats ── */}
      {activeTab === 'streak' && (
        <div className={styles.panel}>
          <div>
            <h4 className={styles.panelTitle}>Daily Streak & Resilience Doctor</h4>
            <p className={styles.panelDesc}>
              Tailors build streaks by recording orders and delivering garments daily. If a streak broke due to connectivity, you can restore it here.
            </p>
          </div>

          <div className={styles.streakStrip}>
            <div className={styles.streakItem}>
              <span className={styles.streakItemLabel}>Current Streak</span>
              <span className={styles.streakItemValue}>
                🔥 {shop.streakCurrent} {shop.streakCurrent === 1 ? 'day' : 'days'}
              </span>
            </div>

            <div className={styles.streakItem}>
              <span className={styles.streakItemLabel}>All-Time Best</span>
              <span className={styles.streakItemValue}>
                🏆 {shop.streakBest} days
              </span>
            </div>

            <div className={styles.streakItem}>
              <span className={styles.streakItemLabel}>Streak Freezes</span>
              <span className={styles.streakItemValue}>
                ❄️ {shop.streakFreezes} left
              </span>
            </div>

            <div className={styles.streakItem}>
              <span className={styles.streakItemLabel}>Experience Points</span>
              <span className={styles.streakItemValue}>
                ⚡ {shop.xp} XP
              </span>
            </div>
          </div>

          {!showStreakEdit ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setTargetStreak(shop.streakCurrent);
                setTargetBest(shop.streakBest);
                setTargetFreezes(shop.streakFreezes);
                setBonusXp(0);
                setShowStreakEdit(true);
              }}
              className={styles.quickGrantBtn}
            >
              <Symbol name="build" size={14} />
              <span>Adjust Streak or Add Freezes</span>
            </button>
          ) : (
            <form onSubmit={handleStreakSubmit} className={styles.streakForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Streak (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    className={styles.formInput}
                    value={targetStreak}
                    onChange={(e) => setTargetStreak(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Best Streak (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    className={styles.formInput}
                    value={targetBest}
                    onChange={(e) => setTargetBest(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Streak Freezes</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className={styles.formInput}
                    value={targetFreezes}
                    onChange={(e) => setTargetFreezes(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Add Bonus XP</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="50"
                    className={styles.formInput}
                    value={bonusXp}
                    onChange={(e) => setBonusXp(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>Reason / Internal Note</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={streakNote}
                    onChange={(e) => setStreakNote(e.target.value)}
                    placeholder="e.g. Restored streak after network downtime"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="submit" disabled={isPending} className={styles.actionBtn}>
                  {isPending ? 'Saving…' : 'Save Adjustments'}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowStreakEdit(false)}
                  className={styles.quickGrantBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
