'use client';

import React, { useRef, useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import Modal from '@/components/ui/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import { useData } from '@/contexts/DataContext';
import { getTierForXp } from '@/lib/gamification';
import { evaluateAtelierBadges, countOnTimeDeliveries, countMeasuredCustomers, type AtelierBadge } from '@/lib/badges';
import styles from './StudioStatusCard.module.css';

interface StudioStatusCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudioStatusCard({ isOpen, onClose }: StudioStatusCardProps) {
  const { currentShop, customers, orders } = useData();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const xp = currentShop?.xp || 0;
  const streak = currentShop?.streakCurrent || 0;
  const tier = getTierForXp(xp);
  const shopName = currentShop?.name || 'Bespoke Atelier';

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

      const file = new File([blob], `${shopName.toLowerCase().replace(/\s+/g, '-')}-atelier-status.png`, {
        type: 'image/png',
      });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${shopName} Atelier Status`,
          text: `Proud milestone from ${shopName} on ${APP_CONFIG.name}!`,
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
    const text = encodeURIComponent(
      `Atelier Craft Update — ${shopName}\n\n` +
      `Studio Streak: ${streak} Days Active\n` +
      `Certified Rank: ${tier.name} (${xp.toLocaleString()} Craft XP)\n` +
      `Verified Client Profiles: ${measuredCount}\n` +
      `On-Time Delivery Record: ${onTimeCount} Pieces\n` +
      `Atelier Badges Unlocked: ${unlockedBadges.length} Badges\n\n` +
      `Bespoke precision powered by ${APP_CONFIG.name}.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Atelier Status">
      <div className={styles.container}>
        {/* The 9:16 Story Card Canvas */}
        <div ref={cardRef} className={styles.storyCard}>
          {/* Top Brand Bar */}
          <div className={styles.cardHeader}>
            <div className={styles.brandBadge}>
              <Symbol name="checkroom" size={14} />
              <span>MYSTITCHBOOK ATELIER</span>
            </div>
            <div className={styles.verifiedPill}>
              <Symbol name="verified" size={12} />
              <span>VERIFIED CRAFT</span>
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
                <span className={styles.bentoLabel}>Day Studio Streak</span>
              </div>
            </div>

            <div className={styles.bentoCell}>
              <div className={styles.bentoIcon} style={{ color: '#eab308' }}>
                <Symbol name="bolt" size={20} />
              </div>
              <div className={styles.bentoContent}>
                <span className={styles.bentoNum}>{xp.toLocaleString()}</span>
                <span className={styles.bentoLabel}>Craft XP Points</span>
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
                <span className={styles.bentoLabel}>Client Anatomies</span>
              </div>
            </div>
          </div>

          {/* Unlocked Badges Row */}
          {unlockedBadges.length > 0 && (
            <div className={styles.badgesSection}>
              <span className={styles.badgesTitle}>UNLOCKED ATELIER CRESTS</span>
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

          {/* Card Footer Watermark */}
          <div className={styles.cardFooter}>
            <span>Crafting with discipline on MyStitchBook</span>
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
            {exporting ? 'Generating Card...' : 'Save Story Image'}
          </Button>

          <button
            type="button"
            className={styles.whatsappStatusBtn}
            onClick={handleShareWhatsAppStatus}
            title="Post update to WhatsApp"
          >
            <Symbol name="share" size={18} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

