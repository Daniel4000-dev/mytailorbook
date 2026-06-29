'use client';

import { useState, useRef } from 'react';
import { FaEllipsisVertical, FaRegFolder, FaUser, FaPen, FaGripVertical, FaChevronRight } from 'react-icons/fa6';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { truncateText } from '@/lib/formatters';
import { getBalanceOwed, isOverdue, isDueSoon } from '@/lib/types';
import type { Order, Role } from '@/lib/types';
import styles from './OrderCard.module.css';

interface OrderCardProps {
  order: Order;
  userRole: Role;
  onClick: () => void;
  onAdvance?: () => void;
  onRevert?: () => void;
  index?: number;
}

export default function OrderCard({ order, userRole, onClick, onAdvance, onRevert, index = 0 }: OrderCardProps) {
  const overdue = isOverdue(order);
  const dueSoon = isDueSoon(order);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setIsSwiping(true);
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    const SWIPE_THRESHOLD = 80;
    
    if (swipeOffset > SWIPE_THRESHOLD && onAdvance) {
      onAdvance();
    } else if (swipeOffset < -SWIPE_THRESHOLD && onRevert) {
      onRevert();
    }
    
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  let finalTransform = CSS.Translate.toString(transform);
  if (!finalTransform && swipeOffset !== 0) {
    finalTransform = `translate3d(${swipeOffset}px, 0, 0)`;
  }

  const mergedStyle = {
    transform: finalTransform,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.8 : 1,
    transition: isSwiping || isDragging ? 'none' : 'transform 0.2s ease',
    animationDelay: `${index * 0.05}s`
  };

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getGarmentTag = (details: string) => {
    const lowercase = details.toLowerCase();
    if (lowercase.includes('gown') || lowercase.includes('dress')) return '#Dress';
    if (lowercase.includes('suit') || lowercase.includes('blazer')) return '#Suit';
    if (lowercase.includes('agbada')) return '#Agbada';
    if (lowercase.includes('shirt') || lowercase.includes('top')) return '#Shirt';
    if (lowercase.includes('pants') || lowercase.includes('trouser')) return '#Trousers';
    if (lowercase.includes('ankara')) return '#Ankara';
    if (lowercase.includes('lace')) return '#Lace';
    return '#Custom';
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`${styles.card} ${isSwiping ? styles.swiping : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
    >
      <div className={styles.body}>
        {/* Top line: Customer name and Options/Drag button */}
        <div className={styles.topRow}>
          <h4 className={styles.customerName}>{order.customerName}</h4>
          <div className={styles.cardActions}>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              aria-label="Options"
            >
              <FaEllipsisVertical />
            </button>
            <button
              className={styles.dragHandle}
              {...listeners}
              {...attributes}
              aria-label="Drag Handle"
              onClick={(e) => e.stopPropagation()}
            >
              <FaGripVertical />
            </button>
            {onAdvance && (
              <button
                className={styles.advanceBtnMobile}
                onClick={(e) => { e.stopPropagation(); onAdvance(); }}
                aria-label="Next stage"
              >
                <FaChevronRight />
              </button>
            )}
          </div>
        </div>

        {/* Task description */}
        <p className={styles.details}>{truncateText(order.orderDetails, 70)}</p>

        {/* Due Date & Folder Row */}
        <div className={styles.dueDateRow}>
          <span className={`${styles.dueDate} ${overdue ? styles.overdueText : dueSoon ? styles.dueSoonText : ''}`}>
            {order.status === 'Completed' ? 'Completed on: ' : 'Due on: '}
            {formatDueDate(order.dueDate || order.updatedAt)}
          </span>
          <FaRegFolder className={styles.folderIcon} />
        </div>

        <div className={styles.cardDivider} />

        {/* Bottom row: Assignee pill and Category tag */}
        <div className={styles.bottomRow}>
          <div className={styles.assigneePill}>
            <div className={styles.avatarCircle}>
              {order.assignedToName ? order.assignedToName[0] : <FaUser className={styles.fallbackUserIcon} />}
            </div>
            <span className={styles.assigneeName}>
              {order.assignedToName ? order.assignedToName.split(' ')[0] : 'Unassigned'}
            </span>
            {order.assignedToName && <FaPen className={styles.pencilIcon} />}
          </div>

          <span className={styles.garmentTag}>
            {getGarmentTag(order.orderDetails)}
          </span>
        </div>
      </div>
    </div>
  );
}
