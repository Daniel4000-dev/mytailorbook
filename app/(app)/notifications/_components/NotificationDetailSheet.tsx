'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getInitials } from '@/lib/formatters';
import type { NotificationItem } from '@/lib/hooks/useNotifications';
import styles from './NotificationDetailSheet.module.css';

interface NotificationDetailSheetProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}

function formatFullDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function NotificationDetailSheet({
  notification,
  isOpen,
  onClose,
  onNavigate,
}: NotificationDetailSheetProps) {
  const router = useRouter();

  if (!notification) return null;

  const actor = notification.actorName || 'MyStitchBook';
  const categoryLabel =
    notification.category === 'system'
      ? 'System Announcement'
      : notification.category === 'production'
      ? 'Production Update'
      : notification.category === 'clients'
      ? 'Client & Lookbook'
      : notification.category === 'payments'
      ? 'Payment & Billing'
      : 'Notification';

  const categoryIcon =
    notification.tone === 'alert'
      ? 'warning'
      : notification.category === 'payments'
      ? 'payments'
      : notification.category === 'production'
      ? 'straighten'
      : notification.category === 'clients'
      ? 'checkroom'
      : 'campaign';

  const categoryToneClass =
    notification.tone === 'alert'
      ? styles.toneAlertBadge
      : notification.category === 'payments'
      ? styles.tonePaymentsBadge
      : notification.category === 'production'
      ? styles.toneProductionBadge
      : notification.category === 'clients'
      ? styles.toneClientsBadge
      : '';

  const handleActionClick = () => {
    onClose();
    if (notification.href) {
      if (onNavigate) {
        onNavigate(notification.href);
      } else {
        router.push(notification.href);
      }
    } else if (notification.orderId) {
      router.push(`/production?order=${notification.orderId}`);
    }
  };

  const hasAction = Boolean(notification.href || notification.orderId);
  const actionText = notification.actionLabel || (notification.orderId ? 'View Order in Workshop' : 'Open Details');

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={categoryLabel}
      variant="modal"
      footer={
        <div className={styles.footerActions}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
          {hasAction && (
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={handleActionClick}
            >
              <span>{actionText}</span>
              <Symbol name="chevron_right" size={14} />
            </button>
          )}
        </div>
      }
    >
      <div className={styles.sheetBody}>
        {/* Category & Status Bar */}
        <div className={styles.categoryRow}>
          <span className={`${styles.categoryBadge} ${categoryToneClass}`}>
            <Symbol name={categoryIcon} size={14} />
            {categoryLabel}
          </span>
          <span className={styles.readStatusPill}>
            <span className={notification.readAt ? styles.readDot : styles.unreadDot} />
            {notification.readAt ? 'Read' : 'New'}
          </span>
        </div>

        {/* Title */}
        <h2 className={styles.title}>{notification.title}</h2>

        {/* Sender & Timestamp Card */}
        <div className={styles.metaCard}>
          <div className={styles.senderAvatar}>
            {notification.actorAvatarUrl ? (
              <Image
                src={notification.actorAvatarUrl}
                alt={actor}
                width={38}
                height={38}
                className={styles.senderAvatarImg}
                unoptimized
              />
            ) : (
              <span>{getInitials(actor)}</span>
            )}
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.senderName}>{actor}</span>
            <span className={styles.timestamp}>{formatFullDate(notification.timestamp)}</span>
          </div>
        </div>

        {/* Message Content */}
        <div className={styles.messageContentBox}>
          {notification.subtitle ? (
            <div className={styles.messageText}>{notification.subtitle}</div>
          ) : (
            <div className={styles.messageText}>No additional message body provided.</div>
          )}

          {/* Optional Media Preview */}
          {notification.thumbnailUrl && (
            <div className={styles.mediaWrap}>
              <Image
                src={notification.thumbnailUrl}
                alt="Notification media preview"
                width={400}
                height={200}
                className={styles.mediaImg}
                unoptimized
              />
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

