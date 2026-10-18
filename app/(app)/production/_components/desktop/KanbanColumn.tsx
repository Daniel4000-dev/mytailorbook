'use client';

import { STATUS_CONFIG } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import OrderListCard from '../OrderListCard';
import type { Order, OrderStatus, Role, User } from '@/lib/types';
import styles from './KanbanColumn.module.css';

function getStageCraftIcon(status: OrderStatus) {
  switch (status) {
    case 'Cutting':
      return 'content_cut';
    case 'Sewing':
      return 'needle';
    case 'Ready':
      return 'checkroom';
    case 'Delivered':
      return 'inventory_2';
    default:
      return 'checkroom';
  }
}

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
  onBatchClick?: (batchId: string) => void;
  onViewCuttingSlip?: (order: Order) => void;
  onWhatsApp?: (order: Order) => void;
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
  onBatchClick,
  onViewCuttingSlip,
  onWhatsApp,
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
        <div className={styles.columnTitleArea}>
          <span className={styles.stageDot} data-stage={status} />
          <h3 className={styles.columnTitle}>{STATUS_CONFIG[status].label}</h3>
        </div>
        <span className={styles.columnCount}>{totalCount}</span>
      </div>
      <div className={styles.columnBody}>
        {orders.length === 0 ? (
          <div className={styles.columnEmpty}>
            <div className={styles.emptyIconBadge}>
              <Symbol name={getStageCraftIcon(status)} size={18} />
            </div>
            <span className={styles.emptyTitle}>No garments</span>
            <span className={styles.emptyHint}>Drag orders here to move to {STATUS_CONFIG[status].label}</span>
          </div>
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
              onBatchClick={onBatchClick}
              hideFooterActions
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(order.id);
              }}
              onDragEnd={onDragEnd}
              onViewCuttingSlip={onViewCuttingSlip}
              onWhatsApp={onWhatsApp}
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
