'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useNotifications, type NotificationItem, type NotificationCategory } from '@/lib/hooks/useNotifications';
import { useNotificationReadState } from '@/lib/hooks/useNotificationReadState';
import { useData } from '@/contexts/DataContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { getInitials } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import Symbol from '@/components/ui/Symbol/Symbol';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import styles from './page.module.css';

type FilterTab = 'all' | NotificationCategory | 'unread';

const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'] as const;

function formatInstagramRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function getInstagramGroupLabel(timestamp: string): typeof GROUP_ORDER[number] {
  const date = new Date(timestamp);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const time = date.getTime();
  if (time >= todayStart) return 'Today';
  if (time >= yesterdayStart) return 'Yesterday';
  if (time >= sevenDaysStart) return 'Last 7 days';
  if (time >= thirtyDaysStart) return 'Last 30 days';
  return 'Older';
}

export default function NotificationsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { currentShop } = useData();
  const { notifications, isLoaded } = useNotifications();
  const { readIds, markRead, markAllRead } = useNotificationReadState();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const filtered = useMemo(() => {
    let list = notifications;

    if (activeTab === 'unread') {
      list = list.filter((n) => !readIds.has(n.id));
    } else if (activeTab !== 'all') {
      list = list.filter((n) => n.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.subtitle.toLowerCase().includes(q) ||
          (n.actorName && n.actorName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notifications, activeTab, searchQuery, readIds]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    filtered.forEach((n) => {
      const label = getInstagramGroupLabel(n.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    });

    return GROUP_ORDER.filter((label) => map.has(label)).map((label) => [label, map.get(label)!] as const);
  }, [filtered]);

  const handleSelect = (n: NotificationItem) => {
    markRead(n.id);
    if (n.href) {
      router.push(n.href);
    } else if (n.orderId) {
      router.push(`/production?order=${n.orderId}`);
    }
  };

  const studioHandle = currentShop?.socialLinks?.instagram || currentShop?.name?.toLowerCase().replace(/\s+/g, '_') || 'mystitchbook_atelier';
  const cleanHandle = studioHandle.startsWith('@') ? studioHandle.slice(1) : studioHandle;

  return (
    <PageLayout width="narrow" padding="none">
      <div className={styles.page}>
        {/* Instagram-Inspired Header */}
        <div className={styles.headerWrap}>
          <button
            type="button"
            className={styles.headerIconBtn}
            onClick={() => router.push(ROUTES.dashboard)}
            aria-label="Back"
          >
            <Symbol name="chevron_left" size={20} />
          </button>

          <button
            type="button"
            className={styles.headerTitleBtn}
            onClick={() => router.push(ROUTES.settingsStudio)}
          >
            <span className={styles.headerHandle}>_{cleanHandle}</span>
            <Symbol name="verified" size={15} className={styles.headerVerified} />
            <Symbol name="expand_more" size={16} className={styles.headerChevron} />
          </button>

          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.headerIconBtn}
                onClick={() => markAllRead(notifications.map((n) => n.id))}
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <Symbol name="done_all" size={18} />
              </button>
            )}
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={() => router.push(ROUTES.settingsMessages)}
              title="Notification settings"
              aria-label="Notification settings"
            >
              <Symbol name="notifications" size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search orders, clients, or alerts..."
          />
        </div>

        {/* Filter Pills */}
        <div className={styles.filterRow} role="tablist">
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
            <span className={styles.filterCount}>{notifications.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'production' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('production')}
          >
            Production
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'clients' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients &amp; Lookbook
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'payments' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className={`${styles.filterPill} ${activeTab === 'unread' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread
              <span className={styles.filterCount}>{unreadCount}</span>
            </button>
          )}
        </div>

        {/* Instagram Activity Grouped List */}
        {groups.length === 0 ? (
          <div className={styles.emptyStateWrap}>
            <Symbol name="notifications_off" size={40} style={{ color: 'var(--sf-text-tertiary)' }} />
            <h3 className={styles.emptyStateTitle}>
              {!isLoaded
                ? 'Loading atelier activity...'
                : activeTab === 'unread'
                ? "You're all caught up"
                : searchQuery
                ? 'No activity matches your search'
                : 'No atelier activity yet'}
            </h3>
            <p className={styles.emptyStateDesc}>
              {activeTab === 'unread'
                ? 'All customer fitting comments, workshop stage transitions, and lookbook reactions have been reviewed.'
                : 'When clients approve quotes, artisans cut fabrics, or payments arrive, they will appear right here.'}
            </p>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className={styles.group}>
              <span className={styles.groupLabel}>{label}</span>
              <div className={styles.rowList}>
                {items.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  const actor = n.actorName || (n.title.split(' ')[0] + ' ' + (n.title.split(' ')[1] || ''));
                  const badgeIcon = n.badgeIcon || (n.tone === 'alert' ? 'warning' : 'check_circle');
                  const badgeBg = n.badgeBg || (n.tone === 'alert' ? '#FEE2E2' : '#D1FAE5');
                  const badgeColor = n.badgeColor || (n.tone === 'alert' ? '#DC2626' : '#059669');

                  return (
                    <div
                      key={n.id}
                      className={`${styles.row} ${isUnread ? styles.rowUnread : ''}`}
                      onClick={() => handleSelect(n)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Left: Avatar with Overlapping Icon Badge */}
                      <div className={styles.avatarWrap}>
                        <div className={styles.avatarCircle}>
                          {n.actorAvatarUrl ? (
                            <Image
                              src={n.actorAvatarUrl}
                              alt={actor}
                              className={styles.avatarImg}
                              width={44}
                              height={44}
                              unoptimized
                            />
                          ) : (
                            <span>{getInitials(actor)}</span>
                          )}
                        </div>
                        <div
                          className={styles.avatarBadge}
                          style={{ background: badgeBg, color: badgeColor }}
                        >
                          <Symbol name={badgeIcon} size={11} />
                        </div>
                      </div>

                      {/* Middle: Instagram Styled Sentence & Action */}
                      <div className={styles.contentCol}>
                        <p className={styles.activitySentence}>
                          <span className={styles.actorName}>{actor}</span>{' '}
                          {n.title.replace(actor, '').trim() || n.title}
                          <span className={styles.timeTag}>
                            {formatInstagramRelativeTime(n.timestamp)}
                          </span>
                        </p>
                        <div className={styles.subActionRow}>
                          {n.actionLabel && (
                            <button
                              type="button"
                              className={styles.actionPillBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(n);
                              }}
                            >
                              {n.actionLabel}
                            </button>
                          )}
                          <span className={styles.subContext}>{n.subtitle}</span>
                        </div>
                      </div>

                      {/* Right: Media Thumbnail or Unread Dot */}
                      <div className={styles.rightWrap}>
                        {n.thumbnailUrl ? (
                          <Image
                            src={n.thumbnailUrl}
                            alt="Media Preview"
                            className={styles.mediaThumb}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.mediaSilhouette}>
                            <Symbol name="checkroom" size={18} />
                          </div>
                        )}
                        {isUnread && <div className={styles.unreadDot} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
}
