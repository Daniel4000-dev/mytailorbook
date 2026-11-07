'use client';

import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal/Modal';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { logStreakAction } from '@/lib/streakClient';
import { evaluateAtelierBadges, countOnTimeDeliveries, countMeasuredCustomers, type AtelierBadge } from '@/lib/badges';
import StudioStatusCard from '@/components/ui/StudioStatusCard/StudioStatusCard';
import styles from './BadgeCelebrationModal.module.css';

const STORAGE_KEY = 'unlocked_atelier_badge_ids';

export default function BadgeCelebrationModal() {
  const { currentShop, customers, orders, mutate } = useData();
  const { showToast } = useToast();
  const [celebratedBadge, setCelebratedBadge] = useState<AtelierBadge | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isStoryCardOpen, setIsStoryCardOpen] = useState(false);
  const isInitialized = useRef(false);

  const xp = currentShop?.xp || 0;
  const streak = currentShop?.streakCurrent || 0;
  const onTimeCount = countOnTimeDeliveries(orders || []);
  const measuredCount = countMeasuredCustomers(customers || []);
  const fullyPaidCount = (orders || []).filter((o) => {
    const totalPaid = (o.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    return totalPaid >= (o.totalBill || 0);
  }).length;

  useEffect(() => {
    if (!currentShop?.id) return;

    const evaluatedBadges = evaluateAtelierBadges({
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

    const currentlyUnlockedIds = evaluatedBadges.filter((b) => b.unlocked).map((b) => b.id);

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${currentShop.id}`);
      if (!stored) {
        // First session: mark existing unlocked badges as known without bombarding user
        localStorage.setItem(`${STORAGE_KEY}_${currentShop.id}`, JSON.stringify(currentlyUnlockedIds));
        isInitialized.current = true;
        return;
      }

      const knownIds: string[] = JSON.parse(stored);
      // Find new unlocks
      const newlyUnlockedId = currentlyUnlockedIds.find((id) => !knownIds.includes(id));

      if (newlyUnlockedId) {
        const badge = evaluatedBadges.find((b) => b.id === newlyUnlockedId);
        if (badge) {
          // Update cache immediately
          localStorage.setItem(`${STORAGE_KEY}_${currentShop.id}`, JSON.stringify(currentlyUnlockedIds));
          setCelebratedBadge(badge);
          setIsCelebrationOpen(true);

          // Confetti explosion
          try {
            confetti({
              particleCount: 80,
              spread: 75,
              origin: { y: 0.6 },
              colors: ['#F59E0B', '#10B981', '#38BDF8', '#8B5CF6'],
            });
          } catch {
            // ignore
          }

          // Audio chime
          try {
            const audio = new Audio('/sounds/success.wav');
            audio.volume = 0.4;
            audio.play().catch(() => {});
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // LocalStorage quiet fallback
    }
  }, [xp, streak, onTimeCount, measuredCount, fullyPaidCount, currentShop?.id, orders, customers]);

  const handleShareToWhatsApp = () => {
    if (!celebratedBadge) return;
    const shopName = currentShop?.name || 'Our Shop';
    const referralCode = currentShop?.referralCode || APP_CONFIG.name.toUpperCase();

    // Reward daily share points (+15 Pts)
    logStreakAction('shared_status', 15, true).then((res) => {
      if (res?.xp_awarded && res.xp_awarded > 0) {
        showToast(`+${res.xp_awarded} Points earned for sharing your milestone!`, 'success');
        mutate();
      }
    });

    const text = encodeURIComponent(
      `Proud milestone for ${shopName}!\n\n` +
      `We just unlocked the "${celebratedBadge.name}" Badge on ${APP_CONFIG.name}!\n` +
      `Achievement: ${celebratedBadge.tagline}\n\n` +
      `Delivering quality clothes on time for all our customers.\n` +
      `Join with code "${referralCode}" for +100 bonus points: ${APP_CONFIG.baseUrl}`
    );

    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsCelebrationOpen(false);
  };

  const handleOpenStoryCard = () => {
    setIsCelebrationOpen(false);
    setIsStoryCardOpen(true);
  };

  if (!celebratedBadge) return null;

  return (
    <>
      <Modal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        title="Milestone Unlocked!"
      >
        <div className={styles.modalContent}>
          <div className={styles.iconGlowWrapper} style={{ backgroundColor: `${celebratedBadge.iconColor}22`, borderColor: `${celebratedBadge.iconColor}66` }}>
            <Symbol name={celebratedBadge.icon} size={44} style={{ color: celebratedBadge.iconColor, fontVariationSettings: "'FILL' 1" }} />
          </div>

          <span className={styles.celebrationSub}>NEW SHOP BADGE</span>
          <h3 className={styles.badgeTitle}>{celebratedBadge.name}</h3>
          <p className={styles.badgeTagline}>{celebratedBadge.tagline}</p>
          <p className={styles.badgeDesc}>{celebratedBadge.description}</p>

          <div className={styles.rewardCallout}>
            <Symbol name="bolt" size={16} style={{ color: '#F59E0B' }} />
            <span>Post to WhatsApp Status now & earn <strong>+15 bonus points</strong>!</span>
          </div>

          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.whatsappPrimaryBtn}
              onClick={handleShareToWhatsApp}
            >
              <Symbol name="share" size={18} />
              <span>Share on WhatsApp (+15 Pts)</span>
            </button>

            <Button
              variant="outline"
              onClick={handleOpenStoryCard}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Symbol name="download" size={16} />
              <span>View 9:16 Story Card</span>
            </Button>
          </div>
        </div>
      </Modal>

      <StudioStatusCard
        isOpen={isStoryCardOpen}
        onClose={() => setIsStoryCardOpen(false)}
        celebratedBadge={celebratedBadge}
      />
    </>
  );
}
