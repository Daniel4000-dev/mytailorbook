'use client';

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useData } from '@/contexts/DataContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';
import { COUNTRIES } from '@/components/ui/PhoneInput/countries';
import { PhoneInput } from '@/components/ui/PhoneInput/PhoneInput';
import { detectCountryAndCurrencyFromPhone } from '@/lib/currency';
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
  saveGuildProfileAction,
  createCircleExchangePostAction,
  updateCircleExchangePostStatusAction,
  type CircleHubData,
  type CircleBuddy,
  type PulseActivity,
  type SearchedColleague,
  type CircleRequest,
  type GuildProfile,
  type CircleExchangePost,
} from '@/app/actions/circle';

type HubScope = 'circle' | 'marketplace';
type ExchangeCategory = 'all' | 'overflow' | 'equipment' | 'fabric' | 'technique' | 'remnant' | 'wholesale';

const COMMON_MACHINES = [
  'Industrial Buttonholer',
  '5-Thread Overlocker',
  'Computerized Embroidery',
  'Steam Boiler Iron',
  'Heavy Leather Walking Foot',
  'Blind Hemmer',
  'Fabric Pleating Press',
  'Coverstitch Machine',
  'Eyelet Puncher',
];

const COMMON_SPECIALTIES = [
  'Kaftan & Agbada',
  'Bespoke Canvas Suits',
  'Senator & Safari Sets',
  'Corsetry & Bridal Gowns',
  'Traditional Native & Aso-Ebi',
  'Blazers & Trousers',
  'Caps, Fila & Embroidery',
];

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
  const { showToast } = useToast();
  const { currentShop } = useData();
  const [isPending, startTransition] = useTransition();

  const shopId = currentShop?.id || 'current';

  // Smart SWR with localStorage persistence: instantly renders cached state,
  // then revalidates in the background without layout shifts or reload flickers.
  const {
    data: circleData,
    mutate: mutateCircleData,
    isValidating,
  } = useSWR<CircleHubData>(
    ['circle-hub', shopId],
    async () => {
      const res = await getCircleHubDataAction();
      if (!res.data) {
        throw new Error(res.error || 'Failed to load circle data');
      }
      return res.data;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10_000,
    }
  );

  const data = circleData || null;
  const loading = !data && isValidating;

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Scope & Guild Exchange Board state
  const [activeScope, setActiveScope] = useState<HubScope>('circle');
  const [exchangeCategory, setExchangeCategory] = useState<ExchangeCategory>('all');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [draftVisibility, setDraftVisibility] = useState<'circle' | 'city'>('circle');
  const [draftPostCategory, setDraftPostCategory] = useState<'overflow' | 'equipment' | 'fabric' | 'technique' | 'remnant' | 'wholesale'>('overflow');
  const [draftPostTitle, setDraftPostTitle] = useState('');
  const [draftPostDescription, setDraftPostDescription] = useState('');
  const [draftPriceOrBudget, setDraftPriceOrBudget] = useState('');
  const [draftFabricYardage, setDraftFabricYardage] = useState('');
  const [draftPostUrgency, setDraftPostUrgency] = useState<'urgent_today' | 'this_week' | 'flexible'>('this_week');
  const [creatingPost, setCreatingPost] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  // Guild Craft Card Modal state
  const [isGuildCardOpen, setIsGuildCardOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState('Nigeria');
  const [draftCity, setDraftCity] = useState('');
  const [draftNeighborhood, setDraftNeighborhood] = useState('');
  const [draftMachines, setDraftMachines] = useState<string[]>([]);
  const [draftSpecialties, setDraftSpecialties] = useState<string[]>([]);
  const [draftOverflow, setDraftOverflow] = useState<'open' | 'balanced' | 'booked'>('open');
  const [draftWhatsappPhone, setDraftWhatsappPhone] = useState('');
  const [savingGuildCard, setSavingGuildCard] = useState(false);
  const [searchCountryFilter, setSearchCountryFilter] = useState('Nigeria');

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
    await mutateCircleData();
  };

  useEffect(() => {
    if (data?.myShop?.country) {
      setSearchCountryFilter((prev) => prev || data.myShop.country || 'Nigeria');
    }
    if (selectedBuddy && data?.buddies) {
      const fresh = data.buddies.find((b) => b.id === selectedBuddy.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedBuddy)) {
        setSelectedBuddy(fresh);
      }
    }
  }, [data]);

  const formatTimeAgo = (dateString: string): string => {
    try {
      const then = new Date(dateString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleCreatePost = async () => {
    if (!draftPostTitle.trim()) {
      showToast('Please enter a request title', 'error');
      return;
    }
    if (!draftPostDescription.trim()) {
      showToast('Please describe what you need or offer', 'error');
      return;
    }
    setCreatingPost(true);
    try {
      const res = await createCircleExchangePostAction({
        category: draftPostCategory,
        title: draftPostTitle,
        description: draftPostDescription,
        urgency: draftPostUrgency,
        visibility: draftVisibility,
        priceOrBudget: draftPriceOrBudget.trim() || undefined,
        fabricYardage: draftFabricYardage.trim() || undefined,
      });
      if (res.success) {
        showToast(
          draftVisibility === 'city'
            ? 'Broadcast published to City Marketplace!'
            : 'Request posted to your Circle of friends!',
          'success'
        );
        setIsCreatePostOpen(false);
        setDraftPostTitle('');
        setDraftPostDescription('');
        setDraftPriceOrBudget('');
        setDraftFabricYardage('');
        setDraftPostCategory('overflow');
        setDraftPostUrgency('this_week');
        await loadData();
      } else {
        showToast(res.error || 'Failed to create request', 'error');
      }
    } catch {
      showToast('Error creating request', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleConnectFromMarketplace = async (shopId: string, shopName: string) => {
    try {
      const res = await sendCircleRequestAction(shopId);
      if (res.success) {
        showToast(`Invitation sent to ${shopName}!`, 'success');
        await loadData();
      } else {
        showToast(res.error || 'Failed to send invitation', 'error');
      }
    } catch {
      showToast('Error sending invitation', 'error');
    }
  };

  const handleUpdatePostStatus = async (postId: string, newStatus: 'open' | 'fulfilled' | 'deleted') => {
    setUpdatingPostId(postId);
    try {
      const res = await updateCircleExchangePostStatusAction(postId, newStatus);
      if (res.success) {
        showToast(
          newStatus === 'fulfilled'
            ? 'Request marked as fulfilled!'
            : newStatus === 'deleted'
            ? 'Request removed'
            : 'Request reopened',
          'success'
        );
        await loadData();
      } else {
        showToast(res.error || 'Failed to update request', 'error');
      }
    } catch {
      showToast('Error updating request status', 'error');
    } finally {
      setUpdatingPostId(null);
    }
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

  const handleOpenGuildCard = () => {
    const profile = data?.myShop.guildProfile;
    setDraftCountry(profile?.country || data?.myShop.country || 'Nigeria');
    setDraftCity(profile?.city || '');
    setDraftNeighborhood(profile?.neighborhood || '');
    setDraftMachines(profile?.machines || []);
    setDraftSpecialties(profile?.specialties || []);
    setDraftOverflow(profile?.overflowStatus || 'open');
    setDraftWhatsappPhone(profile?.whatsappPhone || '');
    setIsGuildCardOpen(true);
  };

  const handleToggleMachine = (mach: string) => {
    setDraftMachines((prev) =>
      prev.includes(mach) ? prev.filter((m) => m !== mach) : [...prev, mach]
    );
  };

  const handleToggleSpecialty = (spec: string) => {
    setDraftSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSaveGuildCard = async () => {
    setSavingGuildCard(true);
    try {
      const res = await saveGuildProfileAction({
        country: draftCountry,
        city: draftCity.trim() || undefined,
        neighborhood: draftNeighborhood.trim() || undefined,
        machines: draftMachines,
        specialties: draftSpecialties,
        overflowStatus: draftOverflow,
        whatsappPhone: draftWhatsappPhone.trim() || undefined,
        isDiscoverable: true,
      });

      if (res.success) {
        showToast('Guild Craft Card updated successfully!', 'success');
        setIsGuildCardOpen(false);
        await loadData();
      } else {
        showToast(res.error || 'Failed to update Guild Card', 'error');
      }
    } catch {
      showToast('Error saving Guild Card', 'error');
    } finally {
      setSavingGuildCard(false);
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
        const res = await searchColleaguesAction(clean, searchCountryFilter);
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
  }, [searchQuery, searchCountryFilter, isConnectModalOpen]);

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

  const exchangePosts = (data?.exchangePosts || []).filter((post) => {
    // Scope filter:
    if (activeScope === 'circle') {
      const isBuddyOrMe =
        post.shopId === data?.myShop.id ||
        (data?.buddies || []).some((b) => b.id === post.shopId);
      if (post.visibility === 'city' && !isBuddyOrMe) return false;
    } else {
      if (post.visibility === 'circle' && post.shopId !== data?.myShop.id) return false;
    }

    // Category filter:
    if (exchangeCategory === 'all') return true;
    return post.category === exchangeCategory;
  });

  const benefits = data?.benefits;

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/dashboard');
              }
            }}
            aria-label="Go back"
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
        {/* ── Top-Level Scope Switcher (My Circle vs City Marketplace) ── */}
        <div className={styles.scopeSwitcherContainer}>
          <button
            type="button"
            className={`${styles.scopeSwitchBtn} ${activeScope === 'circle' ? styles.scopeSwitchBtnActive : ''}`}
            onClick={() => {
              setActiveScope('circle');
              setExchangeCategory('all');
            }}
          >
            <Symbol name="groups" size={16} />
            <span>My Circle</span>
            <span className={styles.scopeBadgeCount}>{data?.buddies.length || 0}</span>
          </button>

          <button
            type="button"
            className={`${styles.scopeSwitchBtn} ${activeScope === 'marketplace' ? styles.scopeSwitchBtnActive : ''}`}
            onClick={() => {
              setActiveScope('marketplace');
              setExchangeCategory('all');
            }}
          >
            <Symbol name="storefront" size={16} />
            <span>City Marketplace</span>
          </button>
        </div>

        {/* ── City Marketplace Context Banner ── */}
        {activeScope === 'marketplace' && (
          <div className={styles.marketplaceBanner}>
            <div className={styles.marketplaceBannerText}>
              <h3 className={styles.marketplaceBannerTitle}>
                City Craft Exchange & Marketplace
              </h3>
              <p className={styles.marketplaceBannerSub}>
                Explore fabric remnants, join bulk wholesale roll splits, and discover peer tailors in {data?.myShop.country || 'your city'}.
              </p>
            </div>
            <button
              type="button"
              className={styles.postRequestActionBtn}
              onClick={() => {
                setDraftVisibility('city');
                setIsCreatePostOpen(true);
              }}
            >
              <Symbol name="add" size={14} />
              <span>Post to Marketplace</span>
            </button>
          </div>
        )}

        {/* ── My Workshop Guild Card Banner ── */}
        {activeScope === 'circle' && data?.myShop && (
          <section className={styles.guildCardBanner}>
            <div className={styles.guildCardHeader}>
              <div className={styles.guildCardIdentity}>
                <Symbol name="workspace_premium" size={18} />
                <span className={styles.guildCardTitle}>Your Workshop Guild Card</span>
              </div>
              <button
                type="button"
                className={styles.guildCardEditBtn}
                onClick={handleOpenGuildCard}
              >
                <Symbol name="edit" size={13} />
                <span>
                  {data.myShop.guildProfile?.city || (data.myShop.guildProfile?.machines?.length || 0) > 0
                    ? 'Edit Guild Card'
                    : 'Setup Guild Card'}
                </span>
              </button>
            </div>

            <div className={styles.guildCardMeta}>
              <div className={styles.guildCardLoc}>
                <Symbol name="location_on" size={15} />
                <span>
                  {data.myShop.guildProfile?.neighborhood
                    ? `${data.myShop.guildProfile.neighborhood}, `
                    : ''}
                  {data.myShop.guildProfile?.city ? `${data.myShop.guildProfile.city}, ` : ''}
                  {data.myShop.guildProfile?.country || data.myShop.country || 'Location not set — tap to add your city'}
                </span>
              </div>
              <span
                className={`${styles.overflowBadge} ${
                  styles['overflow_' + (data.myShop.guildProfile?.overflowStatus || 'open')]
                }`}
              >
                {data.myShop.guildProfile?.overflowStatus === 'booked'
                  ? 'Fully Booked'
                  : data.myShop.guildProfile?.overflowStatus === 'balanced'
                  ? 'Balanced Capacity'
                  : 'Open for Overflow Work'}
              </span>
            </div>

            {(data.myShop.guildProfile?.machines?.length || 0) > 0 ? (
              <div className={styles.guildCardPillsRow}>
                {data.myShop.guildProfile?.machines?.map((m) => (
                  <span key={m} className={styles.guildMachinePill}>
                    <Symbol name="precision_manufacturing" size={12} />
                    <span>{m}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--sf-text-tertiary)', marginTop: '2px' }}>
                No industrial machines listed yet. Tap <strong>Setup Guild Card</strong> to add your buttonholer, serger, or embroidery equipment so colleagues can find you.
              </div>
            )}
          </section>
        )}

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

        {/* ── 1. Intimacy & Peer Benefits Gauge (Circle Scope Only) ── */}
        {activeScope === 'circle' && benefits && (
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

        {/* ── 2. Connected Tailors Horizontal Rail (Circle Scope Only) ── */}
        {activeScope === 'circle' && (
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
        )}

        {/* ── 3. Guild Exchange Board (Adapts to Scope) ── */}
        <section className={styles.exchangeSection}>
          <div className={styles.exchangeHeaderRow}>
            <div className={styles.exchangeTitleBlock}>
              <h2 className={styles.exchangeSectionTitle}>
                {activeScope === 'circle' ? 'Circle Work & Resources' : 'City Guild Marketplace'}
              </h2>
              <p className={styles.exchangeSectionSubtitle}>
                {activeScope === 'circle'
                  ? 'Shared only with your connected circle of trusted friends'
                  : 'Fabric remnants, bulk roll splits, and open requests across your city'}
              </p>
            </div>
            <button
              type="button"
              className={styles.postRequestActionBtn}
              onClick={() => {
                setDraftVisibility(activeScope === 'circle' ? 'circle' : 'city');
                setIsCreatePostOpen(true);
              }}
            >
              <Symbol name="add" size={15} />
              <span>{activeScope === 'circle' ? 'Post to Circle' : 'Post to Marketplace'}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className={styles.filterTabs}>
            {(activeScope === 'circle'
              ? [
                  { key: 'all', label: 'All Requests' },
                  { key: 'overflow', label: 'Overflow Work' },
                  { key: 'equipment', label: 'Machine Access' },
                  { key: 'fabric', label: 'Fabric SOS' },
                  { key: 'technique', label: 'Technique' },
                ]
              : [
                  { key: 'all', label: 'All Deals & Posts' },
                  { key: 'remnant', label: 'Fabric Remnants' },
                  { key: 'wholesale', label: 'Wholesale Splits' },
                  { key: 'equipment', label: 'Machine Access' },
                  { key: 'overflow', label: 'Overflow Work' },
                ]
            ).map((tab) => {
              const isActive = exchangeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                  onClick={() => setExchangeCategory(tab.key as ExchangeCategory)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Loading guild exchange requests...</p>
            </div>
          ) : exchangePosts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconCircle}>
                <Symbol name="handshake" size={24} />
              </div>
              <p className={styles.emptyTitle}>
                {activeScope === 'circle' ? 'No circle requests yet' : 'No marketplace deals yet'}
              </p>
              <p className={styles.emptyText}>
                {activeScope === 'circle'
                  ? 'Need extra hands for urgent delivery or looking for machine access? Post a request to your trusted circle.'
                  : 'Have leftover fabric remnants to sell or looking to split a wholesale fabric roll? Post to your city marketplace.'}
              </p>
              <button
                type="button"
                className={styles.postRequestActionBtn}
                style={{ marginTop: 12 }}
                onClick={() => {
                  setDraftVisibility(activeScope === 'circle' ? 'circle' : 'city');
                  setIsCreatePostOpen(true);
                }}
              >
                <Symbol name="add" size={15} />
                <span>
                  {activeScope === 'circle' ? 'Post First Circle Request' : 'Post First Marketplace Deal'}
                </span>
              </button>
            </div>
          ) : (
            exchangePosts.map((post) => {
              const isMine = post.shopId === data?.myShop.id;
              const isAlreadyBuddy = (data?.buddies || []).some((b) => b.id === post.shopId);

              const catLabels: Record<string, string> = {
                overflow: 'Overflow Work',
                equipment: 'Machine Access',
                fabric: 'Fabric SOS',
                technique: 'Technique Advice',
                remnant: 'Fabric Remnant',
                wholesale: 'Wholesale Split',
              };
              const urgencyLabels: Record<string, string> = {
                urgent_today: 'Urgent Today',
                this_week: 'This Week',
                flexible: 'Flexible',
              };

              const claimMsg = `Hello ${post.shopName}! I saw your "${post.title}" post on Tailor Circle and wanted to connect on it.`;
              const waLink = post.whatsappPhone ? getWhatsAppLink(post.whatsappPhone, claimMsg) : null;
              const isFulfilled = post.status === 'fulfilled';

              return (
                <article
                  key={post.id}
                  className={`${styles.exchangeCard} ${isFulfilled ? styles.exchangeCardFulfilled : ''}`}
                >
                  <div className={styles.exchangeCardTop}>
                    <div className={styles.exchangeBadgesGroup}>
                      <span className={`${styles.catBadge} ${styles[`catBadge_${post.category}`] || ''}`}>
                        {catLabels[post.category] || post.category}
                      </span>
                      <span className={`${styles.urgencyBadge} ${styles[`urgency_${post.urgency}`] || ''}`}>
                        {urgencyLabels[post.urgency] || post.urgency}
                      </span>
                      {post.priceOrBudget && (
                        <span className={styles.priceTagBadge}>
                          {post.priceOrBudget}
                        </span>
                      )}
                      {post.fabricYardage && (
                        <span className={styles.yardageBadge}>
                          {post.fabricYardage}
                        </span>
                      )}
                      {post.visibility === 'city' && (
                        <span
                          className={styles.yardageBadge}
                          style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}
                        >
                          City Public
                        </span>
                      )}
                      {isFulfilled && (
                        <span className={styles.statusPillFulfilled}>
                          Fulfilled
                        </span>
                      )}
                    </div>
                    <span className={styles.postDateText}>
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>

                  <h3 className={styles.exchangeTitle}>{post.title}</h3>
                  <p className={styles.exchangeDescription}>{post.description}</p>

                  <div className={styles.exchangeFooter}>
                    <div className={styles.exchangeShopBlock}>
                      <div className={styles.exchangeShopAvatar}>
                        {post.shopLogoUrl ? (
                          <img
                            src={post.shopLogoUrl}
                            alt={post.shopName}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          post.shopName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles.exchangeShopMeta}>
                        <span className={styles.exchangeShopName}>
                          {isMine ? `${post.shopName} (You)` : post.shopName}
                        </span>
                        {post.city && (
                          <span className={styles.exchangeLocationText}>
                            {post.city}, {post.country}
                          </span>
                        )}
                      </div>
                    </div>

                    {isMine ? (
                      <div className={styles.exchangeOwnerBar}>
                        {isFulfilled ? (
                          <button
                            type="button"
                            className={styles.exchangeSmallBtn}
                            disabled={updatingPostId === post.id}
                            onClick={() => handleUpdatePostStatus(post.id, 'open')}
                          >
                            <Symbol name="undo" size={13} />
                            <span>Reopen</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.exchangeSmallBtn}
                            disabled={updatingPostId === post.id}
                            onClick={() => handleUpdatePostStatus(post.id, 'fulfilled')}
                          >
                            <Symbol name="check" size={13} />
                            <span>Mark Fulfilled</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.exchangeSmallBtn}
                          style={{ color: '#dc2626' }}
                          disabled={updatingPostId === post.id}
                          onClick={() => {
                            if (confirm('Delete this request from the guild board?')) {
                              handleUpdatePostStatus(post.id, 'deleted');
                            }
                          }}
                        >
                          <Symbol name="delete" size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {activeScope === 'marketplace' && !isAlreadyBuddy && (
                          <button
                            type="button"
                            className={styles.exchangeConnectBtn}
                            onClick={() => handleConnectFromMarketplace(post.shopId, post.shopName)}
                            title={`Invite ${post.shopName} to your Inner Circle`}
                          >
                            <Symbol name="group_add" size={13} />
                            <span>Add to Circle</span>
                          </button>
                        )}
                        {waLink && !isFulfilled && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.exchangeWhatsAppBtn}
                          >
                            <WhatsappIcon size={14} />
                            <span>Coordinate on WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
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
                <span className={styles.profileLocation}>
                  <Symbol name="location_on" size={13} />
                  <span>
                    {selectedBuddy.neighborhood ? `${selectedBuddy.neighborhood}, ` : ''}
                    {selectedBuddy.city ? `${selectedBuddy.city}, ` : ''}
                    {selectedBuddy.country || selectedBuddy.address || 'Location on file'}
                  </span>
                </span>
              </div>
            </div>

            {/* Capacity Status & Machine Showcase */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 14px', background: 'var(--sf-bg-surface-elevated, #f8fafc)', borderRadius: '8px', border: '1px solid var(--sf-border-light, #e2e8f0)', margin: '12px 0' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-text-secondary)' }}>
                Capacity Status
              </div>
              <span className={`${styles.overflowBadge} ${styles['overflow_' + (selectedBuddy.overflowStatus || 'balanced')]}`}>
                {selectedBuddy.overflowStatus === 'open'
                  ? 'Open for Overflow Work'
                  : selectedBuddy.overflowStatus === 'booked'
                  ? 'Fully Booked'
                  : 'Balanced'}
              </span>
            </div>

            {(selectedBuddy.machines?.length || 0) > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>
                  In-House Industrial Machines:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedBuddy.machines?.map((m) => (
                    <span key={m} className={styles.guildMachinePill}>
                      <Symbol name="precision_manufacturing" size={12} />
                      <span>{m}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

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

      {/* ── 6. Connect Colleague Drawer (Mobile BottomSheet / Desktop Modal) ── */}
      <BottomSheet
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        title="Connect with a Colleague"
        variant="modal"
        subHeader={
          <p className={styles.modalSubtitleText}>
            Find colleagues already using MyStitchBook by shop name, @username, or phone number to send a Handshake request.
          </p>
        }
      >
        <div className={styles.connectDrawerContent}>
          <div className={styles.searchBarWrap}>
            <Symbol name="search" size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by shop name, @handle, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <Symbol name="close" size={14} />
              </button>
            )}
          </div>

          {/* Country Filter Strip */}
          <div className={styles.countryFilterRow}>
            <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', fontWeight: 600 }}>Country:</span>
            <select
              value={searchCountryFilter}
              onChange={(e) => setSearchCountryFilter(e.target.value)}
              className={styles.countryFilterSelect}
            >
              <option value="All">All Countries</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.searchResultsList}>
            {searching ? (
              <div className={styles.searchLoadingState}>
                <Symbol name="sync" size={18} className={styles.searchSpinIcon} />
                <span>Searching tailor directory...</span>
              </div>
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
                      <div className={styles.colleagueDetailTags}>
                        <span className={styles.colleagueLocationTag}>
                          <Symbol name="location_on" size={11} />
                          <span>
                            {colleague.city
                              ? `${colleague.neighborhood ? colleague.neighborhood + ', ' : ''}${colleague.city}`
                              : colleague.country || 'Location on file'}
                          </span>
                        </span>
                        {colleague.overflowStatus === 'open' && (
                          <span className={`${styles.overflowBadge} ${styles.overflow_open}`} style={{ padding: '1px 6px', fontSize: '10px' }}>
                            Open for Work
                          </span>
                        )}
                        {colleague.machines && colleague.machines.length > 0 && (
                          <span className={styles.colleagueMachineTag}>
                            {colleague.machines[0]}
                            {colleague.machines.length > 1 ? ` +${colleague.machines.length - 1}` : ''}
                          </span>
                        )}
                      </div>
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
                No workshops found matching &ldquo;{searchQuery.trim()}&rdquo; in {searchCountryFilter}.
              </p>
            ) : (
              <div className={styles.searchPromptState}>
                <div className={styles.searchPromptIconWrap}>
                  <Symbol name="handshake" size={24} />
                </div>
                <p className={styles.searchPromptTitle}>Find Your Tailoring Colleagues</p>
                <p className={styles.searchEmptyText}>
                  Type a shop name, @username, or phone number to find colleagues already using MyStitchBook.
                </p>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* ── 7. Guild Craft Card Editor Drawer ── */}
      <BottomSheet
        isOpen={isGuildCardOpen}
        onClose={() => setIsGuildCardOpen(false)}
        title="My Guild Craft Card"
        variant="modal"
        subHeader={
          <p className={styles.modalSubtitleText}>
            Colleagues in your country see these details when searching for work partners and equipment.
          </p>
        }
      >
        <div className={styles.guildEditorForm}>
          {/* Location Section */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildFormLabel}>Workshop Country</label>
            <span className={styles.guildFormSub}>Ensures colleagues around you can discover your workshop</span>
            <select
              value={draftCountry}
              onChange={(e) => setDraftCountry(e.target.value)}
              className={styles.guildSelect}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className={styles.guildFormGroup} style={{ flex: 1 }}>
              <label className={styles.guildFormLabel}>City</label>
              <input
                type="text"
                placeholder="e.g. Lagos, Abuja, London"
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
                className={styles.guildInput}
              />
            </div>
            <div className={styles.guildFormGroup} style={{ flex: 1 }}>
              <label className={styles.guildFormLabel}>Neighborhood / District</label>
              <input
                type="text"
                placeholder="e.g. Ikeja, Wuse, Lekki"
                value={draftNeighborhood}
                onChange={(e) => setDraftNeighborhood(e.target.value)}
                className={styles.guildInput}
              />
            </div>
          </div>

          <div className={styles.guildFormGroup}>
            <label className={styles.guildFormLabel}>Direct WhatsApp Phone</label>
            <span className={styles.guildFormSub}>Used when colleagues tap Chat on WhatsApp for overflow work</span>
            <div style={{ marginTop: '6px' }}>
              <PhoneInput
                value={draftWhatsappPhone}
                onChange={(val) => {
                  setDraftWhatsappPhone(val);
                  const detected = detectCountryAndCurrencyFromPhone(val);
                  if (detected.countryName) {
                    setDraftCountry(detected.countryName);
                  }
                }}
                placeholder="7123 456789"
                defaultCountryCode={COUNTRIES.find(c => c.name.toLowerCase() === draftCountry.toLowerCase())?.code || 'NG'}
              />
            </div>
          </div>

          {/* Industrial Machines */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildFormLabel}>Industrial Equipment &amp; Machines</label>
            <span className={styles.guildFormSub}>Tap all equipment available in your workshop</span>
            <div className={styles.guildPillsWrap}>
              {COMMON_MACHINES.map((mach) => {
                const isSelected = draftMachines.includes(mach);
                return (
                  <button
                    key={mach}
                    type="button"
                    className={`${styles.guildTogglePill} ${isSelected ? styles.guildTogglePillActive : ''}`}
                    onClick={() => handleToggleMachine(mach)}
                  >
                    <Symbol name={isSelected ? 'check' : 'add'} size={13} />
                    <span>{mach}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialties */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildFormLabel}>Craft Specialties</label>
            <span className={styles.guildFormSub}>What garments your workshop cuts best</span>
            <div className={styles.guildPillsWrap}>
              {COMMON_SPECIALTIES.map((spec) => {
                const isSelected = draftSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    className={`${styles.guildTogglePill} ${isSelected ? styles.guildTogglePillActive : ''}`}
                    onClick={() => handleToggleSpecialty(spec)}
                  >
                    <Symbol name={isSelected ? 'check' : 'add'} size={13} />
                    <span>{spec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capacity Status */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildFormLabel}>Current Workshop Capacity Status</label>
            <span className={styles.guildFormSub}>Let colleagues know if you are accepting extra work</span>

            <div
              className={`${styles.guildRadioCard} ${draftOverflow === 'open' ? styles.guildRadioCardActive : ''}`}
              onClick={() => setDraftOverflow('open')}
              role="button"
              tabIndex={0}
            >
              <Symbol name={draftOverflow === 'open' ? 'check_circle' : 'radio_button_unchecked'} size={18} style={{ color: draftOverflow === 'open' ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                  Open for Overflow Work
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--sf-text-secondary)' }}>
                  Accepting paid subcontract cuts and extra orders from colleagues
                </div>
              </div>
            </div>

            <div
              className={`${styles.guildRadioCard} ${draftOverflow === 'balanced' ? styles.guildRadioCardActive : ''}`}
              onClick={() => setDraftOverflow('balanced')}
              role="button"
              tabIndex={0}
            >
              <Symbol name={draftOverflow === 'balanced' ? 'check_circle' : 'radio_button_unchecked'} size={18} style={{ color: draftOverflow === 'balanced' ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                  Balanced Workshop
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--sf-text-secondary)' }}>
                  Focused on current workshop schedule
                </div>
              </div>
            </div>

            <div
              className={`${styles.guildRadioCard} ${draftOverflow === 'booked' ? styles.guildRadioCardActive : ''}`}
              onClick={() => setDraftOverflow('booked')}
              role="button"
              tabIndex={0}
            >
              <Symbol name={draftOverflow === 'booked' ? 'check_circle' : 'radio_button_unchecked'} size={18} style={{ color: draftOverflow === 'booked' ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                  Fully Booked
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--sf-text-secondary)' }}>
                  No extra capacity this week
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.guildSaveBtn}
            disabled={savingGuildCard}
            onClick={handleSaveGuildCard}
          >
            {savingGuildCard ? 'Saving Guild Card...' : 'Save Guild Craft Card'}
          </button>
        </div>
      </BottomSheet>

      {/* ── 8. Create Guild Exchange Request BottomSheet ── */}
      <BottomSheet
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        title={draftVisibility === 'circle' ? 'Post to Circle (Private)' : 'Post to City Marketplace'}
      >
        <div className={styles.guildFormBody}>
          <p className={styles.guildSectionHint}>
            {draftVisibility === 'circle'
              ? 'Visible only to your connected tailor friends. Perfect for confidential overflow cuts and borrowing machines.'
              : 'Broadcast to all workshops across your city. Perfect for selling remnants and pooling wholesale roll splits.'}
          </p>

          {/* Visibility / Audience */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildLabel}>Target Audience</label>
            <div>
              <div
                className={`${styles.guildRadioCard} ${
                  draftVisibility === 'circle' ? styles.guildRadioCardActive : ''
                }`}
                onClick={() => setDraftVisibility('circle')}
                role="button"
                tabIndex={0}
              >
                <Symbol
                  name={draftVisibility === 'circle' ? 'check_circle' : 'radio_button_unchecked'}
                  size={18}
                  style={{
                    color: draftVisibility === 'circle' ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)',
                  }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                    My Circle Only (Private to Friends)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
                    Visible only to your connected tailor circle.
                  </div>
                </div>
              </div>

              <div
                className={`${styles.guildRadioCard} ${
                  draftVisibility === 'city' ? styles.guildRadioCardActive : ''
                }`}
                onClick={() => setDraftVisibility('city')}
                role="button"
                tabIndex={0}
              >
                <Symbol
                  name={draftVisibility === 'city' ? 'check_circle' : 'radio_button_unchecked'}
                  size={18}
                  style={{
                    color: draftVisibility === 'city' ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)',
                  }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                    City Marketplace (Open to City)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
                    Visible to all verified workshops in {data?.myShop.country || 'your city'}.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Request Category */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildLabel}>Category</label>
            <div>
              {[
                { key: 'overflow', label: 'Overflow Work', desc: 'Need extra hands / outsource cut' },
                { key: 'equipment', label: 'Machine Access', desc: 'Borrow specialized machine' },
                { key: 'remnant', label: 'Fabric Remnant for Sale', desc: 'Sell or swap leftover yards of fabric' },
                { key: 'wholesale', label: 'Wholesale Bulk Split', desc: 'Pool money with peers for roll/bale pricing' },
                { key: 'technique', label: 'Technique Advice', desc: 'Pattern, fit, or structure guidance' },
              ].map((opt) => (
                <div
                  key={opt.key}
                  className={`${styles.guildRadioCard} ${
                    draftPostCategory === opt.key ? styles.guildRadioCardActive : ''
                  }`}
                  onClick={() => setDraftPostCategory(opt.key as any)}
                  role="button"
                  tabIndex={0}
                >
                  <Symbol
                    name={draftPostCategory === opt.key ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    style={{
                      color: draftPostCategory === opt.key ? 'var(--sf-brand-indigo)' : 'var(--sf-text-secondary)',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price / Budget / Pay */}
          {(draftPostCategory === 'remnant' || draftPostCategory === 'wholesale' || draftPostCategory === 'overflow') && (
            <div className={styles.guildFormGroup}>
              <label className={styles.guildLabel}>
                {draftPostCategory === 'remnant'
                  ? 'Asking Price (Optional)'
                  : draftPostCategory === 'wholesale'
                  ? 'Cost per Yard / Slot (Optional)'
                  : 'Payout / Budget (Optional)'}
              </label>
              <input
                type="text"
                className={styles.guildInput}
                placeholder="e.g. ₦14,000 or ₦11,500/yd"
                value={draftPriceOrBudget}
                onChange={(e) => setDraftPriceOrBudget(e.target.value)}
                maxLength={40}
              />
            </div>
          )}

          {/* Fabric Yardage */}
          {(draftPostCategory === 'remnant' || draftPostCategory === 'wholesale') && (
            <div className={styles.guildFormGroup}>
              <label className={styles.guildLabel}>Fabric Yardage / Length (Optional)</label>
              <input
                type="text"
                className={styles.guildInput}
                placeholder="e.g. 2.5 Yards, 4 Metres, or 50m Roll Split"
                value={draftFabricYardage}
                onChange={(e) => setDraftFabricYardage(e.target.value)}
                maxLength={40}
              />
            </div>
          )}

          {/* Urgency */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildLabel}>Urgency</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'urgent_today', label: 'Urgent Today' },
                { key: 'this_week', label: 'This Week' },
                { key: 'flexible', label: 'Flexible' },
              ].map((urg) => {
                const isActive = draftPostUrgency === urg.key;
                return (
                  <button
                    key={urg.key}
                    type="button"
                    className={`${styles.guildTogglePill} ${isActive ? styles.guildTogglePillActive : ''}`}
                    onClick={() => setDraftPostUrgency(urg.key as any)}
                  >
                    {urg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Request Title */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildLabel}>Summary Title</label>
            <input
              type="text"
              className={styles.guildInput}
              placeholder={
                draftPostCategory === 'remnant'
                  ? 'e.g. 2.5 yds Super 120s Navy Italian Wool remnant'
                  : draftPostCategory === 'wholesale'
                  ? 'e.g. 50m roll white damask split from Balogun'
                  : 'e.g. Need buttonholes punched for 8 Senator suits by 4pm'
              }
              value={draftPostTitle}
              onChange={(e) => setDraftPostTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Request Details */}
          <div className={styles.guildFormGroup}>
            <label className={styles.guildLabel}>Details & Specifications</label>
            <textarea
              className={styles.guildInput}
              rows={4}
              placeholder="Describe color, fabric composition, machine specifications, pickup location, or coordination terms..."
              value={draftPostDescription}
              onChange={(e) => setDraftPostDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="button"
            className={styles.guildSaveBtn}
            disabled={creatingPost || !draftPostTitle.trim()}
            onClick={handleCreatePost}
          >
            {creatingPost
              ? 'Publishing...'
              : draftVisibility === 'city'
              ? 'Publish to City Marketplace'
              : 'Publish to My Circle'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function AtelierCirclePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
