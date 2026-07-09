'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { FaFilter, FaListCheck, FaTimeline, FaUser, FaCalendarDays, FaClock, FaRegCommentDots, FaLink, FaWhatsapp, FaCreditCard, FaChevronDown, FaChevronUp, FaArrowRight, FaXmark, FaMagnifyingGlass } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { STATUS_CONFIG } from '@/lib/constants';
import KanbanColumn from '@/components/kanban/KanbanColumn/KanbanColumn';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import ActivityTimeline from '@/components/kanban/ActivityTimeline/ActivityTimeline';
import OrderDetailSheet from '@/components/kanban/OrderDetailSheet/OrderDetailSheet';
import { PRODUCTION_STATUSES, getNextStatus, getPreviousStatus } from '@/lib/constants';
import type { Order, OrderStatus, Role } from '@/lib/types';
import KanbanBoardSkeleton from './KanbanBoardSkeleton';
import styles from './KanbanBoard.module.css';


interface KanbanBoardProps {
  userRole: Role;
}

export default function KanbanBoard({ userRole }: KanbanBoardProps) {
  const { user } = useAuth();
  const { orders, customers, staffMembers, isLoaded, updateOrderStatus, updateOrder } = useData();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<OrderStatus>(PRODUCTION_STATUSES[0]);
  const [filterMyTasks, setFilterMyTasks] = useState(userRole === 'Staff');
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  const [staffFilterId, setStaffFilterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // userRole falls back to 'Staff' for one tick while auth session loads; re-sync
  // once the real role is known so the Owner doesn't get stuck on "My Orders".
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setFilterMyTasks(userRole === 'Staff');
  }, [userRole]);

  // Deep-link support: /production?order=<id> opens a specific order,
  // /production?staff=<uid> filters the board to that staff member's orders.
  // One-time hydration from the URL once data has loaded, so setState-in-effect is intentional here.
  useEffect(() => {
    if (!isLoaded) return;
    const orderId = searchParams.get('order');
    const staffId = searchParams.get('staff');

    if (orderId) {
      const found = orders.find((o) => o.id === orderId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (found) setSelectedOrder(found);
    }
    if (staffId && userRole === 'Owner') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStaffFilterId(staffId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterMyTasks(false);
    }
    if (orderId || staffId) {
      router.replace('/production');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);


  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const draggedOrder = active.data.current?.order as Order | undefined;
    const previousStatus = draggedOrder?.status;

    if ((PRODUCTION_STATUSES as readonly string[]).includes(newStatus) && newStatus !== previousStatus) {
      await updateOrderStatus(orderId, newStatus, user?.uid || '', user?.name || '');

      // Undo is only offered for mouse-driven drags — a mouse drag-and-drop
      // is easy to mis-drop (a shaky click-drag near a column boundary);
      // the mobile swipe gesture instead gets its own hold-delay protection
      // against accidental triggers, so it doesn't need this safety net.
      const activatorEvent = event.activatorEvent;
      const isMouseDrag = 'pointerType' in activatorEvent && (activatorEvent as PointerEvent).pointerType === 'mouse';
      if (isMouseDrag && previousStatus) {
        showToast(`Moved to ${STATUS_CONFIG[newStatus].label}`, 'success', {
          label: 'Undo',
          onClick: () => {
            updateOrderStatus(orderId, previousStatus, user?.uid || '', user?.name || '');
          },
        });
      }
    }
  }, [updateOrderStatus, user, showToast]);

  const handleAdvance = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = getNextStatus(order.status);
    if (next) await updateOrderStatus(orderId, next, user?.uid || '', user?.name || '');
  }, [orders, updateOrderStatus, user]);

  const handleReassign = useCallback(async (orderId: string, staffUid: string, staffName: string) => {
    // '' rather than undefined for unassigning — the update mapper treats
    // undefined as "leave unchanged", so undefined would silently no-op.
    await updateOrder(orderId, {
      assignedTo: staffUid,
      assignedToName: staffUid ? staffName : '',
    });
    showToast(staffUid ? `Reassigned to ${staffName}` : 'Order unassigned', 'success');
  }, [updateOrder, showToast]);

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
    let result = orders;
    if (userRole === 'Staff' && user?.uid) {
      // Staff always see only their own tasks
      result = result.filter(o => o.assignedTo === user.uid);
    } else if (staffFilterId) {
      result = result.filter(o => o.assignedTo === staffFilterId);
    } else if (filterMyTasks && user?.uid) {
      result = result.filter(o => o.assignedTo === user.uid);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (o) => o.customerName.toLowerCase().includes(query) || o.orderDetails.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, filterMyTasks, staffFilterId, searchQuery, user, userRole]);

  const staffFilterName = staffFilterId ? staffMembers.find((s) => s.uid === staffFilterId)?.name : null;

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

  if (!isLoaded) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <>
      {/* Search */}
      <div className={styles.searchBar}>
        <FaMagnifyingGlass className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by customer or garment…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button type="button" className={styles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="Clear search">
            <FaXmark />
          </button>
        )}
      </div>

      {/* Owner Filter Toggle */}
      {userRole === 'Owner' && !staffFilterId && (
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

      {staffFilterId && (
        <div className={styles.staffFilterChip}>
          <span>Viewing orders assigned to <strong>{staffFilterName || 'staff member'}</strong></span>
          <button type="button" onClick={() => setStaffFilterId(null)} aria-label="Clear filter">
            <FaXmark />
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
              <FaListCheck /> Intake Queue <span className={styles.intakeCount}>{documentedOrders.length}</span>
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
                staffMembers={staffMembers}
                onReassign={handleReassign}
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
              const target = orders.find((o) => o.id === orderId);
              if (!target) return;
              const newDeposit = Math.min(target.totalBill, target.depositPaid + amount);
              const paymentRecord = {
                id: `pay-${Date.now()}`,
                amount,
                recordedBy: user?.uid || '',
                recordedByName: user?.name || 'Unknown',
                timestamp: new Date().toISOString(),
              };
              await updateOrder(orderId, {
                depositPaid: newDeposit,
                payments: [...(target.payments || []), paymentRecord],
              });
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}
