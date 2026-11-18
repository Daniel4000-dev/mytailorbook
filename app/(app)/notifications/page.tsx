'use client';

import { useMemo, useState, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useNotifications, type NotificationItem, type NotificationCategory } from '@/lib/hooks/useNotifications';
import { useNotificationReadState } from '@/lib/hooks/useNotificationReadState';
import { getInitials } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

type FilterTab = 'all' | 'unread' | NotificationCategory;

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'] as const;

function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return `${diffHours}h ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getNotificationGroupLabel(timestamp: string): typeof GROUP_ORDER[number] {
  const date = new Date(timestamp);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const time = date.getTime();
  if (time >= todayStart) return 'Today';
  if (time >= yesterdayStart) return 'Yesterday';
  if (time >= weekStart) return 'This Week';
  return 'Earlier';
}

function getCategorySemantic(category: NotificationCategory, tone?: string) {
  if (tone === 'alert') {
    return { icon: 'warning', className: styles.toneAlert };
  }
  switch (category) {
    case 'payments':
      return { icon: 'payments', className: styles.tonePayments };
    case 'production':
      return { icon: 'straighten', className: styles.toneProduction };
    case 'clients':
      return { icon: 'checkroom', className: styles.toneClients };
    case 'system':
    default:
      return { icon: 'info', className: styles.toneSystem };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, isLoaded } = useNotifications();
  const { readIds, markRead, markAllRead } = useNotificationReadState();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id) && !n.readAt).length,
    [notifications, readIds]
  );

  const filtered = useMemo(() => {
    let list = notifications;

    if (activeTab === 'unread') {
      list = list.filter((n) => !readIds.has(n.id) && !n.readAt);
    } else if (activeTab !== 'all') {
      list = list.filter((n) => n.category === activeTab);
    }

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      list = list.filter(
        (n) =>
          (n.title ?? '').toLowerCase().includes(q) ||
          (n.subtitle ?? '').toLowerCase().includes(q) ||
          (n.actorName && n.actorName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notifications, activeTab, deferredSearchQuery, readIds]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    filtered.forEach((n) => {
      const label = getNotificationGroupLabel(n.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    });

    return GROUP_ORDER.filter((label) => map.has(label)).map(
      (label) => [label, map.get(label)!] as const
    );
  }, [filtered]);

  const handleSelect = (n: NotificationItem) => {
    markRead(n.id);
    if (n.href) {
      router.push(n.href);
    } else if (n.orderId) {
      router.push(`/production?order=${n.orderId}`);
    }
  };

  const handleMarkAll = () => {
    markAllRead(notifications.map((n) => n.id));
  };

  const categoryTabLabels: Record<FilterTab, string> = {
    all: 'All',
    unread: 'Unread',
    production: 'Production',
    clients: 'Clients & Lookbook',
    payments: 'Payments',
    system: 'System',
  };

  return (
    <div className={styles.container}>
      <TopBar
        title="Notifications"
        subtitle={
          !isLoaded
            ? 'Loading updates...'
            : unreadCount > 0
            ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
            : 'All caught up'
        }
        showBack={true}
        onBack={() => router.push(ROUTES.dashboard)}
        rightAction={
          <div className={styles.topActions}>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={handleMarkAll}
                title="Mark all notifications as read"
              >
                <Symbol name="done_all" size={15} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              className={styles.settingsBtn}
              onClick={() => router.push(ROUTES.settingsMessages)}
              title="Notification Settings"
              aria-label="Notification Settings"
            >
              <Symbol name="settings" size={17} />
            </button>
          </div>
        }
      />

      <main className={styles.content}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by order, client, or update..."
        />

        {/* Filter Pills Strip */}
        <div className={styles.filterStrip} role="tablist" aria-label="Filter notifications">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`${styles.filterPill} ${activeTab === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All</span>
            {notifications.length > 0 && (
              <span className={styles.filterBadge}>{notifications.length}</span>
            )}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'unread'}
              className={`${styles.filterPill} ${activeTab === 'unread' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              <span>Unread</span>
              <span className={styles.filterBadge}>{unreadCount}</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'production'}
            className={`${styles.filterPill} ${activeTab === 'production' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('production')}
          >
            <span>Production</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'clients'}
            className={`${styles.filterPill} ${activeTab === 'clients' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            <span>Clients &amp; Lookbook</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'payments'}
            className={`${styles.filterPill} ${activeTab === 'payments' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <span>Payments</span>
          </button>
        </div>

        {/* ── 1. SKELETON LOAD STATE ── */}
        {!isLoaded ? (
          <div className={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton width={42} height={42} borderRadius={12} />
                <div className={styles.skeletonBody}>
                  <Skeleton width={`${55 + (i * 7) % 30}%`} height={15} borderRadius={4} />
                  <Skeleton width={`${75 + (i * 5) % 20}%`} height={13} borderRadius={4} />
                  <Skeleton width={80} height={11} borderRadius={4} style={{ marginTop: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* ── 2. CONTEXTUAL EMPTY STATE ── */
          <div className={styles.emptyCard}>
            <div className={styles.emptyIconCircle}>
              <Symbol
                name={
                  activeTab === 'unread'
                    ? 'check_circle'
                    : searchQuery.trim()
                    ? 'search'
                    : 'notifications'
                }
                size={26}
              />
            </div>
            <h3 className={styles.emptyTitle}>
              {activeTab === 'unread'
                ? "You're All Caught Up"
                : searchQuery.trim()
                ? 'No Matching Notifications'
                : activeTab !== 'all'
                ? `No ${categoryTabLabels[activeTab]} Notifications`
                : 'No Notifications Yet'}
            </h3>
            <p className={styles.emptyDescription}>
              {activeTab === 'unread'
                ? 'All order milestones, fitting appointments, and payments have been reviewed.'
                : searchQuery.trim()
                ? `No notifications found matching "${searchQuery}". Try searching by order reference or client name.`
                : activeTab !== 'all'
                ? `Updates related to ${categoryTabLabels[activeTab].toLowerCase()} will appear here as activity occurs.`
                : 'When clients approve designs, tailors cut fabrics, or payments arrive, updates will appear right here.'}
            </p>
            {(activeTab !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                className={styles.emptyActionBtn}
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
              >
                <Symbol name="done_all" size={15} />
                <span>Show All Activity</span>
              </button>
            )}
          </div>
        ) : (
          /* ── 3. GROUPED NOTIFICATIONS FEED ── */
          groups.map(([label, items]) => (
            <section key={label} className={styles.groupSection}>
              <span className={styles.groupLabel}>{label}</span>
              <div className={styles.cardsList}>
                {items.map((n) => {
                  const isUnread = !readIds.has(n.id) && !n.readAt;
                  const semantic = getCategorySemantic(n.category, n.tone);
                  const actor = n.actorName || '';

                  return (
                    <article
                      key={n.id}
                      className={`${styles.card} ${isUnread ? styles.cardUnread : ''}`}
                      onClick={() => handleSelect(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(n);
                        }
                      }}
                    >
                      {/* Left: Avatar or Semantic Icon */}
                      <div className={styles.iconWrap}>
                        {n.actorAvatarUrl ? (
                          <div className={styles.avatarCircle}>
                            <Image
                              src={n.actorAvatarUrl}
                              alt={actor || 'Avatar'}
                              className={styles.avatarImg}
                              width={42}
                              height={42}
                              unoptimized
                            />
                            {n.badgeIcon && (
                              <div
                                className={styles.avatarBadge}
                                style={{
                                  background: n.badgeBg || '#4F46E5',
                                  color: n.badgeColor || '#FFFFFF',
                                }}
                              >
                                <Symbol name={n.badgeIcon} size={10} />
                              </div>
                            )}
                          </div>
                        ) : actor ? (
                          <div className={styles.avatarCircle}>
                            <span>{getInitials(actor)}</span>
                          </div>
                        ) : (
                          <div className={`${styles.iconWrap} ${semantic.className}`}>
                            <Symbol name={semantic.icon} size={20} />
                          </div>
                        )}
                      </div>

                      {/* Middle: Content Body */}
                      <div className={styles.cardBody}>
                        <div className={styles.cardHeaderRow}>
                          <span className={styles.cardTitle}>{n.title}</span>
                          {isUnread && <span className={styles.unreadDot} aria-label="Unread notification" />}
                        </div>
                        {n.subtitle && (
                          <span className={styles.cardSubtitle}>{n.subtitle}</span>
                        )}
                        <div className={styles.cardMetaRow}>
                          <span className={styles.timeTag}>
                            {formatNotificationTime(n.timestamp)}
                          </span>
                          {n.actionLabel && (
                            <button
                              type="button"
                              className={styles.actionPill}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(n);
                              }}
                            >
                              <span>{n.actionLabel}</span>
                              <Symbol name="chevron_right" size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Media Thumbnail & Directional Chevron */}
                      <div className={styles.cardRight}>
                        {n.thumbnailUrl && (
                          <Image
                            src={n.thumbnailUrl}
                            alt="Media Preview"
                            className={styles.thumbPreview}
                            width={42}
                            height={42}
                            unoptimized
                          />
                        )}
                        <Symbol name="chevron_right" size={18} className={styles.chevronIcon} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
