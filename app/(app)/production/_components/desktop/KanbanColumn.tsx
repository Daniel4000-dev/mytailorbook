'use client';

import { STATUS_CONFIG } from '@/lib/constants';
import OrderListCard from '@/components/production/OrderListCard/OrderListCard';
import type { Order, OrderStatus, Role, User } from '@/lib/types';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  status: OrderStatus;
  /** Already sliced to the currently-visible page — the column itself
   *  never renders an unbounded list. */
  orders: Order[];
  /** Full count for this stage, before slicing — used for the "N more"
   *  button and to know when everything is already shown. */
  totalCount: number;
  onShowMore: () => void;
  userRole: Role;
  staffMembers: User[];
  isDropTarget: boolean;
  onOpen: (orderId: string) => void;
  onReassign: (orderId: string, staffUid: string, staffName: string) => void;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onDragOver: (status: OrderStatus) => void;
  onDrop: (status: OrderStatus) => void;
}

/** One stage as a real Kanban column — desktop only. Cards are dragged
 *  between columns to change status instead of the mobile card's Move
 *  Back/Move to X footer buttons. */
export default function KanbanColumn({
  status,
  orders,
  totalCount,
  onShowMore,
  userRole,
  staffMembers,
  isDropTarget,
  onOpen,
  onReassign,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  return (
    <div
      className={`${styles.column} ${isDropTarget ? styles.dropTarget : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(status);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
      }}
    >
      <div className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>{STATUS_CONFIG[status].label}</h3>
        <span className={styles.columnCount}>{totalCount}</span>
      </div>
      <div className={styles.columnBody}>
        {orders.length === 0 ? (
          <div className={styles.columnEmpty}>Drop an order here</div>
        ) : (
          orders.map((order, i) => (
            <OrderListCard
              key={order.id}
              order={order}
              userRole={userRole}
              index={i}
              onOpen={() => onOpen(order.id)}
              staffMembers={staffMembers}
              onReassign={onReassign}
              hideFooterActions
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(order.id);
              }}
              onDragEnd={onDragEnd}
            />
          ))
        )}
        {totalCount > orders.length && (
          <button type="button" className={styles.showMoreBtn} onClick={onShowMore}>
            Show {Math.min(orders.length + 15, totalCount) - orders.length} more ({totalCount - orders.length} remaining)
          </button>
        )}
      </div>
    </div>
  );
}
