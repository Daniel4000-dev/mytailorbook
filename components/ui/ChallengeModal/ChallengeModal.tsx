'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import { useData } from '@/contexts/DataContext';
import { getChallengeLeaderboardAction, linkStudioBuddyAction } from '@/app/actions';
import { CHALLENGE_TASKS, CHALLENGE_GOAL_XP, getTierForXp } from '@/lib/gamification';
import { evaluateAtelierBadges, countOnTimeDeliveries, countMeasuredCustomers, type AtelierBadge } from '@/lib/badges';
import StudioStatusCard from '@/components/ui/StudioStatusCard/StudioStatusCard';
import type { ChallengeLeaderboardEntry } from '@/lib/types';
import styles from './ChallengeModal.module.css';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeModal({ isOpen, onClose }: ChallengeModalProps) {
  const { currentShop, customers, orders } = useData();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'buddy' | 'tasks'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(1);
  const [machinesRemaining, setMachinesRemaining] = useState<number>(3);
  const [buddyInfo, setBuddyInfo] = useState<{ name: string; avatarUrl?: string; lastActiveAt?: string; streakCount: number } | null>(null);
  const [buddyCodeInput, setBuddyCodeInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStatusCardOpen, setIsStatusCardOpen] = useState(false);

  const xp = currentShop?.xp || 0;
  const currentTier = getTierForXp(xp);
  const progressPercent = Math.min(100, (xp / CHALLENGE_GOAL_XP) * 100);
  const isPremium = currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing';

  // Compute live badges with strict on-time tracking & measured customer count
  const evaluatedBadges = evaluateAtelierBadges({
    xp,
    streakCurrent: currentShop?.streakCurrent || 0,
    streakBest: currentShop?.streakBest || 0,
    totalCustomers: countMeasuredCustomers(customers || []),
    totalOrders: orders?.length || 0,
    ordersDelivered: orders?.filter((o) => o.status === 'Delivered').length || 0,
    fullyPaidOrders: orders?.filter((o) => {
      const totalPaid = (o.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      return totalPaid >= (o.totalBill || 0);
    }).length || 0,
    onTimeDeliveries: countOnTimeDeliveries(orders || []),
    restDaysUsed: currentShop?.restDaysUsedThisWeek || 0,
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getChallengeLeaderboardAction().then((res) => {
        setLoading(false);
        if (res && !('error' in res)) {
          setLeaderboard(res.leaderboard || []);
          setUserRank(res.userRank || 1);
          setMachinesRemaining(res.machinesRemaining ?? 3);
          if (res.buddyInfo) {
            setBuddyInfo(res.buddyInfo);
          }
        }
      });
    }
  }, [isOpen]);

  const handleLinkBuddy = async () => {
    if (!buddyCodeInput.trim()) return;
    setLinkError(null);
    setLinkSuccess(null);
    const res = await linkStudioBuddyAction(buddyCodeInput);
    if (res?.error) {
      setLinkError(res.error);
    } else if (res?.success) {
      setLinkSuccess(`Successfully linked with ${res.buddyName}!`);
      setBuddyInfo({
        name: res.buddyName,
        streakCount: 0,
      });
      setBuddyCodeInput('');
    }
  };

  const handleShareReferral = () => {
    const code = currentShop?.referralCode || APP_CONFIG.name.toUpperCase();
    const text = encodeURIComponent(
      `Hello my friend! Join me on ${APP_CONFIG.name} to organize customer measurements and orders. They are giving out 3 Industrial Sewing Machines to active tailors right now! Sign up with my shop code "${code}" so we both get +100 bonus points: ${APP_CONFIG.baseUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareBadge = (badge: AtelierBadge) => {
    const shopName = currentShop?.name || 'Our Shop';
    const text = encodeURIComponent(
      `Proud milestone for ${shopName}!\n\nWe just unlocked the "${badge.name}" Badge on ${APP_CONFIG.name}!\n\nWhat it means: ${badge.tagline}\nShop Rank: ${currentTier.name} (${xp.toLocaleString()} Points)\n\nDelivering quality clothes on time for our customers.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNudgeBuddy = () => {
    if (!buddyInfo) return;
    const text = encodeURIComponent(
      `Good day my friend! I have updated my orders on ${APP_CONFIG.name} today. Update your cutting or sewing so our Tailor Partner streak continues and we both get +15 bonus points!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sewing Machine Challenge">
      <div className={styles.container}>
        {/* Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerHeader}>
            <span className={styles.grantTitle}>
              <Symbol name="emoji_events" size={18} style={{ color: '#eab308' }} />
              Tailor Machine Giveaway
            </span>
            <span className={styles.prizeCounter}>
              {machinesRemaining} / 3 Machines Left
            </span>
          </div>
          <h2 className={styles.mainTitle}>Master Tailor Challenge</h2>
          <p className={styles.subtitle}>
            The first 3 tailors to reach 5,000 Points win an Industrial Sewing Machine!
            Every measurement, cut, payment, and delivery brings you closer.
          </p>

          <div className={styles.progressSection}>
            <div className={styles.progressTop}>
              <span className={styles.xpScore}>{xp.toLocaleString()} / 5,000 Points</span>
              {isPremium ? (
                <span className={styles.multiplierBadge}>
                  <Symbol name="bolt" size={14} style={{ color: '#ffd700' }} /> 2x Double Points Active
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                  Upgrade for 2x Points
                </span>
              )}
            </div>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
              <span>Your Rank: #{userRank}</span>
              <span style={{ color: currentTier.color, fontWeight: 'bold' }}>Rank: {currentTier.name}</span>
            </div>
          </div>
        </div>

        {/* Tab Row */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'leaderboard' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Symbol name="leaderboard" size={16} /> Ranks
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'badges' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <Symbol name="emoji_events" size={16} /> Badges
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'buddy' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('buddy')}
          >
            <Symbol name="group" size={16} /> Tailor Partner
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <Symbol name="checklist" size={16} /> How to Earn
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'leaderboard' && (
          <div className={styles.contentCard}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--sf-text-secondary)', padding: '24px 0' }}>Loading rankings...</p>
            ) : (
              <div className={styles.leaderboardList}>
                {leaderboard.map((item) => (
                  <div
                    key={item.shopId}
                    className={`${styles.leaderboardRow} ${item.isCurrentUser ? styles.leaderboardRowCurrent : ''}`}
                  >
                    <span className={`${styles.rankBadge} ${item.rank === 1 ? styles.rankTop1 : item.rank === 2 ? styles.rankTop2 : item.rank === 3 ? styles.rankTop3 : ''}`}>
                      {item.rank}
                    </span>
                    <img
                      src={item.avatarUrl || '/images/logo.png'}
                      alt={item.shopName}
                      className={styles.shopAvatar}
                      onError={(e) => { e.currentTarget.src = '/images/logo.png'; }}
                    />
                    <div className={styles.shopInfo}>
                      <span className={styles.shopName}>
                        {item.shopName} {item.isCurrentUser && '(You)'}
                      </span>
                      <span className={styles.shopTier} style={{ color: item.tierColor }}>
                        <Symbol name={item.tierIcon} size={13} style={{ fontVariationSettings: "'FILL' 1" }} />
                        {item.tierName}
                      </span>
                    </div>
                    <span className={styles.shopXp}>{item.xp.toLocaleString()} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className={styles.contentCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
                  Shop Badges ({evaluatedBadges.filter((b) => b.unlocked).length} Unlocked)
                </span>
                <p style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', margin: '2px 0 0 0' }}>
                  Milestones that prove your reliability to customers
                </p>
              </div>
              <button
                type="button"
                className={styles.shareRefBtn}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setIsStatusCardOpen(true)}
              >
                <Symbol name="share" size={14} /> Story Card
              </button>
            </div>
            <div className={styles.badgeGrid}>
              {evaluatedBadges.map((b) => (
                <div
                  key={b.id}
                  className={`${styles.badgeCard} ${b.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked}`}
                >
                  <div
                    className={styles.badgeIconWrap}
                    style={{
                      background: b.unlocked ? `${b.iconColor}22` : 'var(--sf-border-light)',
                      color: b.unlocked ? b.iconColor : 'var(--sf-text-secondary)',
                      border: b.unlocked ? `1px solid ${b.iconColor}55` : '1px solid var(--sf-border-light)',
                    }}
                  >
                    <Symbol name={b.icon} size={22} style={{ fontVariationSettings: b.unlocked ? "'FILL' 1" : "'FILL' 0" }} />
                  </div>
                  <div className={styles.badgeInfo}>
                    <div className={styles.badgeHeader}>
                      <span className={styles.badgeName}>{b.name}</span>
                      {b.unlocked ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={styles.badgeUnlockedPill}>Unlocked</span>
                          <button
                            type="button"
                            className={styles.shareBadgeBtn}
                            onClick={() => handleShareBadge(b)}
                            title="Share on WhatsApp Status"
                          >
                            <Symbol name="share" size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className={styles.badgeProgressPill}>
                          {b.progress}/{b.maxProgress}
                        </span>
                      )}
                    </div>
                    <p className={styles.badgeTagline}>{b.tagline}</p>
                    <div className={styles.badgeProgressBar}>
                      <div
                        className={styles.badgeProgressFill}
                        style={{
                          width: `${(b.progress / b.maxProgress) * 100}%`,
                          backgroundColor: b.unlocked ? b.iconColor : 'var(--sf-accent-primary)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'buddy' && (
          <div className={styles.contentCard}>
            <div className={styles.buddySection}>
              {buddyInfo ? (
                <div className={styles.linkedBuddyCard}>
                  <div className={styles.buddyFlame}>
                    <FlameIcon size={32} />
                    <span>{buddyInfo.streakCount} Days</span>
                  </div>
                  <div className={styles.buddyDetails}>
                    <div className={styles.buddyTitle}>{buddyInfo.name}</div>
                    <div className={styles.buddyStatus}>
                      Linked Tailor Partner. You both earn +15 bonus points when both active today!
                    </div>
                  </div>
                  <button type="button" className={styles.nudgeBtn} onClick={handleNudgeBuddy}>
                    <Symbol name="chat" size={16} /> Remind
                  </button>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Connect with a Tailor Friend</h4>
                  <p style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Connect with a fellow tailor friend. When you both record cutting or sewing on the same day, you both earn an extra +15 bonus points!
                  </p>
                  <div className={styles.linkBuddyForm}>
                    <input
                      type="text"
                      className={styles.codeInput}
                      placeholder="ENTER TAILOR INVITE CODE"
                      value={buddyCodeInput}
                      onChange={(e) => setBuddyCodeInput(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleLinkBuddy}>Link Partner</Button>
                  </div>
                  {linkError && <p style={{ color: 'var(--sf-error)', fontSize: '12px', marginTop: '6px' }}>{linkError}</p>}
                  {linkSuccess && <p style={{ color: 'var(--sf-success)', fontSize: '12px', marginTop: '6px' }}>{linkSuccess}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className={styles.contentCard}>
            <div className={styles.taskList}>
              {CHALLENGE_TASKS.map((task) => (
                <div key={task.id} className={styles.taskItem}>
                  <div className={styles.taskLeft}>
                    <div className={styles.taskIconWrap}>
                      <Symbol name={task.icon} size={18} />
                    </div>
                    <div className={styles.taskInfo}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <span className={styles.taskDesc}>{task.description}</span>
                    </div>
                  </div>
                  <span className={styles.taskBadge}>+{task.xpReward} Pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viral Referral Banner */}
        <div className={styles.referralCard}>
          <div className={styles.refText}>
            <span className={styles.refTitle}>Your Shop Invite Code</span>
            <span className={styles.refCode}>{currentShop?.referralCode || 'STITCH-PRO'}</span>
            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
              Earn +100 Points when a tailor joins & records their first order!
            </span>
          </div>
          <button type="button" className={styles.shareRefBtn} onClick={handleShareReferral}>
            <Symbol name="share" size={16} /> Share on WhatsApp
          </button>
        </div>
      </div>

      <StudioStatusCard
        isOpen={isStatusCardOpen}
        onClose={() => setIsStatusCardOpen(false)}
      />
    </Modal>
  );
}
