'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell } from 'react-icons/fa6';
import { useNotifications, type NotificationItem } from '@/lib/hooks/useNotifications';
import { useNotificationReadState } from '@/lib/hooks/useNotificationReadState';
import { formatDate } from '@/lib/formatters';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, alertCount: totalAlertCount } = useNotifications();
  const { readIds, markRead } = useNotificationReadState();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadAlertCount = notifications
    .slice(0, totalAlertCount)
    .filter((n) => !readIds.has(n.id)).length;

  const preview = notifications.slice(0, 8);

  const handleSelect = (n: NotificationItem) => {
    markRead(n.id);
    setOpen(false);
    router.push(n.href || `/production?order=${n.orderId}`);
  };

  const handleSeeAll = () => {
    setOpen(false);
    router.push('/notifications');
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        {unreadAlertCount > 0 && <span className={styles.badgeCount}>{unreadAlertCount}</span>}
        <FaBell className={styles.bellIcon} />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Notifications</div>
          {preview.length === 0 ? (
            <div className={styles.emptyState}>You&apos;re all caught up.</div>
          ) : (
            <div className={styles.list}>
              {preview.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.item} ${styles[n.tone]} ${readIds.has(n.id) ? styles.read : ''}`}
                  onClick={() => handleSelect(n)}
                >
                  <span className={styles.itemIcon}>{n.icon}</span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemSubtitle}>{n.subtitle}</span>
                  </span>
                  <span className={styles.itemMeta}>
                    <span className={styles.itemTime}>{formatDate(n.timestamp)}</span>
                    {!readIds.has(n.id) && <span className={styles.unreadDot} />}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className={styles.seeAllBtn} onClick={handleSeeAll}>
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}
