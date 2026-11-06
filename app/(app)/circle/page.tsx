'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { isXpSystemEnabled } from '@/lib/xp';
import { getWhatsAppLink } from '@/lib/formatters';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';
import {
  getCircleHubDataAction,
  linkStudioBuddyAction,
  unlinkStudioBuddyAction,
  toggleSabbaticalAction,
  sendSewingNudgeAction,
  type CircleHubData,
  type CircleBuddy,
  type PulseActivity,
} from '@/app/actions/circle';

type CategoryFilter = 'all' | 'fulfillment' | 'production' | 'milestone';

interface SaluteState {
  flame: number;
  needle: number;
  respect: number;
  userSaluted: {
    flame?: boolean;
    needle?: boolean;
    respect?: boolean;
  };
}

export default function AtelierCirclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<CircleHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [colleagueCode, setColleagueCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [salutes, setSalutes] = useState<Record<string, SaluteState>>({});

  // Interactive Buddy Profile BottomSheet state
  const [selectedBuddy, setSelectedBuddy] = useState<CircleBuddy | null>(null);
  const [nudging, setNudging] = useState(false);
  const [togglingSabbatical, setTogglingSabbatical] = useState(false);

  // Auto-fill and prompt connect modal if ?connect=CODE is present
  useEffect(() => {
    const qConnect = searchParams.get('connect');
    if (qConnect) {
      setColleagueCode(qConnect.trim().toUpperCase());
      setIsConnectModalOpen(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    const res = await getCircleHubDataAction();
    if (res.data) {
      setData(res.data);
      const initialSalutes: Record<string, SaluteState> = {};
      for (const p of res.data.pulses) {
        initialSalutes[p.id] = {
          flame: p.salutes.flame,
          needle: p.salutes.needle,
          respect: p.salutes.respect,
          userSaluted: {},
        };
      }
      setSalutes(initialSalutes);

      // Keep selectedBuddy in sync if sheet is open
      if (selectedBuddy) {
        const fresh = res.data.buddies.find((b) => b.id === selectedBuddy.id) || null;
        setSelectedBuddy(fresh);
      }
    }
  };

  useEffect(() => {
    if (!isXpSystemEnabled()) {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  const handleSalute = (pulseId: string, type: 'flame' | 'needle' | 'respect') => {
    setSalutes((prev) => {
      const current = prev[pulseId] || {
        flame: 0,
        needle: 0,
        respect: 0,
        userSaluted: {},
      };
      const isAlready = Boolean(current.userSaluted[type]);
      const nextCount = isAlready ? Math.max(0, current[type] - 1) : current[type] + 1;

      return {
        ...prev,
        [pulseId]: {
          ...current,
          [type]: nextCount,
          userSaluted: {
            ...current.userSaluted,
            [type]: !isAlready,
          },
        },
      };
    });
  };

  const handleCopyCode = () => {
    if (!data?.myShop.referralCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/circle?connect=${data.myShop.referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Circle invite link copied!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!data?.myShop.referralCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/circle?connect=${data.myShop.referralCode}`;
    const msg = `Good day! Join my Tailor Circle on MyTailorBook so our workshops can keep our daily production streaks accountable (+15 XP Co-Op craft rewards). Tap this link to connect with me: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleConnectColleague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colleagueCode.trim()) return;
    setLinking(true);
    setLinkStatus(null);

    const res = await linkStudioBuddyAction(colleagueCode);
    if (res.success) {
      setLinkStatus({ success: true, message: `Successfully linked with ${res.buddyName}!` });
      showToast(`Linked with ${res.buddyName} in Tailor Circle!`, 'success');
      setColleagueCode('');
      await loadData();
      setTimeout(() => setIsConnectModalOpen(false), 1200);
    } else {
      setLinkStatus({ success: false, message: res.error || 'Failed to link colleague studio.' });
    }
    setLinking(false);
  };

  const handleSendNudge = async (buddy: CircleBuddy) => {
    setNudging(true);
    try {
      const res = await sendSewingNudgeAction(buddy.id);
      if (res.success) {
        showToast(`Sent sewing nudge to ${buddy.name}!`, 'success');
        if (res.whatsappMessage && buddy.phone) {
          window.open(getWhatsAppLink(buddy.phone, res.whatsappMessage), '_blank');
        }
      } else {
        showToast(res.error || 'Could not send nudge', 'error');
      }
    } catch {
      showToast('Error sending nudge', 'error');
    } finally {
      setNudging(false);
    }
  };

  const handleToggleSabbatical = async (buddy: CircleBuddy) => {
    setTogglingSabbatical(true);
    const nextIsSabbatical = buddy.status !== 'sabbatical';
    try {
      const res = await toggleSabbaticalAction(
        buddy.id,
        nextIsSabbatical,
        nextIsSabbatical ? 'Planned workshop leave' : undefined
      );
      if (res.success) {
        showToast(
          nextIsSabbatical
            ? `${buddy.name} placed on Sabbatical (0 XP earned while away)`
            : `${buddy.name} reactivated in Tailor Circle!`,
          'info'
        );
        await loadData();
      } else {
        showToast(res.error || 'Could not update status', 'error');
      }
    } catch {
      showToast('Error updating sabbatical', 'error');
    } finally {
      setTogglingSabbatical(false);
    }
  };

  const handleUnlinkBuddy = async (buddy: CircleBuddy) => {
    if (!confirm(`Are you sure you want to disconnect ${buddy.name} from your Tailor Circle?`)) return;
    try {
      const res = await unlinkStudioBuddyAction(buddy.id);
      if (res.success) {
        showToast(`Disconnected ${buddy.name} from your circle`, 'info');
        setSelectedBuddy(null);
        await loadData();
      } else {
        showToast(res.error || 'Could not unlink colleague', 'error');
      }
    } catch {
      showToast('Error disconnecting colleague', 'error');
    }
  };

  const filteredPulses = (data?.pulses || []).filter((pulse) => {
    if (activeCategory === 'all') return true;
    return pulse.category === activeCategory;
  });

  const benefits = data?.benefits;

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <Symbol name="arrow_back" size={18} />
          </button>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>Tailor Circle</h1>
            <p className={styles.pageSubtitle}>Peer accountability, workshop streaks & mutual craft support</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.connectBtn}
            onClick={() => setIsConnectModalOpen(true)}
            aria-label="Connect with tailor"
          >
            <Symbol name="group_add" size={16} />
            <span>Connect</span>
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {/* ── 1. Intimacy & Peer Benefits Gauge ── */}
        {benefits && (
          <section className={styles.gaugeCard}>
            <div className={styles.gaugeHeader}>
              <div className={styles.gaugeTitleRow}>
                <span
                  className={`${styles.gaugeTierPill} ${
                    benefits.tierNumber === 1
                      ? styles.gaugeTier1
                      : benefits.tierNumber === 2
                      ? styles.gaugeTier2
                      : styles.gaugeTier3
                  }`}
                >
                  <Symbol name="groups" size={13} />
                  <span>
                    {benefits.tierName} · {benefits.multiplierLabel}
                  </span>
                </span>
              </div>
              <span className={styles.gaugeMemberBadge}>
                {benefits.activeMemberCount} of {benefits.maxRecommended} Active Spots
              </span>
            </div>

            <div className={styles.gaugeProgressBar}>
              <div
                className={`${styles.gaugeProgressFill} ${
                  benefits.tierNumber === 1
                    ? styles.gaugeFillTier1
                    : benefits.tierNumber === 2
                    ? styles.gaugeFillTier2
                    : styles.gaugeFillTier3
                }`}
                style={{
                  width: `${Math.min(100, Math.round((benefits.activeMemberCount / benefits.maxRecommended) * 100))}%`,
                }}
              />
            </div>

            <p className={styles.gaugeDescription}>
              {benefits.tierNumber === 1 && (
                <>
                  Earn <strong>+{benefits.dailyXpRate} XP every day</strong> your pod crafts together. Keeping your circle tight (1–4 artisans) guarantees peak co-op streak power.
                </>
              )}
              {benefits.tierNumber === 2 && (
                <>
                  Circle expanded to {benefits.activeMemberCount} tailors. Peer benefits operate at <strong>+{benefits.dailyXpRate} XP/day</strong> (Craft Cluster rate).
                </>
              )}
              {benefits.tierNumber === 3 && (
                <>
                  Circles with 9+ tailors operate as an informal public directory. Co-op streak points are paused to preserve authentic peer accountability.
                </>
              )}
            </p>

            {benefits.isDormantWarning && (
              <div className={styles.dormantAlertBanner}>
                <div className={styles.dormantAlertText}>
                  <Symbol name="warning" size={14} />
                  <span>
                    {benefits.dormantCount} {benefits.dormantCount === 1 ? 'colleague has' : 'colleagues have'} been quiet for 5+ days. Pod streak is paused.
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.dormantAlertBtn}
                  onClick={() => {
                    const dormant = data?.buddies.find((b) => b.status === 'dormant');
                    if (dormant) setSelectedBuddy(dormant);
                  }}
                >
                  View Member
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── 2. Connected Tailors Horizontal Rail ── */}
        <section className={styles.buddiesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Connected Tailors</h2>
          </div>

          <div className={styles.buddiesScroll}>
            {data?.buddies.map((buddy) => {
              const initials = buddy.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={buddy.id}
                  className={`${styles.buddyCard} ${styles.buddyCardClickable}`}
                  onClick={() => setSelectedBuddy(buddy)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedBuddy(buddy);
                    }
                  }}
                  title={`Tap to view ${buddy.name}'s atelier profile`}
                >
                  <div
                    className={styles.avatarRing}
                    style={{ borderColor: buddy.tierColor }}
                    title={`Tier: ${buddy.tierName}`}
                  >
                    <div className={styles.avatarInner}>
                      {buddy.logoUrl ? (
                        <img src={buddy.logoUrl} alt={buddy.name} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.buddyName} title={buddy.name}>
                    {buddy.isCurrentUser ? 'Your Shop' : buddy.name}
                  </div>

                  <div className={styles.buddyMeta}>
                    <span className={styles.streakPill}>
                      <Symbol name="local_fire_department" size={12} />
                      {buddy.streakCount}d
                    </span>
                  </div>

                  {buddy.status === 'sabbatical' && (
                    <span className={`${styles.buddyStatusPill} ${styles.statusPillSabbatical}`}>
                      Sabbatical
                    </span>
                  )}
                  {buddy.status === 'dormant' && (
                    <span className={`${styles.buddyStatusPill} ${styles.statusPillDormant}`}>
                      Quiet 5d
                    </span>
                  )}
                  {buddy.status === 'active' && !buddy.isCurrentUser && (
                    <span className={`${styles.buddyStatusPill} ${styles.statusPillActive}`}>
                      Active
                    </span>
                  )}
                </div>
              );
            })}

            <button
              className={styles.addBuddyCard}
              onClick={() => setIsConnectModalOpen(true)}
              aria-label="Connect with a tailor"
            >
              <div className={styles.addIconCircle}>
                <Symbol name="group_add" size={18} />
              </div>
              <span className={styles.addBuddyLabel}>Add Tailor</span>
            </button>
          </div>
        </section>

        {/* ── 3. Update Filter Tabs ── */}
        <div className={styles.filterTabs}>
          {(['all', 'fulfillment', 'production', 'milestone'] as CategoryFilter[]).map((tab) => {
            const labels: Record<CategoryFilter, string> = {
              all: 'All Updates',
              fulfillment: 'Delivered',
              production: 'Sewing',
              milestone: 'Milestones',
            };
            const isActive = activeCategory === tab;
            return (
              <button
                key={tab}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveCategory(tab)}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ── 4. Live Workshop Activity Stream ── */}
        <section className={styles.pulseStream}>
          {loading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Loading tailor updates...</p>
            </div>
          ) : filteredPulses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No activity in this category yet</p>
              <p className={styles.emptyText}>
                When your connected tailors finish orders or hit milestones, their verified craft updates will appear here automatically.
              </p>
            </div>
          ) : (
            filteredPulses.map((pulse: PulseActivity) => {
              const currentSalute = salutes[pulse.id] || {
                flame: pulse.salutes.flame,
                needle: pulse.salutes.needle,
                respect: pulse.salutes.respect,
                userSaluted: {},
              };
              const initials = pulse.shopName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <article key={pulse.id} className={styles.pulseCard}>
                  {/* Pulse Header */}
                  <div className={styles.pulseHeader}>
                    <div className={styles.pulseSender}>
                      <div
                        className={styles.senderAvatar}
                        style={{ borderColor: pulse.tierColor }}
                      >
                        <div className={styles.senderAvatarInner}>
                          {initials}
                        </div>
                      </div>
                      <div className={styles.senderInfo}>
                        <div className={styles.senderNameRow}>
                          <span className={styles.senderName}>{pulse.shopName}</span>
                          <Symbol name="check_circle" size={13} style={{ color: 'var(--sf-brand-indigo, #4338ca)' }} />
                        </div>
                        <span className={styles.senderTier}>{pulse.tierName}</span>
                      </div>
                    </div>

                    <div className={styles.pulseBadgeRow}>
                      <span className={styles.pulseBadge}>{pulse.badgeLabel}</span>
                      <span className={styles.pulseTime}>{pulse.timeAgo}</span>
                    </div>
                  </div>

                  {/* Pulse Body */}
                  <div className={styles.pulseBody}>
                    <p className={styles.headline}>{pulse.headline}</p>
                    <p className={styles.subtext}>{pulse.subtext}</p>
                  </div>

                  {/* Pulse Footer - 1-Tap Craft Salutes */}
                  <div className={styles.pulseFooter}>
                    <button
                      type="button"
                      className={`${styles.saluteBtn} ${
                        currentSalute.userSaluted.flame ? styles.saluteBtnActive : ''
                      }`}
                      onClick={() => handleSalute(pulse.id, 'flame')}
                      title="Salute: Craft Fire"
                    >
                      <Symbol name="local_fire_department" size={14} />
                      <span>{currentSalute.flame}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.saluteBtn} ${
                        currentSalute.userSaluted.needle ? styles.saluteBtnActive : ''
                      }`}
                      onClick={() => handleSalute(pulse.id, 'needle')}
                      title="Salute: Precision Cut"
                    >
                      <Symbol name="needle" size={14} />
                      <span>{currentSalute.needle}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.saluteBtn} ${
                        currentSalute.userSaluted.respect ? styles.saluteBtnActive : ''
                      }`}
                      onClick={() => handleSalute(pulse.id, 'respect')}
                      title="Salute: Atelier Respect"
                    >
                      <Symbol name="handshake" size={14} />
                      <span>{currentSalute.respect}</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {/* ── 5. Interactive Atelier Buddy Profile Sheet ── */}
      <BottomSheet
        isOpen={Boolean(selectedBuddy)}
        onClose={() => setSelectedBuddy(null)}
        title="Atelier Profile"
      >
        {selectedBuddy && (
          <div className={styles.profileModalBody}>
            {/* Hero / Avatar & Name */}
            <div className={styles.profileHero}>
              <div
                className={styles.profileAvatarRing}
                style={{ borderColor: selectedBuddy.tierColor }}
              >
                <div className={styles.profileAvatarInner}>
                  {selectedBuddy.logoUrl ? (
                    <img src={selectedBuddy.logoUrl} alt={selectedBuddy.name} />
                  ) : (
                    <span>
                      {selectedBuddy.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.profileDetails}>
                <div className={styles.profileNameRow}>
                  <h3 className={styles.profileName}>
                    {selectedBuddy.isCurrentUser ? 'Your Workshop' : selectedBuddy.name}
                  </h3>
                  <Symbol name="check_circle" size={15} style={{ color: 'var(--sf-brand-indigo, #4338ca)' }} />
                </div>
                {(selectedBuddy.city || selectedBuddy.address) && (
                  <span className={styles.profileLocation}>
                    <Symbol name="location_on" size={13} />
                    <span>{selectedBuddy.city || selectedBuddy.address}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Specialties Tags */}
            {selectedBuddy.specialties && selectedBuddy.specialties.length > 0 && (
              <div className={styles.profileSpecialtiesRow}>
                {selectedBuddy.specialties.map((spec, idx) => (
                  <span key={idx} className={styles.profileSpecialtyTag}>
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className={styles.profileStatsGrid}>
              <div className={styles.profileStatBox}>
                <span className={styles.profileStatVal}>{selectedBuddy.streakCount}d</span>
                <span className={styles.profileStatLbl}>Streak</span>
              </div>
              <div className={styles.profileStatBox}>
                <span className={styles.profileStatVal} style={{ color: selectedBuddy.tierColor }}>
                  {selectedBuddy.tierName.split(' ')[0]}
                </span>
                <span className={styles.profileStatLbl}>Tier</span>
              </div>
              <div className={styles.profileStatBox}>
                <span className={styles.profileStatVal}>
                  {selectedBuddy.status === 'sabbatical'
                    ? 'Leave'
                    : selectedBuddy.status === 'dormant'
                    ? 'Quiet'
                    : 'Active'}
                </span>
                <span className={styles.profileStatLbl}>Status</span>
              </div>
            </div>

            {/* Sabbatical Status Notice */}
            {selectedBuddy.status === 'sabbatical' && (
              <div className={styles.profileSabbaticalNotice}>
                <strong>On Sabbatical:</strong> This workshop is temporarily on leave
                {selectedBuddy.sabbaticalReason ? ` (${selectedBuddy.sabbaticalReason})` : ''}.
                They earn 0 XP during leave to protect fair co-op streaks. They will resume immediately upon their next craft action.
              </div>
            )}

            {/* Primary Action Buttons */}
            {!selectedBuddy.isCurrentUser && (
              <div className={styles.profilePrimaryActions}>
                {selectedBuddy.phone && (
                  <a
                    href={`https://wa.me/${selectedBuddy.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.profileWhatsAppBtn}
                  >
                    <WhatsappIcon size={16} />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  className={styles.profileNudgeBtn}
                  disabled={nudging}
                  onClick={() => handleSendNudge(selectedBuddy)}
                >
                  <Symbol name="local_fire_department" size={16} />
                  <span>{nudging ? 'Nudging...' : 'Send Nudge'}</span>
                </button>
              </div>
            )}

            {/* Secondary Actions */}
            <div className={styles.profileSecondaryActions}>
              {selectedBuddy.slug && (
                <Link
                  href={`/studio/${selectedBuddy.slug}`}
                  target="_blank"
                  className={styles.lookbookLinkBtn}
                >
                  <span>Browse Workshop Lookbook</span>
                  <Symbol name="collections_bookmark" size={14} />
                </Link>
              )}

              <button
                type="button"
                className={styles.profileSabbaticalToggleBtn}
                disabled={togglingSabbatical}
                onClick={() => handleToggleSabbatical(selectedBuddy)}
              >
                {selectedBuddy.status === 'sabbatical'
                  ? 'Reactivate (End Sabbatical)'
                  : 'Place on Sabbatical (Bench Temporarily)'}
              </button>

              {!selectedBuddy.isCurrentUser && (
                <button
                  type="button"
                  className={styles.profileUnlinkBtn}
                  onClick={() => handleUnlinkBuddy(selectedBuddy)}
                >
                  Disconnect from Circle
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ── 6. Connect Colleague Modal Sheet ── */}
      {isConnectModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsConnectModalOpen(false);
          }}
        >
          <div className={styles.modalSheet} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Connect with a Tailor</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsConnectModalOpen(false)}
                aria-label="Close"
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            {/* Section 1: User's Studio Code & Shareable Link */}
            <div className={styles.codeBox}>
              <span className={styles.codeLabel}>Your 1-Tap Invite Link</span>
              <span className={styles.codeValue}>
                {data?.myShop.referralCode || 'GENERATING...'}
              </span>

              <div className={styles.shareActionsRow}>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                  onClick={handleCopyCode}
                >
                  <Symbol name="content_copy" size={15} />
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={handleShareWhatsApp}
                >
                  <Symbol name="share" size={15} />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Section 2: Enter Colleague's Code */}
            <form onSubmit={handleConnectColleague} className={styles.inputSection}>
              <label htmlFor="colleagueCode" className={styles.inputLabel}>
                Enter a Tailor&#39;s Invite Code
              </label>
              <div className={styles.inputRow}>
                <input
                  id="colleagueCode"
                  type="text"
                  placeholder="e.g. STITCH-7F2A9B"
                  value={colleagueCode}
                  onChange={(e) => setColleagueCode(e.target.value.toUpperCase())}
                  className={styles.textInput}
                />
                <button
                  type="submit"
                  disabled={linking || !colleagueCode.trim()}
                  className={styles.connectSubmitBtn}
                >
                  {linking ? 'Linking...' : 'Connect'}
                </button>
              </div>

              {linkStatus && (
                <div
                  className={`${styles.statusMessage} ${
                    linkStatus.success ? styles.statusSuccess : styles.statusError
                  }`}
                >
                  {linkStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
