'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaXmark, FaMagnifyingGlass } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { STATUS_CONFIG, ORDER_STATUSES, getNextStatus, getPreviousStatus } from '@/lib/constants';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { OrderStatus, Role } from '@/lib/types';
import { isOwnerLikeRole } from '@/lib/types';
import KanbanColumns from './desktop/KanbanColumns';
import StageList, { ALL_FILTER, type StageFilter } from './mobile/StageList';
import ProductionBoardSkeleton from './ProductionBoardSkeleton';
import styles from './ProductionBoard.module.css';

interface ProductionBoardProps {
  userRole: Role;
}

const ACTIVE_STATUSES = ORDER_STATUSES.filter((s) => s !== 'Completed');
const STAGE_PAGE_SIZE = 15;

export default function ProductionBoard({ userRole }: ProductionBoardProps) {
  const { user } = useAuth();
  const { orders, staffMembers, isLoaded, updateOrderStatus, updateOrder } = useData();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stageFilter, setStageFilter] = useState<StageFilter>(ALL_FILTER);
  const [filterMyTasks, setFilterMyTasks] = useState(userRole === 'Staff');
  const [staffFilterId, setStaffFilterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageVisibleCounts, setStageVisibleCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const isDesktop = useIsDesktop();
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);

  // userRole falls back to 'Staff' for one tick while auth session loads; re-sync
  // once the real role is known so the Owner doesn't get stuck on "My Orders".
  // Adjusted during render (React's guidance for deriving state from a changed
  // prop) rather than in an effect — same pattern as filterKey below.
  const [prevUserRole, setPrevUserRole] = useState(userRole);
  if (userRole !== prevUserRole) {
    setPrevUserRole(userRole);
    setFilterMyTasks(userRole === 'Staff');
  }

  // Deep-link support: /production?order=<id> forwards to the order's own
  // page, /production?staff=<uid> filters the board to that staff member's
  // orders. Must react to searchParams itself, not just isLoaded — the
  // notification bell renders on this same page, so clicking a
  // notification while already on /production is a same-route navigation
  // (no remount, isLoaded never changes) and this effect needs to re-run
  // on that new query string, not just once on mount.
  useEffect(() => {
    if (!isLoaded) return;
    const orderId = searchParams.get('order');
    const staffId = searchParams.get('staff');

    if (orderId) {
      router.replace(`/production/${orderId}`);
      return;
    }
    if (staffId && isOwnerLikeRole(userRole)) {
      Promise.resolve().then(() => {
        setStaffFilterId(staffId);
        setFilterMyTasks(false);
      });
      router.replace('/production');
    }
  }, [isLoaded, searchParams, userRole, router]);

  // Order cards are plain divs (not <Link>), since each also hosts nested
  // interactive controls (reassign select, move back/forward buttons) that
  // can't sit inside a real anchor — so Next never gets a chance to
  // prefetch these routes automatically. Warm the active (non-Completed)
  // orders' detail pages as soon as the board loads instead, capped so a
  // very large board doesn't fire off an unbounded burst of requests.
  useEffect(() => {
    if (!isLoaded) return;
    const active = orders.filter((o) => o.status !== 'Completed').slice(0, 40);
    active.forEach((o) => router.prefetch(`/production/${o.id}`));
  }, [isLoaded, orders, router]);

  const handleAdvance = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = getNextStatus(order.status);
    if (!next) return;
    await updateOrderStatus(orderId, next, user?.uid || '', user?.name || '');
    showToast(`Moved to ${STATUS_CONFIG[next].label}`, 'success', {
      label: 'Undo',
      onClick: () => {
        updateOrderStatus(orderId, order.status, user?.uid || '', user?.name || '');
      },
    });
  }, [orders, updateOrderStatus, user, showToast]);

  const handleRevert = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const prev = getPreviousStatus(order.status);
    if (prev) await updateOrderStatus(orderId, prev, user?.uid || '', user?.name || '');
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
    const fromStatus = order.status;
    await updateOrderStatus(orderId, targetStatus, user?.uid || '', user?.name || '');
    showToast(`Moved to ${STATUS_CONFIG[targetStatus].label}`, 'success', {
      label: 'Undo',
      onClick: () => {
        updateOrderStatus(orderId, fromStatus, user?.uid || '', user?.name || '');
      },
    });
  }, [draggedOrderId, orders, updateOrderStatus, user, showToast]);

  const handleReassign = useCallback(async (orderId: string, staffUid: string, staffName: string) => {
    // '' rather than undefined for unassigning — the update mapper treats
    // undefined as "leave unchanged", so undefined would silently no-op.
    await updateOrder(orderId, {
      assignedTo: staffUid,
      assignedToName: staffUid ? staffName : '',
    });
    showToast(staffUid ? `Reassigned to ${staffName}` : 'Order unassigned', 'success');
  }, [updateOrder, showToast]);

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

  const getOrdersByStatus = useCallback(
    (status: OrderStatus) => filteredOrders.filter((o) => o.status === status),
    [filteredOrders]
  );

  // A changed filter/search is a new view — start each stage back at its
  // first page rather than keeping a "show more" count that referred to a
  // now-irrelevant previous list. Adjusted during render (React's guidance
  // for resetting state in response to a prop/derived-value change) rather
  // than in an effect.
  const filterKey = `${searchQuery}|${filterMyTasks}|${staffFilterId}|${stageFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setStageVisibleCounts({});
  }

  const handleShowMore = useCallback((status: OrderStatus) => {
    setStageVisibleCounts((prev) => ({ ...prev, [status]: (prev[status] ?? STAGE_PAGE_SIZE) + STAGE_PAGE_SIZE }));
  }, []);

  const handleOpen = useCallback((orderId: string) => router.push(`/production/${orderId}`), [router]);

  if (!isLoaded) {
    return <ProductionBoardSkeleton />;
  }

  const visibleStages: OrderStatus[] = stageFilter === ALL_FILTER ? [...ACTIVE_STATUSES] : [stageFilter];
  const hasAnyVisible = visibleStages.some((s) => getOrdersByStatus(s).length > 0);

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

      {/* Owner scope toggle — neutral pills in the new design */}
      {isOwnerLikeRole(userRole) && !staffFilterId && (
        <div className={styles.pillRow}>
          <FilterPill
            label="All Orders"
            count={orders.filter((o) => o.status !== 'Completed').length}
            active={!filterMyTasks}
            onClick={() => setFilterMyTasks(false)}
          />
          <FilterPill
            label="My Orders"
            count={orders.filter((o) => o.assignedTo === user?.uid && o.status !== 'Completed').length}
            active={filterMyTasks}
            onClick={() => setFilterMyTasks(true)}
          />
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
          onDragStart={setDraggedOrderId}
          onDragEnd={() => {
            setDraggedOrderId(null);
            setDragOverStatus(null);
          }}
          onDragOver={setDragOverStatus}
          onDrop={handleDrop}
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
        />
      )}
    </>
  );
}
