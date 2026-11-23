'use client';

import React, { useRef, useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import Modal from '@/components/ui/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { logStreakAction } from '@/lib/streakClient';
import { getTierForXp } from '@/lib/gamification';
import { evaluateAtelierBadges, countOnTimeDeliveries, countMeasuredCustomers, type AtelierBadge } from '@/lib/badges';
import styles from './StudioStatusCard.module.css';

interface StudioStatusCardProps {
  isOpen: boolean;
  onClose: () => void;
  celebratedBadge?: AtelierBadge | null;
}

export default function StudioStatusCard({ isOpen, onClose, celebratedBadge }: StudioStatusCardProps) {
  const { currentShop, customers, orders, refreshShop } = useData();
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const xp = currentShop?.xp || 0;
  const streak = currentShop?.streakCurrent || 0;
  const tier = getTierForXp(xp);
  const shopName = currentShop?.name || 'Tailor Studio';
  const referralCode = currentShop?.referralCode || APP_CONFIG.name.toUpperCase();

  const onTimeCount = countOnTimeDeliveries(orders || []);
  const measuredCount = countMeasuredCustomers(customers || []);
  const fullyPaidCount = (orders || []).filter((o) => {
    const totalPaid = (o.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    return totalPaid >= (o.totalBill || 0);
  }).length;

  const badges = evaluateAtelierBadges({
    xp,
    streakCurrent: streak,
    streakBest: currentShop?.streakBest || streak,
    totalCustomers: measuredCount,
    totalOrders: orders?.length || 0,
    ordersDelivered: orders?.filter((o) => o.status === 'Delivered').length || 0,
    fullyPaidOrders: fullyPaidCount,
    onTimeDeliveries: onTimeCount,
    restDaysUsed: currentShop?.restDaysUsedThisWeek || 0,
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);

  const rewardDailyShare = async () => {
    try {
      const res = await logStreakAction('shared_status', 15, true);
      if (res?.xp_awarded && res.xp_awarded > 0) {
        showToast(`+${res.xp_awarded} Points earned for sharing your shop status!`, 'success');
        refreshShop();
      }
    } catch {
      // quiet fallback
    }
  };

  const handleExportImage = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);

    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#0F172A',
      });

      if (!blob) throw new Error('Export failed');

      const file = new File([blob], `${shopName.toLowerCase().replace(/\s+/g, '-')}-status.png`, {
        type: 'image/png',
      });

      // Award daily share points
      rewardDailyShare();

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${shopName} Status`,
          text: `Proud milestone from ${shopName} on ${APP_CONFIG.name}! Join with code ${referralCode} for +100 bonus points: ${APP_CONFIG.baseUrl}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopName.toLowerCase().replace(/\s+/g, '-')}-status.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Failed to export status card:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleShareWhatsAppStatus = () => {
    // Award daily share points
    rewardDailyShare();

    const badgeLine = celebratedBadge
      ? `🏆 Just Unlocked: "${celebratedBadge.name}" Badge!\n\n`
      : `Badges Unlocked: ${unlockedBadges.length} Badges\n\n`;

    const text = encodeURIComponent(
      `Tailor Shop Update — ${shopName}\n\n` +
      `Active Streak: ${streak} Days Working 🔥\n` +
      `Shop Rank: ${tier.name} (${xp.toLocaleString()} Points)\n` +
      `Customers Measured: ${measuredCount}\n` +
      `On-Time Deliveries: ${onTimeCount} Clothes\n` +
      badgeLine +
      `Join with my invite code "${referralCode}" for +100 bonus points on ${APP_CONFIG.name}: ${APP_CONFIG.baseUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Shop Status">
      <div className={styles.container}>
        {celebratedBadge && (
          <div className={styles.celebrationBanner}>
            <div className={styles.celebrationIcon}>
              <Symbol name="emoji_events" size={24} style={{ color: '#F59E0B' }} />
            </div>
            <div className={styles.celebrationText}>
              <div className={styles.celebrationTitle}>
                🎉 Badge Unlocked: {celebratedBadge.name}!
              </div>
              <div className={styles.celebrationSubtitle}>
                Post your story card to WhatsApp to show customers & claim <strong>+15 Points</strong>!
              </div>
            </div>
          </div>
        )}

        {/* The 9:16 Story Card Canvas */}
        <div ref={cardRef} className={styles.storyCard}>
          {/* Top Brand Bar */}
          <div className={styles.cardHeader}>
            <div className={styles.brandBadge}>
              <Symbol name="checkroom" size={14} />
              <span>MYSTITCHBOOK TAILOR</span>
            </div>
            <div className={styles.verifiedPill}>
              <Symbol name="verified" size={12} />
              <span>VERIFIED TAILOR</span>
            </div>
          </div>

          {/* Studio Profile */}
          <div className={styles.studioHero}>
            <div className={styles.studioMonogram} style={{ borderColor: tier.color }}>
              {shopName.charAt(0).toUpperCase()}
            </div>
            <h3 className={styles.studioName}>{shopName}</h3>
            <div
              className={styles.tierPill}
              style={{
                backgroundColor: `${tier.color}22`,
                color: tier.color,
                border: `1px solid ${tier.color}66`,
              }}
            >
              <Symbol name="workspace_premium" size={13} />
              <span>{tier.name}</span>
            </div>
          </div>

          {/* Stats Bento Grid */}
          <div className={styles.statsBento}>
            <div className={styles.bentoCell}>
              <div className={styles.bentoIcon}>
                <FlameIcon size={20} />
              </div>
              <div className={styles.bentoContent}>
                <span className={styles.bentoNum}>{streak}</span>
                <span className={styles.bentoLabel}>Days Working Streak</span>
              </div>
            </div>

            <div className={styles.bentoCell}>
              <div className={styles.bentoIcon} style={{ color: '#eab308' }}>
                <Symbol name="bolt" size={20} />
              </div>
              <div className={styles.bentoContent}>
                <span className={styles.bentoNum}>{xp.toLocaleString()}</span>
                <span className={styles.bentoLabel}>Shop Points</span>
              </div>
            </div>

            <div className={styles.bentoCell}>
              <div className={styles.bentoIcon} style={{ color: '#10b981' }}>
                <Symbol name="verified" size={20} />
              </div>
              <div className={styles.bentoContent}>
                <span className={styles.bentoNum}>{onTimeCount}</span>
                <span className={styles.bentoLabel}>On-Time Deliveries</span>
              </div>
            </div>

            <div className={styles.bentoCell}>
              <div className={styles.bentoIcon} style={{ color: '#6366f1' }}>
                <Symbol name="straighten" size={20} />
              </div>
              <div className={styles.bentoContent}>
                <span className={styles.bentoNum}>{measuredCount}</span>
                <span className={styles.bentoLabel}>Customers Measured</span>
              </div>
            </div>
          </div>

          {/* Unlocked Badges Row */}
          {unlockedBadges.length > 0 && (
            <div className={styles.badgesSection}>
              <span className={styles.badgesTitle}>UNLOCKED BADGES</span>
              <div className={styles.badgeRow}>
                {unlockedBadges.slice(0, 4).map((b) => (
                  <div key={b.id} className={styles.badgeItem} title={b.name}>
                    <div
                      className={styles.badgeIcon}
                      style={{
                        backgroundColor: `${b.iconColor}22`,
                        color: b.iconColor,
                        border: `1px solid ${b.iconColor}55`,
                      }}
                    >
                      <Symbol name={b.icon} size={18} />
                    </div>
                    <span className={styles.badgeLabel}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viral Invite Code Banner on Card */}
          <div className={styles.inviteBanner}>
            <div className={styles.inviteCodePill}>
              <Symbol name="share" size={12} />
              <span>INVITE CODE: <strong>{referralCode}</strong></span>
            </div>
            <span className={styles.inviteSubtext}>
              +100 Bonus Points on mystitchbook.com
            </span>
          </div>

          {/* Card Footer Watermark */}
          <div className={styles.cardFooter}>
            <span>Sewing quality clothes on time with MyStitchBook</span>
            <span className={styles.watermarkTag}>mystitchbook.com</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          <Button
            variant="primary"
            onClick={handleExportImage}
            disabled={exporting}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Symbol name="download" size={18} />
            {exporting ? 'Generating Card...' : 'Save Story (+15 Pts)'}
          </Button>

          <button
            type="button"
            className={styles.whatsappStatusBtn}
            onClick={handleShareWhatsAppStatus}
            title="Post update to WhatsApp"
          >
            <Symbol name="share" size={18} />
            <span>WhatsApp (+15 Pts)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

