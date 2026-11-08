'use client';

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { STATUS_CONFIG, ORDER_STATUSES, getNextStatus, getPreviousStatus } from '@/lib/constants';
import { useDebounce } from '@/lib/hooks/useDebounce';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { Order, OrderStatus, Role, PaymentMethod } from '@/lib/types';
import { isOwnerLikeRole, getBalanceOwed, isOverdue, isDueSoon } from '@/lib/types';
import { getOrderProgressMessage, getWhatsAppLink, formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import HandoverPaymentSheet from '../[orderId]/_components/HandoverPaymentSheet';
import { addPayment } from '@/app/actions/order_payments';
import KanbanColumns from './desktop/KanbanColumns';
import StageList, { ALL_FILTER, type StageFilter } from './mobile/StageList';
import ProductionBoardSkeleton from './ProductionBoardSkeleton';
import CuttingSlipModal from './CuttingSlipModal';
import ProductionFilterSheet from './ProductionFilterSheet';
import ScheduleFittingPromptModal from './ScheduleFittingPromptModal';
import { createCalendarEvent } from '@/app/actions/calendar';
import styles from './ProductionBoard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';

interface ProductionBoardProps {
  userRole: Role;
}

const ACTIVE_STATUSES = ORDER_STATUSES.filter((s) => s !== 'Delivered');
const STAGE_PAGE_SIZE = 15;
type OpFilter = 'all' | 'rush' | 'due' | 'hold' | 'unpaid';

export default function ProductionBoard({ userRole }: ProductionBoardProps) {
  const { user } = useAuth();
  const { orders, customers, staffMembers, currentShop, isLoaded, updateOrderStatus, updateOrder, exceptions, isDemoMode, toggleDemoMode } = useData();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const STORAGE_KEY = 'tb_production_board_state';

  const initialStage = searchParams.get('stage') as StageFilter | null;
  const initialOp = searchParams.get('op') as OpFilter | null;
  const initialQ = searchParams.get('q') || '';
  const initialStaff = searchParams.get('staff');
  const initialBatch = searchParams.get('batch');
  const initialMy = searchParams.get('my');

  const [stageFilter, setStageFilter] = useState<StageFilter>(() => {
    if (initialStage && (initialStage === ALL_FILTER || (ACTIVE_STATUSES as readonly string[]).includes(initialStage))) {
      return initialStage;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.stageFilter && (saved.stageFilter === ALL_FILTER || (ACTIVE_STATUSES as readonly string[]).includes(saved.stageFilter))) {
          return saved.stageFilter;
        }
      } catch {}
    }
    return ALL_FILTER;
  });

  const [filterMyTasks, setFilterMyTasks] = useState(() => {
    if (initialMy !== null) return initialMy === '1';
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof saved.filterMyTasks === 'boolean') return saved.filterMyTasks;
      } catch {}
    }
    return userRole === 'Staff';
  });

  const [staffFilterId, setStaffFilterId] = useState<string | null>(() => {
    if (initialStaff) return initialStaff;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.staffFilterId) return saved.staffFilterId;
      } catch {}
    }
    return null;
  });

  const [batchFilterId, setBatchFilterId] = useState<string | null>(() => {
    if (initialBatch) return initialBatch;
    return null;
  });

  const [opFilter, setOpFilter] = useState<OpFilter>(() => {
    if (initialOp && ['all', 'rush', 'due', 'hold', 'unpaid'].includes(initialOp)) return initialOp;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.opFilter && ['all', 'rush', 'due', 'hold', 'unpaid'].includes(saved.opFilter)) return saved.opFilter;
      } catch {}
    }
    return 'all';
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    if (initialQ) return initialQ;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.searchQuery) return saved.searchQuery;
      } catch {}
    }
    return '';
  });

  // Concurrent rendering: keeps input typing at 60fps while deferring heavy list filtering
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // Debounce side-effects (URL state and sessionStorage) by 300ms to eliminate per-keystroke I/O
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [cuttingSlipOrder, setCuttingSlipOrder] = useState<Order | null>(null);
  const [handoverOrder, setHandoverOrder] = useState<Order | null>(null);
  const [amendmentOrder, setAmendmentOrder] = useState<Order | null>(null);
  const [fittingPromptOrder, setFittingPromptOrder] = useState<Order | null>(null);
  const [stageVisibleCounts, setStageVisibleCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const isDesktop = useIsDesktop();
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);

  // Sync state to URL and sessionStorage so returning to the board preserves exact view
  // Uses debouncedSearchQuery (300ms) to avoid churning history.replaceState and sessionStorage on every keystroke
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (stageFilter && stageFilter !== ALL_FILTER) params.set('stage', stageFilter);
    else params.delete('stage');

    if (opFilter && opFilter !== 'all') params.set('op', opFilter);
    else params.delete('op');

    if (debouncedSearchQuery.trim()) params.set('q', debouncedSearchQuery.trim());
    else params.delete('q');

    if (staffFilterId) params.set('staff', staffFilterId);
    else params.delete('staff');

    if (batchFilterId) params.set('batch', batchFilterId);
    else params.delete('batch');

    if (filterMyTasks) params.set('my', '1');
    else params.delete('my');

    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    window.history.replaceState(null, '', newUrl);

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stageFilter, opFilter, searchQuery: debouncedSearchQuery, staffFilterId, batchFilterId, filterMyTasks })
      );
    } catch {}
  }, [stageFilter, opFilter, debouncedSearchQuery, staffFilterId, batchFilterId, filterMyTasks]);

  // userRole falls back to 'Staff' for one tick while auth session loads; re-sync
  // once the real role is known so the Owner doesn't get stuck on "My Orders".
  // Adjusted during render (React's guidance for deriving state from a changed
  // prop) rather than in an effect — same pattern as filterKey below.
  const [prevUserRole, setPrevUserRole] = useState(userRole);
  if (userRole !== prevUserRole) {
    setPrevUserRole(userRole);
    if (!initialMy) {
      setFilterMyTasks(userRole === 'Staff');
    }
  }

  // Deep-link support: /production?order=<id> forwards to the order's own
  // page, /production?staff=<uid> filters the board to that staff member's orders.
  useEffect(() => {
    if (!isLoaded) return;
    const orderId = searchParams.get('order');
    const staffId = searchParams.get('staff');

    if (orderId) {
      const targetOrder = orders.find((o) => o.id === orderId);
      router.replace(ROUTES.productionOrder(targetOrder || orderId));
      return;
    }
    if (staffId && isOwnerLikeRole(userRole) && staffFilterId !== staffId) {
      setStaffFilterId(staffId);
      setFilterMyTasks(false);
    }
  }, [isLoaded, searchParams, userRole, router, orders, staffFilterId]);

  // Order cards are plain divs (not <Link>), since each also hosts nested
  // interactive controls (reassign select, move back/forward buttons) that
  // can't sit inside a real anchor — so Next never gets a chance to
  // prefetch these routes automatically. Warm the active (non-Completed)
  // orders' detail pages as soon as the board loads instead, capped so a
  // very large board doesn't fire off an unbounded burst of requests.
  useEffect(() => {
    if (!isLoaded) return;
    const active = orders.filter((o) => o.status !== 'Delivered').slice(0, 40);
    active.forEach((o) => router.prefetch(ROUTES.productionOrder(o)));
  }, [isLoaded, orders, router]);

  const performDelivery = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const fromStatus = order.status;
    updateOrderStatus(orderId, 'Delivered', user?.uid || '', user?.name || '');
    const customer = customers.find(c => c.id === order.customerId);
    if (customer?.whatsappNumber) {
      const trackingUrl = `${APP_CONFIG.baseUrl}${ROUTES.track(order)}`;
      const includeTrackingLink = order.includeTrackingLink ?? currentShop?.defaultTrackingLinkEnabled ?? true;
      const msg = getOrderProgressMessage({
        customerName: customer.fullName,
        shopName: currentShop?.name || 'us',
        status: 'Delivered',
        trackingUrl,
        customTemplate: currentShop?.stageMessageTemplates?.['Delivered'],
        includeTrackingLink,
      });
      showToast('Moved to Delivered', 'success', {
        label: 'WhatsApp',
        onClick: () => {
          window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
        },
      });
    } else {
      showToast('Moved to Delivered', 'success', {
        label: 'Undo',
        onClick: () => {
          updateOrderStatus(orderId, fromStatus, user?.uid || '', user?.name || '');
        },
      });
    }
  }, [orders, customers, currentShop, updateOrderStatus, user, showToast]);

  const handleRecordPaymentAndDeliver = useCallback(async (amount: number, method: PaymentMethod, note?: string) => {
    if (!handoverOrder) return;
    const { data, error } = await addPayment(handoverOrder.id, amount, method, note);
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (data) {
      const newDeposit = handoverOrder.depositPaid + amount;
      updateOrder(handoverOrder.id, { depositPaid: newDeposit });
      showToast(`${formatCurrency(amount, currentShop?.currency)} payment recorded!`, 'success');
    }
    const current = handoverOrder;
    setHandoverOrder(null);
    setAmendmentOrder(current);
  }, [handoverOrder, updateOrder, showToast, currentShop?.currency]);

  const handleRecordSplitPaymentAndDeliver = useCallback(async (payments: Array<{ amount: number; method: PaymentMethod; note?: string }>) => {
    if (!handoverOrder) return;
    let totalAdded = 0;
    for (const p of payments) {
      const { data, error } = await addPayment(handoverOrder.id, p.amount, p.method, p.note);
      if (error) {
        showToast(error, 'error');
        return;
      }
      if (data) totalAdded += p.amount;
    }
    if (totalAdded > 0) {
      const newDeposit = handoverOrder.depositPaid + totalAdded;
      updateOrder(handoverOrder.id, { depositPaid: newDeposit });
      showToast(`${formatCurrency(totalAdded, currentShop?.currency)} split tender recorded!`, 'success');
    }
    const current = handoverOrder;
    setHandoverOrder(null);
    setAmendmentOrder(current);
  }, [handoverOrder, updateOrder, showToast, currentShop?.currency]);

  const handleDeliverWithBalanceDue = useCallback(async () => {
    if (!handoverOrder) return;
    const current = handoverOrder;
    setHandoverOrder(null);
    setAmendmentOrder(current);
  }, [handoverOrder]);

  const handleAdvance = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = getNextStatus(order.status);
    if (!next) return;

    if (next === 'Delivered') {
      if (order.isInternalBatch) {
        performDelivery(orderId);
      } else {
        const balance = getBalanceOwed(order);
        if (balance > 0) {
          setHandoverOrder(order);
        } else {
          setAmendmentOrder(order);
        }
      }
      return;
    }

    if (next === 'Ready' && !order.isInternalBatch) {
      setFittingPromptOrder(order);
      return;
    }

    updateOrderStatus(orderId, next, user?.uid || '', user?.name || '');
    const customer = customers.find(c => c.id === order.customerId);
    if (customer?.whatsappNumber) {
      const trackingUrl = `${APP_CONFIG.baseUrl}${ROUTES.track(order)}`;
      const includeTrackingLink = order.includeTrackingLink ?? currentShop?.defaultTrackingLinkEnabled ?? true;
      const msg = getOrderProgressMessage({
        customerName: customer.fullName,
        shopName: currentShop?.name || 'us',
        status: next,
        trackingUrl,
        customTemplate: currentShop?.stageMessageTemplates?.[next],
        includeTrackingLink,
      });
      showToast(`Moved to ${STATUS_CONFIG[next].label}`, 'success', {
        label: 'WhatsApp',
        onClick: () => {
          window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
        },
      });
    } else {
      showToast(`Moved to ${STATUS_CONFIG[next].label}`, 'success', {
        label: 'Undo',
        onClick: () => {
          updateOrderStatus(orderId, order.status, user?.uid || '', user?.name || '');
        },
      });
    }
  }, [orders, customers, currentShop, updateOrderStatus, user, showToast, performDelivery]);

  const handleRevert = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const prev = getPreviousStatus(order.status);
    if (prev) updateOrderStatus(orderId, prev, user?.uid || '', user?.name || '');
  }, [orders, updateOrderStatus, user]);

  // Desktop Kanban columns: drop onto any column to set that status
  // directly (not just the adjacent next/previous stage the mobile card's
  // buttons allow) — that's the actual point of a real drag-and-drop board.
  const handleDrop = useCallback(async (targetStatus: OrderStatus) => {
    const orderId = draggedOrderId;
    setDraggedOrderId(null);
    setDragOverStatus(null);
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    if (targetStatus === 'Delivered') {
      if (order.isInternalBatch) {
        performDelivery(orderId);
      } else {
        const balance = getBalanceOwed(order);
        if (balance > 0) {
          setHandoverOrder(order);
        } else {
          setAmendmentOrder(order);
        }
      }
      return;
    }

    if (targetStatus === 'Ready' && !order.isInternalBatch) {
      setFittingPromptOrder(order);
      return;
    }

    const fromStatus = order.status;
    updateOrderStatus(orderId, targetStatus, user?.uid || '', user?.name || '');
    const customer = customers.find(c => c.id === order.customerId);
    if (customer?.whatsappNumber) {
      const trackingUrl = `${APP_CONFIG.baseUrl}${ROUTES.track(order)}`;
      const includeTrackingLink = order.includeTrackingLink ?? currentShop?.defaultTrackingLinkEnabled ?? true;
      const msg = getOrderProgressMessage({
        customerName: customer.fullName,
        shopName: currentShop?.name || 'us',
        status: targetStatus,
        trackingUrl,
        customTemplate: currentShop?.stageMessageTemplates?.[targetStatus],
        includeTrackingLink,
      });
      showToast(`Moved to ${STATUS_CONFIG[targetStatus].label}`, 'success', {
        label: 'WhatsApp',
        onClick: () => {
          window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
        },
      });
    } else {
      showToast(`Moved to ${STATUS_CONFIG[targetStatus].label}`, 'success', {
        label: 'Undo',
        onClick: () => {
          updateOrderStatus(orderId, fromStatus, user?.uid || '', user?.name || '');
        },
      });
    }
  }, [draggedOrderId, orders, customers, currentShop, updateOrderStatus, user, showToast, performDelivery]);

  const handleConfirmFittingSchedule = useCallback(
    async (date: string, time: string, sendWhatsApp: boolean) => {
      if (!fittingPromptOrder) return;
      const order = fittingPromptOrder;
      const customer = customers.find((c) => c.id === order.customerId);
      const customerName = customer?.fullName || order.customerName || 'Bespoke Client';
      const shopName = currentShop?.name || 'our atelier';
      const address = currentShop?.address || '';
      const targetShopId = user?.shopId || currentShop?.id || order.shopId;

      if (targetShopId) {
        try {
          await createCalendarEvent({
            shopId: targetShopId,
            title: `Fitting: ${customerName} (${order.orderDetails || order.styleName || 'Outfit'})`,
            type: 'fitting',
            date,
            startTime: time,
            relatedOrderId: order.id,
            relatedCustomerId: order.customerId,
            description: `Bespoke try-on session for ${order.orderDetails || order.styleName || 'outfit'}.`,
            status: 'pending',
          });
        } catch (err) {
          console.error('Failed to create calendar event:', err);
        }
      }

      updateOrderStatus(order.id, 'Ready', user?.uid || '', user?.name || '');
      setFittingPromptOrder(null);

      if (sendWhatsApp && customer?.whatsappNumber) {
        const formattedDate = new Date(date).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
        const addrText = address ? `\n\nAtelier Address: ${address}` : '';
        const msg = `Hello ${customerName},\n\nWarm greetings from ${shopName}. Your ${order.orderDetails || order.styleName || 'garment'} is ready for your fitting session!\n\nWe have reserved your appointment for ${formattedDate} at ${time}.${addrText}\n\nPlease let us know if this time works for you. Looking forward to seeing you!`;
        window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
      }

      showToast('Moved to Ready and scheduled fitting appointment', 'success');
    },
    [fittingPromptOrder, customers, currentShop, user, updateOrderStatus, showToast]
  );

  const handleSkipFittingSchedule = useCallback(() => {
    if (!fittingPromptOrder) return;
    const order = fittingPromptOrder;
    setFittingPromptOrder(null);
    updateOrderStatus(order.id, 'Ready', user?.uid || '', user?.name || '');
    showToast('Moved to Ready (direct pickup)', 'success');
  }, [fittingPromptOrder, updateOrderStatus, user, showToast]);

  const handleWhatsApp = useCallback((order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    if (!customer?.whatsappNumber) {
      showToast('No customer phone number available', 'error');
      return;
    }
    const trackingUrl = `${APP_CONFIG.baseUrl}${ROUTES.track(order)}`;
    const includeTrackingLink = order.includeTrackingLink ?? currentShop?.defaultTrackingLinkEnabled ?? true;
    const msg = getOrderProgressMessage({
      customerName: customer.fullName,
      shopName: currentShop?.name || 'us',
      status: order.status,
      trackingUrl,
      customTemplate: currentShop?.stageMessageTemplates?.[order.status],
      includeTrackingLink,
    });
    window.open(getWhatsAppLink(customer.whatsappNumber, msg), '_blank');
  }, [customers, currentShop, showToast]);

  const handleReassign = useCallback(async (orderId: string, staffUid: string, staffName: string) => {
    // '' rather than undefined for unassigning — the update mapper treats
    // undefined as "leave unchanged", so undefined would silently no-op.
    updateOrder(orderId, {
      assignedTo: staffUid,
      assignedToName: staffUid ? staffName : '',
    });
    showToast(staffUid ? `Reassigned to ${staffName}` : 'Order unassigned', 'success');
  }, [updateOrder, showToast]);

  // Filter orders based on role, search, and operational filter
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

    if (batchFilterId) {
      result = result.filter(o => o.batchId === batchFilterId);
    }

    if (opFilter === 'rush') {
      result = result.filter(o => o.priority === 'rush' || o.priority === 'urgent');
    } else if (opFilter === 'due') {
      result = result.filter(o => isOverdue(o) || isDueSoon(o));
    } else if (opFilter === 'hold') {
      result = result.filter(o => exceptions.some(e => e.orderId === o.id && !e.endDate));
    } else if (opFilter === 'unpaid') {
      result = result.filter(o => getBalanceOwed(o) > 0);
    }

    const query = deferredSearchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (o) => (o.customerName || 'Batch').toLowerCase().includes(query) || o.orderDetails.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, filterMyTasks, staffFilterId, batchFilterId, opFilter, deferredSearchQuery, user, userRole, exceptions]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Delivered'), [orders]);
  const totalOrdersCount = activeOrders.length;
  const myOrdersCount = useMemo(() => activeOrders.filter(o => o.assignedTo === user?.uid).length, [activeOrders, user]);
  const rushCount = useMemo(() => activeOrders.filter(o => o.priority === 'rush' || o.priority === 'urgent').length, [activeOrders]);
  const dueCount = useMemo(() => activeOrders.filter(o => isOverdue(o) || isDueSoon(o)).length, [activeOrders]);
  const holdCount = useMemo(() => activeOrders.filter(o => exceptions.some(e => e.orderId === o.id && !e.endDate)).length, [activeOrders, exceptions]);
  const unpaidCount = useMemo(() => activeOrders.filter(o => getBalanceOwed(o) > 0).length, [activeOrders]);

  const activeAttentionFiltersCount = useMemo(() => {
    let count = 0;
    if (isOwnerLikeRole(userRole) && filterMyTasks) count++;
    if (staffFilterId) count++;
    if (batchFilterId) count++;
    if (opFilter !== 'all') count++;
    return count;
  }, [userRole, filterMyTasks, staffFilterId, batchFilterId, opFilter]);

  const hasAttentionAlert = rushCount > 0 || dueCount > 0 || holdCount > 0;

  const handleClearAllAttentionFilters = useCallback(() => {
    setOpFilter('all');
    if (isOwnerLikeRole(userRole)) {
      setFilterMyTasks(false);
    }
    setStaffFilterId(null);
    setBatchFilterId(null);
  }, [userRole]);

  const batchOrders = useMemo(
    () => (batchFilterId ? orders.filter((o) => o.batchId === batchFilterId) : []),
    [orders, batchFilterId]
  );
  const advanceableBatchOrders = useMemo(
    () => batchOrders.filter((o) => o.status !== 'Delivered' && getNextStatus(o.status)),
    [batchOrders]
  );
  const batchCommonNext = useMemo(() => {
    if (advanceableBatchOrders.length === 0) return null;
    const firstNext = getNextStatus(advanceableBatchOrders[0].status);
    const allSame = advanceableBatchOrders.every((o) => getNextStatus(o.status) === firstNext);
    return allSame && firstNext ? STATUS_CONFIG[firstNext].label : null;
  }, [advanceableBatchOrders]);

  const handleBatchBulkAdvance = useCallback(async () => {
    if (advanceableBatchOrders.length === 0) return;
    const movingToDelivered = advanceableBatchOrders.filter((o) => getNextStatus(o.status) === 'Delivered');
    if (movingToDelivered.length > 0) {
      const hasUnpaid = movingToDelivered.some((o) => getBalanceOwed(o) > 0);
      if (hasUnpaid) {
        showToast('Some garments have an outstanding balance. Please settle balances individually before delivery.', 'info');
        return;
      }
    }

    for (const order of advanceableBatchOrders) {
      const next = getNextStatus(order.status);
      if (next) {
        updateOrderStatus(order.id, next, user?.uid || '', user?.name || '');
      }
    }
    showToast(`Advanced ${advanceableBatchOrders.length} garments in batch!`, 'success');
  }, [advanceableBatchOrders, updateOrderStatus, user, showToast]);

  const staffFilterName = staffFilterId ? staffMembers.find((s) => s.uid === staffFilterId)?.name : null;

  const sortStageOrders = useCallback((ordersList: Order[]) => {
    return [...ordersList].sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const aRush = a.priority === 'rush';
      const bRush = b.priority === 'rush';
      if (aRush && !bRush) return -1;
      if (!aRush && bRush) return 1;

      const aUrgent = a.priority === 'urgent';
      const bUrgent = b.priority === 'urgent';
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, []);

  const getOrdersByStatus = useCallback(
    (status: OrderStatus) => sortStageOrders(filteredOrders.filter((o) => o.status === status)),
    [filteredOrders, sortStageOrders]
  );

  // A changed filter/search is a new view — start each stage back at its
  // first page rather than keeping a "show more" count that referred to a
  // now-irrelevant previous list. Adjusted during render (React's guidance
  // for resetting state in response to a prop/derived-value change) rather
  // than in an effect.
  const filterKey = `${deferredSearchQuery}|${filterMyTasks}|${staffFilterId}|${batchFilterId}|${stageFilter}|${opFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setStageVisibleCounts({});
  }

  const handleShowMore = useCallback((status: OrderStatus) => {
    setStageVisibleCounts((prev) => ({ ...prev, [status]: (prev[status] ?? STAGE_PAGE_SIZE) + STAGE_PAGE_SIZE }));
  }, []);

  const handleOpen = useCallback(
    (orderId: string) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      router.push(ROUTES.productionOrder(targetOrder || orderId));
    },
    [orders, router]
  );

  // Pre-fetch top 6 visible active orders for instant opening
  useEffect(() => {
    if (!isLoaded || orders.length === 0) return;
    orders.slice(0, 6).forEach((o) => {
      router.prefetch(ROUTES.productionOrder(o));
    });
  }, [isLoaded, orders, router]);

  if (!isLoaded) {
    return <ProductionBoardSkeleton />;
  }

  const visibleStages: OrderStatus[] = stageFilter === ALL_FILTER ? [...ACTIVE_STATUSES] : [stageFilter];
  const hasAnyVisible = visibleStages.some((s) => getOrdersByStatus(s).length > 0);

  return (
    <>
      {/* Atelier Preview Mode Banner */}
      {isDemoMode && (
        <div className={styles.demoBanner}>
          <div className={styles.demoBannerLeft}>
            <Symbol name="visibility" size={16} />
            <span>
              <strong>Atelier Preview Active</strong> — 10 sample bespoke garments loaded in-memory. Drag & drop cards, change stages, and test filters freely (nothing touches your database).
            </span>
          </div>
          <button
            type="button"
            className={styles.demoExitBtn}
            onClick={() => toggleDemoMode?.(false)}
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Empty State Help: Offer sample orders preview if atelier floor is currently clear */}
      {!isDemoMode && orders.filter((o) => o.status !== 'Delivered').length === 0 && (
        <div className={styles.emptyPromptBanner}>
          <span>Want to explore the Kanban board and cards with sample bespoke garments?</span>
          <button
            type="button"
            className={styles.demoLaunchBtn}
            onClick={() => toggleDemoMode?.(true)}
          >
            <Symbol name="visibility" size={13} />
            <span>Load Sample Orders</span>
          </button>
        </div>
      )}

      {/* Atelier Toolbar: Search + Mobile Filter Button + Desktop Scope Switcher */}
      <div className={styles.boardToolbar}>
        <div className={styles.searchBarWrap}>
          <div className={styles.searchBar}>
            <Symbol name="search" className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by customer or garment…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className={styles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="Clear search">
                <Symbol name="close" />
              </button>
            )}
          </div>

          {!isDesktop && (
            <button
              type="button"
              className={`${styles.filterMenuBtn} ${activeAttentionFiltersCount > 0 ? styles.filterMenuBtnActive : ''}`}
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label="Filter orders"
            >
              <Symbol name="tune" size={16} />
              <span className={styles.filterMenuBtnText}>Filter</span>
              {activeAttentionFiltersCount > 0 ? (
                <span className={styles.filterCountBadge}>{activeAttentionFiltersCount}</span>
              ) : hasAttentionAlert ? (
                <span className={styles.filterAlertDot} title="Items need attention" />
              ) : null}
            </button>
          )}
        </div>

        {isDesktop && isOwnerLikeRole(userRole) && !staffFilterId && (
          <div className={styles.scopeSegmentedControl} role="tablist" aria-label="Order Scope">
            <button
              type="button"
              role="tab"
              aria-selected={!filterMyTasks}
              className={`${styles.scopeSegmentBtn} ${!filterMyTasks ? styles.scopeSegmentActive : ''}`}
              onClick={() => setFilterMyTasks(false)}
            >
              <span>All Orders</span>
              <span className={styles.scopeCountBadge}>{totalOrdersCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMyTasks}
              className={`${styles.scopeSegmentBtn} ${filterMyTasks ? styles.scopeSegmentActive : ''}`}
              onClick={() => setFilterMyTasks(true)}
            >
              <span>My Orders</span>
              <span className={styles.scopeCountBadge}>{myOrdersCount}</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Filter Strip (Mobile: visible only when attention/scope filters active) */}
      {!isDesktop && activeAttentionFiltersCount > 0 && (
        <div className={styles.activeFilterStrip}>
          {isOwnerLikeRole(userRole) && filterMyTasks && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setFilterMyTasks(false)}
              aria-label="Remove My Orders filter"
            >
              <span>My Orders</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {opFilter === 'rush' && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setOpFilter('all')}
              aria-label="Remove Rush filter"
            >
              <Symbol name="bolt" size={12} fill />
              <span>Rush</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {opFilter === 'due' && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setOpFilter('all')}
              aria-label="Remove Due Soon filter"
            >
              <Symbol name="schedule" size={12} />
              <span>Due Soon</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {opFilter === 'hold' && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setOpFilter('all')}
              aria-label="Remove On Hold filter"
            >
              <Symbol name="warning" size={12} />
              <span>On Hold</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {opFilter === 'unpaid' && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setOpFilter('all')}
              aria-label="Remove Balance Due filter"
            >
              <Symbol name="payments" size={12} />
              <span>Balance Due</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {staffFilterId && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setStaffFilterId(null)}
              aria-label="Remove Staff filter"
            >
              <span>{staffFilterName || 'Staff'}</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          {batchFilterId && (
            <button
              type="button"
              className={styles.activeFilterTag}
              onClick={() => setBatchFilterId(null)}
              aria-label="Remove Batch filter"
            >
              <Symbol name="layers" size={12} />
              <span>Batch</span>
              <Symbol name="close" size={12} />
            </button>
          )}

          <button
            type="button"
            className={styles.activeFilterClearAll}
            onClick={handleClearAllAttentionFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Desktop Operational Attention Filter Bar */}
      {isDesktop && (
        <div className={styles.opFilterRow}>
          <FilterPill
            label="Rush"
            icon={<Symbol name="bolt" size={12} fill />}
            count={rushCount > 0 ? rushCount : undefined}
            active={opFilter === 'rush'}
            onClick={() => setOpFilter(opFilter === 'rush' ? 'all' : 'rush')}
          />
          <FilterPill
            label="Due Soon"
            icon={<Symbol name="schedule" size={12} />}
            count={dueCount > 0 ? dueCount : undefined}
            active={opFilter === 'due'}
            onClick={() => setOpFilter(opFilter === 'due' ? 'all' : 'due')}
          />
          <FilterPill
            label="On Hold"
            icon={<Symbol name="warning" size={12} />}
            count={holdCount > 0 ? holdCount : undefined}
            active={opFilter === 'hold'}
            onClick={() => setOpFilter(opFilter === 'hold' ? 'all' : 'hold')}
          />
          <FilterPill
            label="Balance Due"
            icon={<Symbol name="payments" size={12} />}
            count={unpaidCount > 0 ? unpaidCount : undefined}
            active={opFilter === 'unpaid'}
            onClick={() => setOpFilter(opFilter === 'unpaid' ? 'all' : 'unpaid')}
          />
          {opFilter !== 'all' && (
            <button
              type="button"
              className={styles.clearFilterChip}
              onClick={() => setOpFilter('all')}
              title="Clear attention filter"
            >
              <span>Show all</span>
              <Symbol name="close" size={11} />
            </button>
          )}
        </div>
      )}

      {isDesktop && staffFilterId && (
        <div className={styles.staffFilterChip}>
          <span>Viewing orders assigned to <strong>{staffFilterName || 'staff member'}</strong></span>
          <button type="button" onClick={() => setStaffFilterId(null)} aria-label="Clear filter">
            <Symbol name="close" />
          </button>
        </div>
      )}

      {batchFilterId && (
        <div className={styles.batchFilterChip}>
          <div className={styles.batchChipLeft}>
            <Symbol name="layers" size={14} />
            <span>
              Filtering batch orders (<strong>{filteredOrders.length} {filteredOrders.length === 1 ? 'garment' : 'garments'}</strong>)
            </span>
          </div>
          <div className={styles.batchChipRight}>
            {advanceableBatchOrders.length > 0 && (
              <button
                type="button"
                className={styles.bulkAdvanceBtn}
                onClick={handleBatchBulkAdvance}
                title="Advance all garments in this batch"
              >
                <Symbol name="arrow_forward" size={12} />
                <span>{batchCommonNext ? `Move all to ${batchCommonNext}` : `Advance all (${advanceableBatchOrders.length})`}</span>
              </button>
            )}
            <button type="button" onClick={() => setBatchFilterId(null)} aria-label="Clear batch filter">
              <Symbol name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      {isDesktop ? (
        <KanbanColumns
          getOrdersByStatus={getOrdersByStatus}
          stageVisibleCounts={stageVisibleCounts}
          stagePageSize={STAGE_PAGE_SIZE}
          onShowMore={handleShowMore}
          userRole={userRole}
          staffMembers={staffMembers}
          dragOverStatus={dragOverStatus}
          onOpen={handleOpen}
          onReassign={handleReassign}
          onBatchClick={(batchId) => setBatchFilterId((prev) => (prev === batchId ? null : batchId))}
          onDragStart={setDraggedOrderId}
          onDragEnd={() => {
            setDraggedOrderId(null);
            setDragOverStatus(null);
          }}
          onDragOver={setDragOverStatus}
          onDrop={handleDrop}
          onViewCuttingSlip={setCuttingSlipOrder}
          onWhatsApp={handleWhatsApp}
        />
      ) : (
        <StageList
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          visibleStages={visibleStages}
          hasAnyVisible={hasAnyVisible}
          searchQuery={searchQuery}
          getOrdersByStatus={getOrdersByStatus}
          stageVisibleCounts={stageVisibleCounts}
          stagePageSize={STAGE_PAGE_SIZE}
          onShowMore={handleShowMore}
          userRole={userRole}
          staffMembers={staffMembers}
          onOpen={handleOpen}
          onAdvance={handleAdvance}
          onRevert={handleRevert}
          onReassign={handleReassign}
          onBatchClick={(batchId) => setBatchFilterId((prev) => (prev === batchId ? null : batchId))}
          onViewCuttingSlip={setCuttingSlipOrder}
          onWhatsApp={handleWhatsApp}
          onResetFilters={() => {
            setSearchQuery('');
            setOpFilter('all');
            setStageFilter(ALL_FILTER);
            setStaffFilterId(null);
            setBatchFilterId(null);
          }}
          isFiltered={Boolean(searchQuery || opFilter !== 'all' || stageFilter !== ALL_FILTER || staffFilterId || batchFilterId)}
          onPreviewSample={() => toggleDemoMode?.(true)}
        />
      )}

      {fittingPromptOrder && (
        <ScheduleFittingPromptModal
          isOpen={!!fittingPromptOrder}
          onClose={() => setFittingPromptOrder(null)}
          order={fittingPromptOrder}
          customer={customers.find((c) => c.id === fittingPromptOrder.customerId) || null}
          onConfirmSchedule={handleConfirmFittingSchedule}
          onSkipFitting={handleSkipFittingSchedule}
        />
      )}

      <CuttingSlipModal
        isOpen={!!cuttingSlipOrder}
        onClose={() => setCuttingSlipOrder(null)}
        order={cuttingSlipOrder}
        customer={cuttingSlipOrder ? customers.find((c) => c.id === cuttingSlipOrder.customerId) || null : null}
      />

      {handoverOrder && (
        <HandoverPaymentSheet
          isOpen={!!handoverOrder}
          onClose={() => setHandoverOrder(null)}
          order={handoverOrder}
          customer={customers.find((c) => c.id === handoverOrder.customerId) || null}
          balanceOwed={getBalanceOwed(handoverOrder)}
          currency={currentShop?.currency}
          onRecordPaymentAndDeliver={handleRecordPaymentAndDeliver}
          onRecordSplitPaymentAndDeliver={handleRecordSplitPaymentAndDeliver}
          onDeliverWithBalanceDue={handleDeliverWithBalanceDue}
        />
      )}

      <ConfirmDialog
        isOpen={!!amendmentOrder}
        onClose={() => {
          if (!amendmentOrder) return;
          const orderToDeliver = amendmentOrder;
          setAmendmentOrder(null);
          performDelivery(orderToDeliver.id);
        }}
        onConfirm={async () => {
          if (!amendmentOrder) return;
          const orderToDeliver = amendmentOrder;
          setAmendmentOrder(null);
          await performDelivery(orderToDeliver.id);
          if (orderToDeliver.customerId) {
            const targetCust = customers.find((c) => c.id === orderToDeliver.customerId);
            router.push(ROUTES.customerDetail(targetCust || orderToDeliver.customerId));
          }
        }}
        title="Any Fit Amendments?"
        description="Since you're delivering this order, did you make any final adjustments to the garment? You can record them now so the customer's next outfit fits perfectly from the start."
        confirmLabel="Record Amendments"
        cancelLabel="No, Fits Perfectly"
        destructive={false}
      />

      <ProductionFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filterMyTasks={filterMyTasks}
        setFilterMyTasks={setFilterMyTasks}
        staffFilterId={staffFilterId}
        setStaffFilterId={setStaffFilterId}
        staffMembers={staffMembers}
        isOwnerLike={isOwnerLikeRole(userRole)}
        totalOrdersCount={totalOrdersCount}
        myOrdersCount={myOrdersCount}
        opFilter={opFilter}
        setOpFilter={setOpFilter}
        rushCount={rushCount}
        dueCount={dueCount}
        holdCount={holdCount}
        unpaidCount={unpaidCount}
        onReset={() => {
          setOpFilter('all');
          if (isOwnerLikeRole(userRole)) {
            setFilterMyTasks(false);
          }
          setStaffFilterId(null);
        }}
        hasActiveFilters={Boolean(
          (isOwnerLikeRole(userRole) && filterMyTasks) ||
          staffFilterId !== null ||
          opFilter !== 'all'
        )}
      />
    </>
  );
}
