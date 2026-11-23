'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, type NotificationItem } from '@/lib/hooks/useNotifications';
import { useNotificationReadState } from '@/lib/hooks/useNotificationReadState';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { formatDate } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import styles from './NotificationBell.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface NotificationBellProps {
  variant?: 'default' | 'glass';
}

export default function NotificationBell({ variant = 'default' }: NotificationBellProps = {}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, isLoaded } = useNotifications();
  const { readIds, markRead, markAllRead } = useNotificationReadState();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id) && !n.readAt).length;
  const preview = notifications.slice(0, 8);

  const handleToggle = () => {
    if (!isDesktop) {
      router.push(ROUTES.notifications);
      return;
    }
    setOpen((v) => !v);
  };

  const handleSelect = (n: NotificationItem) => {
    markRead(n.id);
    setOpen(false);
    if (n.href) {
      router.push(n.href);
    } else if (n.orderId) {
      router.push(`/production?order=${n.orderId}`);
    } else {
      router.push(`${ROUTES.notifications}?id=${n.id}`);
    }
  };

  const handleSeeAll = () => {
    setOpen(false);
    router.push(ROUTES.notifications);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.bellBtn} ${variant === 'glass' ? styles.bellBtnGlass : ''}`}
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        {unreadCount > 0 && (
          <span className={styles.badgeCount}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
        <Symbol name="notifications" className={styles.bellIcon} />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.headerLeft}>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className={styles.headerUnreadBadge}>
                  {unreadCount > 9 ? '9+ new' : `${unreadCount} new`}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={() => markAllRead(notifications.map((n) => n.id))}
                title="Mark all notifications as read"
              >
                Mark all read
              </button>
            )}
          </div>
          {!isLoaded ? (
            <div className={styles.emptyState}>Loading notifications...</div>
          ) : preview.length === 0 ? (
            <div className={styles.emptyState}>You&apos;re all caught up.</div>
          ) : (
            <div className={styles.list}>
              {preview.map((n) => {
                const isUnread = !readIds.has(n.id) && !n.readAt;
                const badgeIcon = n.badgeIcon || (n.tone === 'alert' ? 'warning' : 'check_circle');
                const badgeColor = n.badgeColor || (n.tone === 'alert' ? '#DC2626' : '#047857');

                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`${styles.item} ${styles[n.tone]} ${isUnread ? styles.unread : styles.read}`}
                    onClick={() => handleSelect(n)}
                  >
                    <span className={styles.itemIcon} style={{ color: badgeColor }}>
                      <Symbol name={badgeIcon} size={18} />
                    </span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{n.title || 'Notification'}</span>
                      <span className={styles.itemSubtitle}>{n.subtitle}</span>
                    </span>
                    <span className={styles.itemMeta}>
                      <span className={styles.itemTime}>{formatDate(n.timestamp)}</span>
                      {isUnread && <span className={styles.unreadDot} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" className={styles.seeAllBtn} onClick={handleSeeAll}>
            See all activity
          </button>
        </div>
      )}
    </div>
  );
}
