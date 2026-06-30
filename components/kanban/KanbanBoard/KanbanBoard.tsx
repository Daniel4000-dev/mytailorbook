'use client';

import { useState, useCallback, useMemo } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { FaFilter, FaListCheck, FaTimeline, FaUser, FaCalendarDays, FaClock, FaRegCommentDots, FaLink, FaWhatsapp, FaCreditCard, FaChevronDown, FaChevronUp, FaArrowRight } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import KanbanColumn from '@/components/kanban/KanbanColumn/KanbanColumn';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import ActivityTimeline from '@/components/kanban/ActivityTimeline/ActivityTimeline';
import OrderDetailSheet from '@/components/kanban/OrderDetailSheet/OrderDetailSheet';
import { PRODUCTION_STATUSES, getNextStatus, getPreviousStatus } from '@/lib/constants';
import type { Order, OrderStatus, Role } from '@/lib/types';
import styles from './KanbanBoard.module.css';


interface KanbanBoardProps {
  userRole: Role;
}

export default function KanbanBoard({ userRole }: KanbanBoardProps) {
  const { user } = useAuth();
  const { orders, customers, staffMembers, updateOrderStatus, updateOrder } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<OrderStatus>(PRODUCTION_STATUSES[0]);
  const [filterMyTasks, setFilterMyTasks] = useState(userRole === 'Staff');
  const [intakeExpanded, setIntakeExpanded] = useState(false);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);


  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    if ((PRODUCTION_STATUSES as readonly string[]).includes(newStatus)) {
      await updateOrderStatus(orderId, newStatus, user?.uid || '', user?.name || '');
    }
  }, [updateOrderStatus, user]);

  const handleAdvance = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = getNextStatus(order.status);
    if (next) await updateOrderStatus(orderId, next, user?.uid || '', user?.name || '');
  }, [orders, updateOrderStatus, user]);

  const handleRevert = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const prev = getPreviousStatus(order.status);
    if (prev) await updateOrderStatus(orderId, prev, user?.uid || '', user?.name || '');
  }, [orders, updateOrderStatus, user]);

  const handleStartProduction = useCallback(async (orderId: string) => {
    await updateOrderStatus(orderId, 'Cutting', user?.uid || '', user?.name || '');
  }, [updateOrderStatus, user]);

  // Filter orders based on role and toggle
  const filteredOrders = useMemo(() => {
    if (userRole === 'Staff' && user?.uid) {
      // Staff always see only their own tasks
      return orders.filter(o => o.assignedTo === user.uid);
    }
    if (filterMyTasks && user?.uid) {
      return orders.filter(o => o.assignedTo === user.uid);
    }
    return orders;
  }, [orders, filterMyTasks, user, userRole]);

  // Documented orders for intake queue
  const documentedOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'Documented');
  }, [filteredOrders]);


  const getOrdersByStatus = (status: OrderStatus) =>
    filteredOrders.filter((o) => o.status === status);

  // Sync selected order with latest state
  const currentOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  const handleCopyLink = () => {
    if (currentOrder) {
      const url = `${window.location.origin}/track/${currentOrder.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentCustomer = currentOrder ? customers.find(c => c.id === currentOrder.customerId) : null;

  return (
    <>
      {/* Owner Filter Toggle */}
      {userRole === 'Owner' && (
        <div className={styles.filterToggleRow}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!filterMyTasks ? styles.toggleBtnActive : ''}`}
            onClick={() => setFilterMyTasks(false)}
          >
            All Orders
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${filterMyTasks ? styles.toggleBtnActive : ''}`}
            onClick={() => setFilterMyTasks(true)}
          >
            My Orders
          </button>
        </div>
      )}

      {/* Intake Queue for Documented Orders */}
      {documentedOrders.length > 0 && (
        <div className={styles.intakeQueue}>
          <button
            type="button"
            className={styles.intakeHeader}
            onClick={() => setIntakeExpanded(!intakeExpanded)}
          >
            <span className={styles.intakeTitle}>
              📋 Intake Queue <span className={styles.intakeCount}>{documentedOrders.length}</span>
            </span>
            {intakeExpanded ? <FaChevronUp className={styles.intakeChevron} /> : <FaChevronDown className={styles.intakeChevron} />}
          </button>
          {intakeExpanded && (
            <div className={styles.intakeList}>
              {documentedOrders.map((order) => (
                <div key={order.id} className={styles.intakeCard}>
                  <div className={styles.intakeCardInfo}>
                    <span className={styles.intakeCardName}>{order.customerName}</span>
                    <span className={styles.intakeCardDetails}>
                      {order.orderDetails.length > 40
                        ? order.orderDetails.slice(0, 40) + '…'
                        : order.orderDetails}
                    </span>
                    {order.dueDate && (
                      <span className={styles.intakeCardDue}>
                        Due: {new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => handleStartProduction(order.id)}
                  >
                    Start <FaArrowRight style={{ fontSize: 11 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Tabs — production stages only */}
      <div className={styles.mobileTabs}>
        {PRODUCTION_STATUSES.map((status) => (
          <button
            key={status}
            className={`${styles.tabBtn} ${mobileActiveTab === status ? styles.tabBtnActive : ''}`}
            onClick={() => setMobileActiveTab(status)}
          >
            {status} ({getOrdersByStatus(status).length})
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {PRODUCTION_STATUSES.map((status) => (
            <div
              key={status}
              className={`${styles.columnWrapper} ${mobileActiveTab === status ? styles.columnActive : styles.columnHidden}`}
            >
              <KanbanColumn
                status={status}
                orders={getOrdersByStatus(status)}
                userRole={userRole}
                onCardClick={(order) => setSelectedOrder(order)}
                onAdvance={(orderId) => handleAdvance(orderId)}
                onRevert={(orderId) => handleRevert(orderId)}
              />
            </div>
          ))}
        </div>
      </DndContext>

      <BottomSheet
        isOpen={!!currentOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        footer={
          currentOrder && currentOrder.status !== 'Completed' && (
            <Button
              fullWidth
              onClick={() => {
                handleAdvance(currentOrder.id);
              }}
            >
              Move to {getNextStatus(currentOrder.status)}
            </Button>
          )
        }
      >
        {currentOrder && (
          <OrderDetailSheet 
            order={currentOrder}
            customer={currentCustomer || null}
            userRole={userRole}
            onUpdatePayment={async (orderId, amount) => {
              await updateOrder(orderId, { depositPaid: amount });
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}
