'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { FREE_ORDER_PROGRESS_PHOTO_LIMIT, PREMIUM_STATUSES } from '@/lib/subscription';
import { truncateText, formatNumber } from '@/lib/formatters';
import { isOverdue, isDueSoon, hasUnreadComment, isOwnerLikeRole, getBalanceOwed, CRAFT_ROLE_LABELS } from '@/lib/types';
import { getNextStatus, getPreviousStatus } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import type { Order, Role, User, OrderPhoto } from '@/lib/types';
import styles from './OrderListCard.module.css';

interface OrderListCardProps {
  order: Order;
  userRole: Role;
  onOpen: () => void;
  onAdvance?: () => void;
  onRevert?: () => void;
  staffMembers?: User[];
  onReassign?: (orderId: string, staffUid: string, staffName: string) => void;
  onBatchClick?: (batchId: string) => void;
  index?: number;
  /** Desktop Kanban columns replace Move Back/Move to X with drag-and-drop
   *  between columns — the footer buttons would be redundant there. */
  hideFooterActions?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onViewCuttingSlip?: (order: Order) => void;
  onWhatsApp?: (order: Order) => void;
}

/** Photo-first production card: a large garment photo with a glass status
 *  pill floating on it, then title/due/customer details, and a footer with
 *  explicit move back / move forward actions. Swipe right/left on touch
 *  keeps advancing/reverting with fluid native physics. */
export default function OrderListCard({
  order,
  userRole,
  onOpen,
  onAdvance,
  onRevert,
  staffMembers,
  onReassign,
  onBatchClick,
  index = 0,
  hideFooterActions = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onViewCuttingSlip,
  onWhatsApp,
}: OrderListCardProps) {
  const { user } = useAuth();
  const { currentShop, updateOrder, exceptions, resolveException } = useData();
  const { showToast } = useToast();
  const next = getNextStatus(order.status);
  const prev = getPreviousStatus(order.status);
  const balanceOwed = getBalanceOwed(order);
  const activeException = exceptions.find((e) => e.orderId === order.id && !e.endDate);

  // Latest progress photo tells the truest story; fall back to the
  // customer's inspiration photo before the placeholder.
  const photos = order.images || [];
  const photo = photos.length > 0 ? photos[photos.length - 1].url : order.inspirationImages?.[0];

  const fabricMatch = order.orderDetails.match(/\[Fabric:\s*([^\]]+)\]/i);
  const fabricNote = fabricMatch ? fabricMatch[1] : null;
  const cleanOrderDetails = order.orderDetails.replace(/\[Fabric:\s*[^\]]+\]/i, '').trim();

  const batchMatch = order.orderDetails.match(/\((\d+\s*of\s*\d+)\)/i);
  const batchLabel = batchMatch ? `Batch • ${batchMatch[1]}` : 'Batch';

  // Photo quick-snap directly from workshop floor
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPremium = !!currentShop && PREMIUM_STATUSES.includes(currentShop.subscriptionStatus);
    if (!isPremium && (order.images?.length || 0) >= FREE_ORDER_PROGRESS_PHOTO_LIMIT) {
      showToast(`Free plan limit: ${FREE_ORDER_PROGRESS_PHOTO_LIMIT} progress photos per order. Upgrade to add more.`, 'error');
      e.target.value = '';
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const supabase = createClient();
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `${order.shopId}/${order.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('order-photos').upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const url = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
      const newPhoto: OrderPhoto = {
        url,
        stage: order.status,
        uploadedAt: new Date().toISOString(),
      };
      await updateOrder(order.id, {
        images: [...(order.images || []), newPhoto],
      });
      showToast('Progress photo added!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Fluid iOS-style touch swipe gesture with direction locking & peek reveal
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isVerticalScroll = useRef(false);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isVerticalScroll.current = false;
    isHorizontalSwipe.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (isVerticalScroll.current) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Detect direction early to let native vertical scroll proceed smoothly
    if (!isHorizontalSwipe.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        isVerticalScroll.current = true;
        return;
      }
      if (Math.abs(dx) > 1.2 * Math.abs(dy) && Math.abs(dx) > 8) {
        isHorizontalSwipe.current = true;
      } else {
        return;
      }
    }

    setIsSwiping(true);

    // Apply soft rubber resistance if dragging in unavailable direction
    let adjustedDx = dx;
    if (dx > 0 && (!next || order.status === 'Delivered')) {
      adjustedDx = dx * 0.25;
    } else if (dx < 0 && !prev) {
      adjustedDx = dx * 0.25;
    } else if (Math.abs(dx) > 120) {
      adjustedDx = Math.sign(dx) * (120 + (Math.abs(dx) - 120) * 0.35);
    }

    setSwipeOffset(adjustedDx);
  };

  const handleTouchEnd = () => {
    const SWIPE_THRESHOLD = 75;
    if (isHorizontalSwipe.current && isSwiping) {
      if (swipeOffset > SWIPE_THRESHOLD && onAdvance && order.status !== 'Delivered') {
        onAdvance();
      } else if (swipeOffset < -SWIPE_THRESHOLD && onRevert && prev) {
        onRevert();
      }
    }

    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
    isVerticalScroll.current = false;
    isHorizontalSwipe.current = false;
  };

  const customerInitials = (order.customerName || 'Batch')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={styles.cardWrapper}>
      {/* Live Peek-and-Reveal Backdrops */}
      {swipeOffset > 10 && next && order.status !== 'Delivered' && (
        <div className={styles.swipeBackdropRight}>
          <Symbol name="arrow_forward" size={16} />
          <span>Move to {next}</span>
        </div>
      )}
      {swipeOffset < -10 && prev && (
        <div className={styles.swipeBackdropLeft}>
          <span>Move Back</span>
          <Symbol name="undo" size={16} />
        </div>
      )}

      <div
        className={`${styles.card} ${draggable ? styles.draggableCard : ''}`}
        style={{
          transform: swipeOffset ? `translate3d(${swipeOffset}px, 0, 0)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          animationDelay: `${index * 0.05}s`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Photo area */}
        <div className={styles.photoArea} onClick={onOpen} role="button" tabIndex={0}>
          {photo ? (
            <Image src={photo} alt={truncateText(cleanOrderDetails || order.orderDetails, 30)} fill sizes="(max-width: 768px) 50vw, 300px" className={styles.photoImg} />
          ) : (
            <div className={styles.photoFallback}>
              <div className={styles.fallbackIconCircle}>
                <Symbol name="content_cut" size={24} />
              </div>
              <span className={styles.fallbackStyleName}>{order.styleName || 'Custom Garment'}</span>
              <span className={styles.fallbackHint}>Tap to view details</span>
            </div>
          )}

          {/* Priority, Hold and Batch Badges */}
          <div className={styles.badgeOverlayLeft}>
            {activeException && (
              <span
                className={styles.holdBadge}
                title={`On Hold: ${activeException.reason || 'Workshop delay'}. Click to resolve.`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm(`Resolve hold for this order?\nReason: ${activeException.reason || 'Workshop delay'}`)) {
                    await resolveException(activeException.id);
                    showToast('Hold resolved', 'success');
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <Symbol name="warning" size={10} fill />
                <span>{activeException.reason ? truncateText(activeException.reason, 14) : 'ON HOLD'}</span>
              </span>
            )}
            {order.priority === 'rush' && (
              <span className={styles.rushBadge}>
                <Symbol name="bolt" size={10} fill />
                <span>RUSH</span>
              </span>
            )}
            {order.priority === 'urgent' && (
              <span className={styles.urgentBadge}>
                <Symbol name="schedule" size={10} />
                <span>URGENT</span>
              </span>
            )}
            {order.batchId && (
              <span
                className={`${styles.batchBadge} ${onBatchClick ? styles.batchBadgeInteractive : ''}`}
                onClick={onBatchClick ? (e) => {
                  e.stopPropagation();
                  onBatchClick(order.batchId!);
                } : undefined}
                role={onBatchClick ? 'button' : undefined}
                tabIndex={onBatchClick ? 0 : undefined}
                title={onBatchClick ? 'Filter by this batch' : undefined}
              >
                <Symbol name="layers" size={11} />
                {batchLabel}
              </span>
            )}
          </div>

          {/* Quick action buttons */}
          <div className={styles.cardActionGroup}>
            <button
              type="button"
              className={styles.cardActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploadingPhoto}
              aria-label="Snap progress photo"
              title="Snap progress photo"
            >
              <Symbol
                name={isUploadingPhoto ? 'progress_activity' : 'photo_camera'}
                size={14}
                className={isUploadingPhoto ? styles.spinner : undefined}
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handlePhotoCapture}
            />
            {onViewCuttingSlip && (
              <button
                type="button"
                className={styles.cardActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCuttingSlip(order);
                }}
                aria-label="View cutting slip"
                title="View Cutting Slip & Measurements"
              >
                <Symbol name="content_cut" size={14} />
              </button>
            )}
            {onWhatsApp && (
              <button
                type="button"
                className={styles.cardActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp(order);
                }}
                aria-label="WhatsApp customer"
                title="WhatsApp Customer"
              >
                <WhatsappIcon size={14} />
              </button>
            )}
            {hasUnreadComment(order) && (
              <span className={styles.unreadBadge} title="New customer comment">
                <Symbol name="chat_bubble" size={12} fill />
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content} onClick={onOpen} role="button" tabIndex={0}>
          <div className={styles.titleRow}>
            <div className={styles.titleCol}>
              <h4 className={styles.title}>{truncateText(cleanOrderDetails || order.orderDetails, 48)}</h4>
              <DueLine order={order} />
            </div>
            <div className={styles.customerAvatar}>{customerInitials}</div>
          </div>

          <div className={styles.pillRow}>
            {balanceOwed > 0 ? (
              <span className={styles.balanceDuePill}>₦{formatNumber(balanceOwed)} Due</span>
            ) : (
              <span className={styles.paidPill}>
                <Symbol name="check" size={11} /> Paid
              </span>
            )}
            {fabricNote && (
              <span className={styles.fabricPill} title={`Fabric: ${fabricNote}`}>
                <Symbol name="texture" size={11} /> {truncateText(fabricNote, 18)}
              </span>
            )}
          </div>

          <div className={styles.metaRow}>
            <span className={styles.customer}>
              <Symbol name="person" size={16} className={styles.personIcon} />
              {order.customerName}
            </span>
            <span className={styles.metaRight}>
              <span className={styles.orderRef}>#{order.id.slice(0, 4).toUpperCase()}</span>
              {isOwnerLikeRole(userRole) && onReassign && staffMembers ? (
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
                        <option key={s.uid} value={s.uid}>
                          {s.name} {s.craftRole ? `(${CRAFT_ROLE_LABELS[s.craftRole]})` : ''}
                        </option>
                      ))}
                  </select>
                </span>
              ) : onReassign && user && !order.assignedTo ? (
                <button
                  type="button"
                  className={styles.claimBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReassign(order.id, user.uid, user.name);
                  }}
                  title="Claim this task for yourself"
                >
                  <Symbol name="person_add" size={11} />
                  <span>Claim</span>
                </button>
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
        {!hideFooterActions && (prev || next) && order.status !== 'Delivered' && (
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
    </div>
  );
}

/** "Due: Tomorrow"-style line; urgent reads in the accent, quiet otherwise. */
function DueLine({ order }: { order: Order }) {
  if (!order.dueDate || order.status === 'Delivered') {
    return order.status === 'Ready' ? <p className={styles.dueQuiet}>Awaiting Pickup</p> : null;
  }

  const due = new Date(order.dueDate);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);

  let label: string;
  if (isOverdue(order)) label = 'Overdue';
  else if (order.priority === 'rush') label = dayDiff === 0 ? 'Today (Rush)' : dayDiff === 1 ? 'Tomorrow (Rush)' : `${due.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} (Rush)`;
  else if (dayDiff === 0) label = 'Today';
  else if (dayDiff === 1) label = 'Tomorrow';
  else label = due.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });

  const urgent = isOverdue(order) || dayDiff <= 1 || isDueSoon(order) || order.priority === 'rush' || order.priority === 'urgent';
  return (
    <p className={styles.dueQuiet}>
      Due: <span className={urgent ? styles.dueUrgent : undefined}>{label}</span>
    </p>
  );
}
