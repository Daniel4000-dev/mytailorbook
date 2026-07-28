import { ORDER_STATUSES } from '@/lib/constants';
import type { Order, OrderStatus, Role, User } from '@/lib/types';
import KanbanColumn from './KanbanColumn';
import styles from '../ProductionBoard.module.css';

interface KanbanColumnsProps {
  getOrdersByStatus: (status: OrderStatus) => Order[];
  stageVisibleCounts: Partial<Record<OrderStatus, number>>;
  stagePageSize: number;
  onShowMore: (status: OrderStatus) => void;
  userRole: Role;
  staffMembers: User[];
  dragOverStatus: OrderStatus | null;
  onOpen: (orderId: string) => void;
  onReassign: (orderId: string, staffUid: string, staffName: string) => void;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onDragOver: (status: OrderStatus) => void;
  onDrop: (status: OrderStatus) => void;
}

/** Real Kanban columns — every stage visible side by side, drag a card
 *  between columns to change its status. Stage filter pills don't make
 *  sense here (all stages are already on screen at once), and drag
 *  replaces the mobile card's Move Back/Move to X footer buttons. */
export default function KanbanColumns({
  getOrdersByStatus,
  stageVisibleCounts,
  stagePageSize,
  onShowMore,
  userRole,
  staffMembers,
  dragOverStatus,
  onOpen,
  onReassign,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: KanbanColumnsProps) {
  return (
    <div className={styles.columnsRow}>
      {ORDER_STATUSES.map((status) => {
        const stageOrders = getOrdersByStatus(status);
        const visibleCount = stageVisibleCounts[status] ?? stagePageSize;
        return (
          <KanbanColumn
            key={status}
            status={status}
            orders={stageOrders.slice(0, visibleCount)}
            totalCount={stageOrders.length}
            onShowMore={() => onShowMore(status)}
            userRole={userRole}
            staffMembers={staffMembers}
            isDropTarget={dragOverStatus === status}
            onOpen={onOpen}
            onReassign={onReassign}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        );
      })}
    </div>
  );
}
