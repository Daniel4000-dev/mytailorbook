'use client';

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';
import {
  getCircleHubDataAction,
  linkStudioBuddyAction,
  unlinkStudioBuddyAction,
  toggleSabbaticalAction,
  sendSewingNudgeAction,
  searchColleaguesAction,
  sendCircleRequestAction,
  acceptCircleRequestAction,
  declineCircleRequestAction,
  cancelCircleRequestAction,
  type CircleHubData,
  type CircleBuddy,
  type PulseActivity,
  type SearchedColleague,
  type CircleRequest,
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

function AtelierCircleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<CircleHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [salutes, setSalutes] = useState<Record<string, SaluteState>>({});

  // Interactive Buddy Profile BottomSheet state
  const [selectedBuddy, setSelectedBuddy] = useState<CircleBuddy | null>(null);
  const [nudging, setNudging] = useState(false);
  const [togglingSabbatical, setTogglingSabbatical] = useState(false);

  // Colleague Directory Search & Handshake states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedColleague[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

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
            ? `${buddy.name} placed on Sabbatical (streaks paused while away)`
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

  // Search colleague workshops with 300ms debounce
  useEffect(() => {
    if (!isConnectModalOpen) return;
    const clean = searchQuery.trim().replace(/^@/, '');
    if (clean.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchColleaguesAction(clean);
        if (res.data) {
          setSearchResults(res.data);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isConnectModalOpen]);

  const handleSendCircleRequest = async (colleague: SearchedColleague) => {
    setActionLoadingId(colleague.id);
    try {
      const res = await sendCircleRequestAction(colleague.id);
      if (res.success) {
        showToast(`Invitation sent to ${colleague.name}!`, 'success');
        setSearchResults((prev) =>
          prev.map((c) =>
            c.id === colleague.id
              ? { ...c, connectionStatus: 'request_sent', requestId: res.requestId }
              : c
          )
        );
        await loadData();
      } else {
        showToast(res.error || 'Failed to send request', 'error');
      }
    } catch {
      showToast('Error sending invitation', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelCircleRequest = async (requestId: string, colleagueId: string) => {
    setActionLoadingId(colleagueId);
    try {
      const res = await cancelCircleRequestAction(requestId);
      if (res.success) {
        showToast('Invitation cancelled', 'info');
        setSearchResults((prev) =>
          prev.map((c) =>
            c.id === colleagueId
              ? { ...c, connectionStatus: 'can_connect', requestId: undefined }
              : c
          )
        );
        await loadData();
      } else {
        showToast(res.error || 'Could not cancel', 'error');
      }
    } catch {
      showToast('Error cancelling request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setRespondingRequestId(requestId);
    try {
      const res = await acceptCircleRequestAction(requestId);
      if (res.success) {
        showToast('Circle Invitation Accepted! You are now connected.', 'success');
        await loadData();
      } else {
        showToast(res.error || 'Could not accept invitation', 'error');
      }
    } catch {
      showToast('Error accepting invitation', 'error');
    } finally {
      setRespondingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setRespondingRequestId(requestId);
    try {
      const res = await declineCircleRequestAction(requestId);
      if (res.success) {
        showToast('Invitation declined', 'info');
        await loadData();
      } else {
        showToast(res.error || 'Could not decline invitation', 'error');
      }
    } catch {
      showToast('Error declining invitation', 'error');
    } finally {
      setRespondingRequestId(null);
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
        {/* ── Pending Circle Handshake Invitations Banner ── */}
        {data?.incomingRequests && data.incomingRequests.length > 0 && (
          <section className={styles.incomingSection}>
            <div className={styles.incomingHeader}>
              <div className={styles.incomingTitleRow}>
                <Symbol name="handshake" size={16} />
                <h3 className={styles.incomingTitle}>
                  Circle Handshake Invitations ({data.incomingRequests.length})
                </h3>
              </div>
              <span className={styles.incomingSubtitle}>
                Colleagues who want to link workshop streaks and production accountability with you
              </span>
            </div>

            <div className={styles.incomingList}>
              {data.incomingRequests.map((req) => (
                <div key={req.id} className={styles.incomingCard}>
                  <div className={styles.incomingCardLeft}>
                    <div className={styles.incomingAvatar}>
                      {req.senderLogoUrl ? (
                        <img src={req.senderLogoUrl} alt={req.senderShopName} className={styles.incomingAvatarImg} />
                      ) : (
                        <span>{req.senderShopName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.incomingShopInfo}>
                      <span className={styles.incomingShopName}>{req.senderShopName}</span>
                      <span className={styles.incomingShopMeta}>
                        {req.senderShopSlug ? `@${req.senderShopSlug} · ` : ''}
                        {req.senderStreakCount > 0 ? `${req.senderStreakCount}d streak · ` : ''}
                        <span style={{ color: req.senderTierColor }}>{req.senderTierName}</span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.incomingActions}>
                    <button
                      type="button"
                      className={styles.incomingAcceptBtn}
                      disabled={respondingRequestId === req.id}
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      <Symbol name="check" size={14} />
                      <span>{respondingRequestId === req.id ? 'Accepting...' : 'Accept'}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.incomingDeclineBtn}
                      disabled={respondingRequestId === req.id}
                      onClick={() => handleDeclineRequest(req.id)}
                    >
                      <Symbol name="close" size={14} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 1. Intimacy & Peer Benefits Gauge ── */}
        {benefits && (
          <section className={styles.gaugeCard}>
            <div className={styles.gaugeHeader}>
              <div className={styles.gaugeTitleRow}>
                <span
                  className={`${styles.gaugeTierPill} ${benefits.tierNumber === 1
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
                {benefits.activeMemberCount > 1 ? 'Co-Op Streak Active' : 'Accountability Pod'}
              </span>
            </div>

            {/* Visual 4-Node Pod Gauge */}
            <div className={styles.podNodesRow}>
              <div className={styles.nodesList}>
                {[0, 1, 2, 3].map((nodeIdx) => {
                  const isFilled = nodeIdx < benefits.activeMemberCount;
                  return (
                    <div
                      key={nodeIdx}
                      className={`${styles.podNode} ${isFilled ? styles.podNodeFilled : styles.podNodeEmpty
                        }`}
                      title={isFilled ? `Spot ${nodeIdx + 1}: Active Artisan` : `Spot ${nodeIdx + 1}: Available`}
                    >
                      {isFilled ? (
                        <Symbol name="check" size={12} />
                      ) : (
                        <span className={styles.podNodeDot} />
                      )}
                    </div>
                  );
                })}
              </div>
              <span className={styles.podNodesSubtitle}>
                {benefits.activeMemberCount} of {benefits.maxRecommended} Artisans Active in Pod
              </span>
            </div>

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
              const todayStr = new Date().toISOString().split('T')[0];
              const isTodayActive = Boolean(
                buddy.status === 'active' &&
                buddy.lastActiveAt &&
                buddy.lastActiveAt.startsWith(todayStr)
              );

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
                  title={`Tap to view ${buddy.name}'s tailor profile`}
                >
                  <div
                    className={`${styles.avatarRing} ${isTodayActive ? styles.avatarRingActive : ''
                      }`}
                    style={{ borderColor: isTodayActive ? '#10B981' : buddy.tierColor }}
                    title={`Tier: ${buddy.tierName}${isTodayActive ? ' · Active Today' : ''}`}
                  >
                    <div className={styles.avatarInner}>
                      {buddy.logoUrl ? (
                        <img src={buddy.logoUrl} alt={buddy.name} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    {isTodayActive && (
                      <span className={styles.todayCraftDot} title="Crafting Today" />
                    )}
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
                      className={`${styles.saluteBtn} ${currentSalute.userSaluted.flame ? styles.saluteBtnActive : ''
                        }`}
                      onClick={() => handleSalute(pulse.id, 'flame')}
                      title="Salute: Craft Fire"
                    >
                      <Symbol name="local_fire_department" size={14} />
                      <span>{currentSalute.flame}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.saluteBtn} ${currentSalute.userSaluted.needle ? styles.saluteBtnActive : ''
                        }`}
                      onClick={() => handleSalute(pulse.id, 'needle')}
                      title="Salute: Precision Cut"
                    >
                      <Symbol name="needle" size={14} />
                      <span>{currentSalute.needle}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.saluteBtn} ${currentSalute.userSaluted.respect ? styles.saluteBtnActive : ''
                        }`}
                      onClick={() => handleSalute(pulse.id, 'respect')}
                      title="Salute: Tailor Respect"
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
        title="Tailor Profile"
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
                Streaks are paused during leave to protect fair co-op consistency. They will resume immediately upon their next craft action.
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
              <div className={styles.modalHeaderTitleBlock}>
                <h3 className={styles.modalTitle}>Connect with a Colleague</h3>
                <p className={styles.modalSubtitleText}>
                  Find peer tailoring workshops by name, @username, or phone number to send a Tailor Circle handshake invitation.
                </p>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsConnectModalOpen(false)}
                aria-label="Close"
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            <div>
              <div className={styles.searchBarWrap}>
                <Symbol name="search" size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by shop name, @handle, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
              </div>

              <div className={styles.searchResultsList}>
                {searching ? (
                  <p className={styles.searchEmptyText}>Searching tailor directory...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((colleague) => (
                    <div key={colleague.id} className={styles.colleagueCard}>
                      <div className={styles.colleagueCardLeft}>
                        <div className={styles.colleagueAvatar}>
                          {colleague.logoUrl ? (
                            <img src={colleague.logoUrl} alt={colleague.name} className={styles.colleagueAvatarImg} />
                          ) : (
                            <span>{colleague.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.colleagueInfo}>
                          <span className={styles.colleagueName}>{colleague.name}</span>
                          <span className={styles.colleagueMeta}>
                            {colleague.slug ? `@${colleague.slug} · ` : ''}
                            {colleague.streakCount > 0 ? `${colleague.streakCount}d streak · ` : ''}
                            <span style={{ color: colleague.tierColor }}>{colleague.tierName}</span>
                          </span>
                        </div>
                      </div>

                      <div className={styles.colleagueActions}>
                        {colleague.connectionStatus === 'connected' ? (
                          <span className={styles.colleagueStatusBadge}>
                            <Symbol name="check_circle" size={14} />
                            <span>Connected</span>
                          </span>
                        ) : colleague.connectionStatus === 'request_sent' ? (
                          <button
                            type="button"
                            className={styles.colleaguePendingBtn}
                            disabled={actionLoadingId === colleague.id}
                            onClick={() =>
                              colleague.requestId &&
                              handleCancelCircleRequest(colleague.requestId, colleague.id)
                            }
                            title="Tap to cancel pending invitation"
                          >
                            <span>{actionLoadingId === colleague.id ? 'Cancelling...' : 'Pending · Cancel'}</span>
                          </button>
                        ) : colleague.connectionStatus === 'incoming_request' ? (
                          <button
                            type="button"
                            className={styles.colleagueActionBtn}
                            disabled={actionLoadingId === colleague.id}
                            onClick={() =>
                              colleague.requestId && handleAcceptRequest(colleague.requestId)
                            }
                          >
                            <Symbol name="check" size={14} />
                            <span>Accept Invite</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.colleagueActionBtn}
                            disabled={actionLoadingId === colleague.id}
                            onClick={() => handleSendCircleRequest(colleague)}
                          >
                            <Symbol name="handshake" size={14} />
                            <span>{actionLoadingId === colleague.id ? 'Sending...' : 'Send Request'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : searchQuery.trim().length >= 2 ? (
                  <p className={styles.searchEmptyText}>
                    No workshops found matching &ldquo;{searchQuery.trim()}&rdquo;.
                  </p>
                ) : (
                  <p className={styles.searchEmptyText}>
                    Type a shop name, @username, or phone number to find colleagues already using MyStitchBook.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AtelierCirclePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.pageContainer}>
          <div className={styles.content}>
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Loading Tailor Circle...</p>
            </div>
          </div>
        </div>
      }
    >
      <AtelierCircleContent />
    </Suspense>
  );
}
