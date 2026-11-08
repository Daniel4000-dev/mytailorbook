'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { getChallengeLeaderboardAction, linkStudioBuddyAction } from '@/app/actions';
import { logStreakAction } from '@/lib/streakClient';
import {
  CHALLENGE_TASKS,
  CHALLENGE_GOAL_XP,
  getTierForXp,
  getCurrentMonthlySprint,
} from '@/lib/gamification';
import {
  evaluateAtelierBadges,
  countOnTimeDeliveries,
  countMeasuredCustomers,
  countVerifiedTrackingViews,
  type AtelierBadge,
} from '@/lib/badges';
import StudioStatusCard from '@/components/ui/StudioStatusCard/StudioStatusCard';
import type { ChallengeLeaderboardEntry } from '@/lib/types';
import styles from './ChallengeModal.module.css';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeModal({ isOpen, onClose }: ChallengeModalProps) {
  const { currentShop, customers, orders, refreshShop } = useData();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'grand' | 'sprint' | 'badges' | 'community' | 'tasks'>('grand');
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(1);
  const [machinesRemaining, setMachinesRemaining] = useState<number>(3);
  const [buddyInfo, setBuddyInfo] = useState<{ name: string; avatarUrl?: string; lastActiveAt?: string; streakCount: number } | null>(null);
  const [buddyCodeInput, setBuddyCodeInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStatusCardOpen, setIsStatusCardOpen] = useState(false);
  const [claimedFollow, setClaimedFollow] = useState(false);

  const xp = currentShop?.xp || 0;
  const currentTier = getTierForXp(xp);
  const progressPercent = Math.min(100, (xp / CHALLENGE_GOAL_XP) * 100);
  const isPremium = currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing';

  // Compute live badges with strict on-time tracking, customer counts, and verified tracking link opens
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
    verifiedTrackingViews: countVerifiedTrackingViews(orders || []),
  });

  const gatewayBadgeIds = ['punctual_needle', 'master_tape', 'iron_discipline_30'];
  const gatewayBadges = evaluatedBadges.filter((b) => gatewayBadgeIds.includes(b.id));
  const masterTrophyBadges = evaluatedBadges.filter((b) => !gatewayBadgeIds.includes(b.id));

  // Monthly Sprint data
  const currentMonthlySprint = getCurrentMonthlySprint();
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthlyDeliveredOrders = (orders || []).filter((o) => {
    if (o.status !== 'Delivered') return false;
    const deliveredEntry = (o.statusHistory || []).find((h) => h.to === 'Delivered');
    return deliveredEntry ? deliveredEntry.timestamp >= currentMonthStart : o.updatedAt >= currentMonthStart;
  }).length;
  const monthlyProgressPercent = Math.min(100, Math.round((monthlyDeliveredOrders / currentMonthlySprint.targetDeliveries) * 100));

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

  const handleClaimCommunityFollow = async () => {
    if (claimedFollow) return;
    try {
      const res = await logStreakAction('community_follow', 15, true);
      setClaimedFollow(true);
      showToast('+15 Points earned for joining the StitchBook community!', 'success');
      if (res?.streak_bumped) refreshShop();
    } catch {
      showToast('Welcome to the StitchBook community!', 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Championship & Atelier Badges">
      <div className={styles.container}>
        {/* Grand Prize Header Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerHeader}>
            <span className={styles.grantTitle}>
              <Symbol name="emoji_events" size={18} style={{ color: '#eab308' }} />
              Grand Equipment Grant
            </span>
            <span className={styles.prizeCounter}>
              {machinesRemaining} / 3 Machines Available
            </span>
          </div>
          <h2 className={styles.mainTitle}>Industrial Sewing Machine Grant</h2>
          <p className={styles.subtitle}>
            Awarded to the first 3 verified master tailors to achieve <strong>5,000 Points</strong> and unlock the <strong>3 Gateway Verification Badges</strong>.
          </p>

          <div className={styles.progressSection}>
            <div className={styles.progressTop}>
              <span className={styles.xpScore}>{xp.toLocaleString()} / 5,000 Points</span>
              {isPremium ? (
                <span className={styles.multiplierBadge}>
                  <Symbol name="bolt" size={14} style={{ color: '#ffd700' }} /> 2x Speed Active
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
              <span>Leaderboard Rank: #{userRank}</span>
              <span style={{ color: currentTier.color, fontWeight: 'bold' }}>Rank: {currentTier.name}</span>
            </div>
          </div>
        </div>

        {/* Tab Row */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'grand' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('grand')}
          >
            <Symbol name="emoji_events" size={15} /> 90-Day Grand
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'sprint' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('sprint')}
          >
            <Symbol name="calendar_today" size={15} /> Monthly Sprint
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'badges' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <Symbol name="verified" size={15} /> Badges
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'community' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('community')}
          >
            <Symbol name="share" size={15} /> Flier & Guild
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <Symbol name="checklist" size={15} /> Earn Points
          </button>
        </div>

        {/* TAB 1: 90-Day Grand Championship */}
        {activeTab === 'grand' && (
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Verification Keys Checklist</h3>
              <p className={styles.sectionDesc}>
                To maintain authentic craft and prevent artificial score boosting, winning the Industrial Machine requires unlocking all 3 Gateway Badges:
              </p>
            </div>

            <div className={styles.gatewayGrid}>
              {gatewayBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`${styles.gatewayCard} ${badge.unlocked ? styles.gatewayCardUnlocked : ''}`}
                >
                  <div className={styles.gatewayTop}>
                    <div
                      className={styles.gatewayIcon}
                      style={{ color: badge.unlocked ? badge.iconColor : 'var(--sf-text-secondary)' }}
                    >
                      <Symbol name={badge.icon} size={20} />
                    </div>
                    <span className={badge.unlocked ? styles.badgeUnlockedPill : styles.badgeProgressPill}>
                      {badge.unlocked ? 'Verified ✓' : `${badge.progress} / ${badge.maxProgress}`}
                    </span>
                  </div>
                  <div className={styles.gatewayName}>{badge.name}</div>
                  <div className={styles.gatewayTagline}>{badge.tagline}</div>
                  <div className={styles.badgeProgressBar}>
                    <div
                      className={styles.badgeProgressFill}
                      style={{
                        width: `${(badge.progress / badge.maxProgress) * 100}%`,
                        backgroundColor: badge.unlocked ? badge.iconColor : 'var(--sf-accent-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Leaderboard Table */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                  Active Grand Leaderboard
                </span>
                <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
                  Top contenders
                </span>
              </div>
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--sf-text-secondary)', padding: '16px 0' }}>Loading rankings...</p>
              ) : (
                <div className={styles.leaderboardList}>
                  {leaderboard.slice(0, 5).map((item) => (
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
          </div>
        )}

        {/* TAB 2: Monthly Sprint */}
        {activeTab === 'sprint' && (
          <div className={styles.contentCard}>
            <div className={styles.sprintHero}>
              <div className={styles.sprintMonthBadge}>
                <Symbol name="calendar_today" size={14} />
                Calendar Sprint {currentMonthlySprint.monthIndex + 1} of 12
              </div>
              <h3 className={styles.sprintTitle}>{currentMonthlySprint.name}</h3>
              <p className={styles.sprintTheme}>"{currentMonthlySprint.theme}"</p>
              <p className={styles.sprintFocus}>{currentMonthlySprint.focus}</p>

              <div className={styles.sprintProgressCard}>
                <div className={styles.sprintProgressTop}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    Monthly On-Time Deliveries
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sf-accent-primary)' }}>
                    {monthlyDeliveredOrders} / {currentMonthlySprint.targetDeliveries}
                  </span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${monthlyProgressPercent}%`, background: 'var(--sf-accent-primary)' }}
                  />
                </div>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
                  <span>Sprint Distinction:</span>
                  <span style={{ fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                    {currentMonthlySprint.distinction}
                  </span>
                </div>
              </div>

              <div className={styles.sprintDiscretionNote}>
                <Symbol name="info" size={14} style={{ color: 'var(--sf-text-secondary)', flexShrink: 0 }} />
                <span>
                  Monthly sprints reset automatically on the 1st of every month for a clean slate. Community spotlights and partner perks are awarded at StitchBook's discretion to outstanding ataliers.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Atelier Badges */}
        {activeTab === 'badges' && (
          <div className={styles.contentCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
                  Atelier Badges ({evaluatedBadges.filter((b) => b.unlocked).length} Earned)
                </span>
                <p style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', margin: '2px 0 0 0' }}>
                  Scarce milestones representing verified workshop mastery
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

            {/* Category 1: Gateway Badges */}
            <div className={styles.badgeCategoryTitle}>
              <Symbol name="lock_open" size={14} style={{ color: '#eab308' }} />
              Gateway Verification Keys (90-Day Challenge)
            </div>
            <div className={styles.badgeGrid} style={{ marginBottom: '20px' }}>
              {gatewayBadges.map((b) => (
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

            {/* Category 2: Master Atelier Trophies */}
            <div className={styles.badgeCategoryTitle}>
              <Symbol name="workspace_premium" size={14} style={{ color: '#8b5cf6' }} />
              Master Atelier Trophies (High-Value Milestones)
            </div>
            <div className={styles.badgeGrid}>
              {masterTrophyBadges.map((b) => (
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

        {/* TAB 4: Flier & Community */}
        {activeTab === 'community' && (
          <div className={styles.contentCard}>
            <div className={styles.communitySection}>
              {/* Flier Share Card */}
              <div className={styles.flierCard}>
                <div className={styles.flierHeader}>
                  <div className={styles.flierTitleWrap}>
                    <span className={styles.flierBadgeLabel}>Atelier Promotion</span>
                    <h4 className={styles.flierHeading}>{currentShop?.name || 'Your Workshop'} Story Flier</h4>
                  </div>
                  <Button variant="primary" onClick={() => setIsStatusCardOpen(true)}>
                    <Symbol name="visibility" size={15} /> Preview Flier
                  </Button>
                </div>
                <p className={styles.flierDesc}>
                  Generate a bespoke 9:16 high-resolution status card showing your shop name, rank, badges, and verified craft statistics for WhatsApp Status and Instagram Stories.
                </p>
              </div>

              {/* Official Social Links & Guild */}
              <div className={styles.guildSection}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: 'var(--sf-text-primary)' }}>
                  Join the Master Tailor Guild
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                  Follow StitchBook for tailoring masterclasses, business workshops, feature highlights, and spontaneous artisan equipment grants.
                </p>

                <div className={styles.socialButtonsRow}>
                  <a
                    href="https://instagram.com/mystitchbook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialActionBtn}
                  >
                    <Symbol name="photo_camera" size={16} /> Follow on Instagram
                  </a>
                  <a
                    href="https://chat.whatsapp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialActionBtn}
                  >
                    <Symbol name="chat" size={16} /> WhatsApp Community
                  </a>
                </div>

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className={styles.claimFollowBtn}
                    onClick={handleClaimCommunityFollow}
                    disabled={claimedFollow}
                  >
                    {claimedFollow ? '✓ Follow Verified (+15 XP Claimed)' : 'Confirm I Have Joined (+15 Points)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: How to Earn */}
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

        {/* Tailor Partner Sub-Bar */}
        <div className={styles.referralCard}>
          <div className={styles.refText}>
            <span className={styles.refTitle}>Invite Code: {currentShop?.referralCode || 'STITCH-PRO'}</span>
            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
              Earn +100 Points when a fellow tailor registers their atelier!
            </span>
          </div>
          <button type="button" className={styles.shareRefBtn} onClick={handleShareReferral}>
            <Symbol name="share" size={15} /> WhatsApp Invite
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
