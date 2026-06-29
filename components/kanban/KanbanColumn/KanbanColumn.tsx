'use client';

import { useDroppable, useDndContext } from '@dnd-kit/core';
import { FaInbox } from 'react-icons/fa6';
import OrderCard from '@/components/kanban/OrderCard/OrderCard';
import { STATUS_CONFIG } from '@/lib/constants';
import type { Order, OrderStatus, Role } from '@/lib/types';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  status: OrderStatus;
  orders: Order[];
  userRole: Role;
  onCardClick: (order: Order) => void;
  onAdvance: (orderId: string) => void;
  onRevert?: (orderId: string) => void;
}

export default function KanbanColumn({ status, orders, userRole, onCardClick, onAdvance, onRevert }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { active } = useDndContext();
  
  const draggedOrder = active?.data.current?.order as Order | undefined;
  const showPlaceholder = isOver && draggedOrder && draggedOrder.status !== status;

  return (
    <div className={styles.column} ref={setNodeRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>{config.label}</h3>
        <span className={styles.count}>
          {orders.length}
        </span>
      </div>
      <div className={`${styles.list} ${isOver ? styles.dropTarget : ''}`}>
        {orders.length === 0 && !showPlaceholder ? (
          <div className={styles.empty}>
            <FaInbox />
            <span>No orders</span>
          </div>
        ) : (
          <>
            {showPlaceholder && (
              <div className={styles.placeholderWrapper}>
                <OrderCard
                  order={draggedOrder}
                  userRole={userRole}
                  onClick={() => {}}
                  index={0}
                />
              </div>
            )}
            {orders.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                userRole={userRole}
                onClick={() => onCardClick(order)}
                onAdvance={() => onAdvance(order.id)}
                onRevert={onRevert ? () => onRevert(order.id) : undefined}
                index={i + (showPlaceholder ? 1 : 0)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
