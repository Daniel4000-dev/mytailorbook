'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import { useData } from '@/contexts/DataContext';
import { getChallengeLeaderboardAction, linkStudioBuddyAction } from '@/app/actions';
import { CHALLENGE_TASKS, CHALLENGE_GOAL_XP, getTierForXp } from '@/lib/gamification';
import type { ChallengeLeaderboardEntry } from '@/lib/types';
import styles from './ChallengeModal.module.css';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeModal({ isOpen, onClose }: ChallengeModalProps) {
  const { currentShop } = useData();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'buddy' | 'tasks'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(1);
  const [machinesRemaining, setMachinesRemaining] = useState<number>(3);
  const [buddyInfo, setBuddyInfo] = useState<{ name: string; avatarUrl?: string; lastActiveAt?: string; streakCount: number } | null>(null);
  const [buddyCodeInput, setBuddyCodeInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const xp = currentShop?.xp || 0;
  const currentTier = getTierForXp(xp);
  const progressPercent = Math.min(100, (xp / CHALLENGE_GOAL_XP) * 100);
  const isPremium = currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing';

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
    const code = currentShop?.referralCode || 'MYSTITCHBOOK';
    const text = encodeURIComponent(
      `Hello colleague! Join me on MyStitchBook to organize customer measurements and orders. They are giving out 3 Industrial Direct-Drive Sewing Machines to top active designers right now! Sign up with my studio code "${code}" so we both earn +100 bonus Craft Points: https://mystitchbook.com`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNudgeBuddy = () => {
    if (!buddyInfo) return;
    const text = encodeURIComponent(
      `Good day colleague! My studio has completed our orders on MyStitchBook today. Update your cutting and sewing on the app so our Co-Op Buddy Streak continues and we earn +15 bonus points!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equipment Grant Challenge">
      <div className={styles.container}>
        {/* Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerHeader}>
            <span className={styles.grantTitle}>
              <Symbol name="emoji_events" size={18} style={{ color: '#eab308' }} />
              Annual Equipment Grant
            </span>
            <span className={styles.prizeCounter}>
              {machinesRemaining} / 3 Machines Left
            </span>
          </div>
          <h2 className={styles.mainTitle}>Master Tailor Challenge</h2>
          <p className={styles.subtitle}>
            First 3 designers to reach 5,000 Craft Points win an Industrial Sewing Machine! 
            Every verified measurement, cut, payment, and delivery moves you closer.
          </p>

          <div className={styles.progressSection}>
            <div className={styles.progressTop}>
              <span className={styles.xpScore}>{xp.toLocaleString()} / 5,000 XP</span>
              {isPremium ? (
                <span className={styles.multiplierBadge}>
                  <Symbol name="bolt" size={14} style={{ color: '#ffd700' }} /> 2x Double XP Active
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                  Upgrade for 2x XP
                </span>
              )}
            </div>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
              <span>Your Rank: #{userRank}</span>
              <span style={{ color: currentTier.color, fontWeight: 'bold' }}>Tier: {currentTier.name}</span>
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
            <Symbol name="leaderboard" size={16} /> Leaderboard
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'buddy' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('buddy')}
          >
            <Symbol name="group" size={16} /> Studio Buddy
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
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
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
                      Linked Studio Partner. You both earn +15 bonus XP when both active today!
                    </div>
                  </div>
                  <button type="button" className={styles.nudgeBtn} onClick={handleNudgeBuddy}>
                    <Symbol name="chat" size={16} /> Nudge
                  </button>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Link with a Studio Colleague</h4>
                  <p style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Connect with a tailor friend. When you both finish cutting or sewing on the same day, you both earn an extra +15 Co-Op Craft Points!
                  </p>
                  <div className={styles.linkBuddyForm}>
                    <input
                      type="text"
                      className={styles.codeInput}
                      placeholder="ENTER COLLEAGUE CODE"
                      value={buddyCodeInput}
                      onChange={(e) => setBuddyCodeInput(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleLinkBuddy}>Link Studio</Button>
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
                  <span className={styles.taskBadge}>+{task.xpReward} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viral Referral Banner */}
        <div className={styles.referralCard}>
          <div className={styles.refText}>
            <span className={styles.refTitle}>Your Studio Referral Code</span>
            <span className={styles.refCode}>{currentShop?.referralCode || 'STITCH-PRO'}</span>
            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
              Earn +100 XP when a colleague joins & logs their 1st real order!
            </span>
          </div>
          <button type="button" className={styles.shareRefBtn} onClick={handleShareReferral}>
            <Symbol name="share" size={16} /> Share on WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
}
