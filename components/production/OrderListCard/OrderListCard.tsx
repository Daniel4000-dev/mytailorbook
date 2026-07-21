'use client';

import { useState, useRef } from 'react';
import { truncateText } from '@/lib/formatters';
import { isOverdue, isDueSoon, hasUnreadComment } from '@/lib/types';
import { STATUS_CONFIG, getNextStatus, getPreviousStatus } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { Order, Role, User } from '@/lib/types';
import styles from './OrderListCard.module.css';

interface OrderListCardProps {
  order: Order;
  userRole: Role;
  onOpen: () => void;
  onAdvance?: () => void;
  onRevert?: () => void;
  staffMembers?: User[];
  onReassign?: (orderId: string, staffUid: string, staffName: string) => void;
  index?: number;
}

/** Photo-first production card: a large garment photo with a glass status
 *  pill floating on it, then title/due/customer details, and a footer with
 *  explicit move back / move forward actions. Swipe right/left on touch
 *  keeps advancing/reverting like before. */
export default function OrderListCard({
  order,
  userRole,
  onOpen,
  onAdvance,
  onRevert,
  staffMembers,
  onReassign,
  index = 0,
}: OrderListCardProps) {
  const next = getNextStatus(order.status);
  const prev = getPreviousStatus(order.status);
  const stage = STATUS_CONFIG[order.status];
  // Latest progress photo tells the truest story; fall back to the
  // customer's inspiration photo before the placeholder.
  const photos = order.images || [];
  const photo = photos.length > 0 ? photos[photos.length - 1].url : order.inspirationImages?.[0];

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const gestureDisqualified = useRef(false);

  // Held-then-drag gesture: a quick brush or scroll attempt within this
  // window disqualifies the whole gesture rather than being treated as a
  // (possibly accidental) status-changing swipe.
  const SWIPE_HOLD_DELAY_MS = 150;
  const SWIPE_HOLD_TOLERANCE_PX = 6;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    gestureDisqualified.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || touchStartTime.current === null) return;
    if (gestureDisqualified.current) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    const elapsed = Date.now() - touchStartTime.current;

    if (elapsed < SWIPE_HOLD_DELAY_MS) {
      if (Math.abs(dx) > SWIPE_HOLD_TOLERANCE_PX || Math.abs(dy) > SWIPE_HOLD_TOLERANCE_PX) {
        gestureDisqualified.current = true;
      }
      return;
    }

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setIsSwiping(true);
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = () => {
    gestureDisqualified.current = false;
    touchStartTime.current = null;
    if (!isSwiping) return;

    const SWIPE_THRESHOLD = 80;
    if (swipeOffset > SWIPE_THRESHOLD && onAdvance) onAdvance();
    else if (swipeOffset < -SWIPE_THRESHOLD && onRevert) onRevert();

    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const customerInitials = order.customerName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={styles.card}
      style={{
        transform: swipeOffset ? `translate3d(${swipeOffset}px, 0, 0)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.2s ease',
        animationDelay: `${index * 0.05}s`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Photo area with glass status pill */}
      <div className={styles.photoArea} onClick={onOpen} role="button" tabIndex={0}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={truncateText(order.orderDetails, 30)} className={styles.photoImg} />
        ) : (
          <div className={styles.photoFallback}>
            <Symbol name="content_cut" size={34} />
            <span>No photo yet</span>
          </div>
        )}
        <span className={styles.glassStatus}>
          <span className={styles.statusDot} />
          {stage.label}
        </span>
        {hasUnreadComment(order) && (
          <span className={styles.unreadBadge} title="New customer comment">
            <Symbol name="chat_bubble" size={12} fill />
          </span>
        )}
      </div>

      {/* Content */}
      <div className={styles.content} onClick={onOpen} role="button" tabIndex={0}>
        <div className={styles.titleRow}>
          <div className={styles.titleCol}>
            <h4 className={styles.title}>{truncateText(order.orderDetails, 48)}</h4>
            <DueLine order={order} />
          </div>
          <div className={styles.customerAvatar}>{customerInitials}</div>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.customer}>
            <Symbol name="person" size={16} className={styles.personIcon} />
            {order.customerName}
          </span>
          <span className={styles.metaRight}>
            <span className={styles.orderRef}>#{order.id.slice(0, 4).toUpperCase()}</span>
            {userRole === 'Owner' && onReassign && staffMembers ? (
              <span className={styles.assignee} onClick={(e) => e.stopPropagation()}>
                <span className={styles.assigneeName}>{order.assignedToName?.split(' ')[0] || 'Unassigned'}</span>
                <Symbol name="edit" size={11} />
                <select
                  className={styles.reassignSelect}
                  value={order.assignedTo || ''}
                  aria-label="Reassign order"
                  onChange={(e) => {
                    const uid = e.target.value;
                    const staff = staffMembers.find((s) => s.uid === uid);
                    onReassign(order.id, uid, staff?.name || '');
                  }}
                >
                  <option value="">Unassigned</option>
                  {staffMembers
                    .filter((s) => s.active !== false || s.uid === order.assignedTo)
                    .map((s) => (
                      <option key={s.uid} value={s.uid}>{s.name}</option>
                    ))}
                </select>
              </span>
            ) : (
              order.assignedToName && (
                <span className={styles.assignee}>
                  <span className={styles.assigneeName}>{order.assignedToName.split(' ')[0]}</span>
                </span>
              )
            )}
          </span>
        </div>
      </div>

      {/* Move actions */}
      {(prev || next) && order.status !== 'Completed' && (
        <div className={styles.footer}>
          {prev && onRevert ? (
            <button type="button" className={styles.moveBackBtn} onClick={onRevert}>
              <Symbol name="undo" size={14} />
              <span>Move Back</span>
            </button>
          ) : (
            <span />
          )}
          {next && onAdvance && (
            <button type="button" className={styles.moveNextBtn} onClick={onAdvance}>
              <span>Move to {next}</span>
              <Symbol name="arrow_forward" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** "Due: Tomorrow"-style line; urgent reads in the accent, quiet otherwise. */
function DueLine({ order }: { order: Order }) {
  if (!order.dueDate || order.status === 'Completed') {
    return order.status === 'Ready' ? <p className={styles.dueQuiet}>Awaiting Pickup</p> : null;
  }

  const due = new Date(order.dueDate);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);

  let label: string;
  if (isOverdue(order)) label = 'Overdue';
  else if (dayDiff === 0) label = 'Today';
  else if (dayDiff === 1) label = 'Tomorrow';
  else label = due.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });

  const urgent = isOverdue(order) || dayDiff <= 1 || isDueSoon(order);
  return (
    <p className={styles.dueQuiet}>
      Due: <span className={urgent ? styles.dueUrgent : undefined}>{label}</span>
    </p>
  );
}
