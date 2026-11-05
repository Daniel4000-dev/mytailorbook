'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Symbol from '@/components/ui/Symbol/Symbol';
import { isXpSystemEnabled } from '@/lib/xp';
import styles from './page.module.css';
import {
  getCircleHubDataAction,
  linkStudioBuddyAction,
  type CircleHubData,
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
  const [data, setData] = useState<CircleHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [colleagueCode, setColleagueCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [salutes, setSalutes] = useState<Record<string, SaluteState>>({});

  useEffect(() => {
    if (!isXpSystemEnabled()) {
      router.replace('/dashboard');
      return;
    }
    async function loadData() {
      setLoading(true);
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
      }
      setLoading(false);
    }
    loadData();
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
    navigator.clipboard.writeText(data.myShop.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!data?.myShop.referralCode) return;
    const msg = `Join my Atelier Circle on MyTailorBook so we can keep our daily workshop production streaks accountable! Use my studio code: ${data.myShop.referralCode}`;
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
      setColleagueCode('');
      // Refresh circle
      const updated = await getCircleHubDataAction();
      if (updated.data) setData(updated.data);
    } else {
      setLinkStatus({ success: false, message: res.error || 'Failed to link colleague studio.' });
    }
    setLinking(false);
  };

  const filteredPulses = (data?.pulses || []).filter((pulse) => {
    if (activeCategory === 'all') return true;
    return pulse.category === activeCategory;
  });

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
            <p className={styles.pageSubtitle}>Connect with fellow tailors and celebrate daily wins</p>
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
        {/* Buddies Deck */}
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
                <div key={buddy.id} className={styles.buddyCard}>
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
                </div>
              );
            })}

            <button
              className={styles.addBuddyCard}
              onClick={() => setIsConnectModalOpen(true)}
              aria-label="Connect with a tailor"
            >
              <div className={styles.addIconCircle}>
                <Symbol name="add" size={18} />
              </div>
              <span className={styles.addBuddyLabel}>Add Tailor</span>
            </button>
          </div>
        </section>

        {/* Update Filter Tabs */}
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

        {/* Live Workshop Activity Stream */}
        <section className={styles.pulseStream}>
          {loading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Loading tailor updates...</p>
            </div>
          ) : filteredPulses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No activity in this category yet</p>
              <p className={styles.emptyText}>
                When your connected tailors finish orders or hit milestones, their updates will appear here automatically.
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
                          <Symbol name="check_circle" size={13} style={{ color: 'var(--sf-accent-primary, #4f46e5)' }} />
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

      {/* Connect Colleague Modal Sheet */}
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

            {/* Section 1: User's Studio Code */}
            <div className={styles.codeBox}>
              <span className={styles.codeLabel}>Your Invite Code</span>
              <span className={styles.codeValue}>
                {data?.myShop.referralCode || 'GENERATING...'}
              </span>

              <div className={styles.shareActionsRow}>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                  onClick={handleCopyCode}
                >
                  <Symbol name="content_copy" size={15} />
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
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
