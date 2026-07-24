'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBellSlash, FaCheckDouble } from 'react-icons/fa6';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useNotificationReadState } from '@/lib/hooks/useNotificationReadState';
import { formatDate } from '@/lib/formatters';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import SearchBar from '@/components/ui/SearchBar/SearchBar';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import styles from './page.module.css';

type FilterMode = 'all' | 'unread' | 'read';

function groupLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const dateDay = Math.floor(date.setHours(0, 0, 0, 0) / dayMs);
  const todayDay = Math.floor(new Date(now).setHours(0, 0, 0, 0) / dayMs);
  if (dateDay === todayDay) return 'Today';
  if (dateDay === todayDay - 1) return 'Yesterday';
  return 'Earlier';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications } = useNotifications();
  const { readIds, markRead, markAllRead } = useNotificationReadState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const unreadCount = useMemo(() => notifications.filter((n) => !readIds.has(n.id)).length, [notifications, readIds]);
  const readCount = notifications.length - unreadCount;

  const filtered = useMemo(() => {
    let list = notifications;
    if (filter === 'unread') list = list.filter((n) => !readIds.has(n.id));
    if (filter === 'read') list = list.filter((n) => readIds.has(n.id));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, filter, query, readIds]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((n) => {
      const label = groupLabel(n.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const handleSelect = (orderId: string, id: string) => {
    markRead(id);
    router.push(`/production?order=${orderId}`);
  };

  return (
    <PageLayout
      header={
        <TopBar
          title="Notifications"
          showBack
          rightAction={
            unreadCount > 0 ? (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={() => markAllRead(notifications.map((n) => n.id))}
                title="Mark all as read"
              >
                <FaCheckDouble />
              </button>
            ) : undefined
          }
        />
      }
    >
      <SearchBar value={query} onChange={setQuery} placeholder="Search notifications..." />

      <div className={styles.pillRow}>
        <FilterPill label="All" count={notifications.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterPill label="Unread" count={unreadCount} active={filter === 'unread'} onClick={() => setFilter('unread')} />
        <FilterPill label="Read" count={readCount} active={filter === 'read'} onClick={() => setFilter('read')} />
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyState}>
          <FaBellSlash className={styles.emptyIcon} />
          <span>
            {filter === 'unread'
              ? "You're all caught up — nothing unread."
              : filter === 'read'
              ? 'Nothing read yet.'
              : query
              ? 'No notifications match your search.'
              : 'No notifications yet.'}
          </span>
        </div>
      ) : (
        groups.map(([label, items]) => (
          <div key={label} className={styles.group}>
            <span className={styles.groupLabel}>{label}</span>
            <div className={styles.rowList}>
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.row} ${readIds.has(n.id) ? styles.read : ''}`}
                  onClick={() => handleSelect(n.orderId, n.id)}
                >
                  <span className={`${styles.rowIcon} ${styles[n.tone]}`}>{n.icon}</span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{n.title}</span>
                    <span className={styles.rowSubtitle}>{n.subtitle}</span>
                  </span>
                  <span className={styles.rowMeta}>
                    <span className={styles.rowTime}>{formatDate(n.timestamp)}</span>
                    {!readIds.has(n.id) && <span className={styles.unreadDot} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </PageLayout>
  );
}
