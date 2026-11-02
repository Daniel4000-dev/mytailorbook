'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { isMockDataAllowed } from '@/lib/constants';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import FabricCard from './_components/FabricCard';
import FabricDetailSheet from './_components/FabricDetailSheet';
import CuttingSlipModal from '../production/_components/CuttingSlipModal';
import type { Order, Customer } from '@/lib/types';
import { ROUTES } from '@/lib/routes';
import { filterFabricOrders, type FabricStageFilter } from './utils';
import {
  getStoredMockFabricOrders,
  wipeMockFabricOrders,
  resetMockFabricOrders,
  isMockFabricsActive,
} from '@/lib/mockFabrics';
import styles from './page.module.css';

export default function FabricsPage() {
  const router = useRouter();
  const { orders: liveOrders, customers, isLoaded } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isMockAllowed = isMockDataAllowed(user?.email);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<FabricStageFilter>('uncut');
  const [showNoPhoto, setShowNoPhoto] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cuttingSlipOrder, setCuttingSlipOrder] = useState<Order | null>(null);

  const [mockOrders, setMockOrders] = useState<Order[]>([]);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    // If live DB has active orders, use live data
    const realFabricOrders = liveOrders.filter(
      (o) => o.status !== 'Delivered'
    );

    if (realFabricOrders.length > 0) {
      setMockOrders(liveOrders);
      setIsUsingMock(false);
    } else if (isMockAllowed) {
      // Fallback to client-side mock fabric queue for demo exploration only if allowed
      const stored = getStoredMockFabricOrders();
      setMockOrders(stored);
      setIsUsingMock(isMockFabricsActive() && stored.length > 0);
    } else {
      setMockOrders(liveOrders);
      setIsUsingMock(false);
    }
  }, [liveOrders, isMockAllowed]);

  const activeOrders = isUsingMock ? mockOrders : liveOrders;

  const handleWipeDemo = () => {
    const empty = wipeMockFabricOrders();
    setMockOrders(empty);
    showToast('Demo fabrics wiped. Cutting table is now blank.', 'info');
  };

  const handleResetDemo = () => {
    const fresh = resetMockFabricOrders();
    setMockOrders(fresh);
    setIsUsingMock(true);
    showToast('Sample bespoke fabric orders restored to cutting table!', 'success');
  };

  const filtered = useMemo(() => {
    return filterFabricOrders(activeOrders, { search, stageFilter, showNoPhoto });
  }, [activeOrders, search, stageFilter, showNoPhoto]);

  // Stage counts for badges & segmented control
  const uncutCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          o.status === 'Documented' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [activeOrders, showNoPhoto]
  );

  const cuttingCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          o.status === 'Cutting' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [activeOrders, showNoPhoto]
  );

  const sewingCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          o.status === 'Sewing' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [activeOrders, showNoPhoto]
  );

  const priorityCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          o.status !== 'Delivered' &&
          (o.priority === 'rush' || o.priority === 'urgent')
      ).length,
    [activeOrders]
  );

  const allCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          o.status !== 'Delivered' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [activeOrders, showNoPhoto]
  );

  // Customer for cutting slip modal
  const cuttingSlipCustomer = useMemo(() => {
    if (!cuttingSlipOrder) return null;
    const found = customers.find(
      (c) =>
        c.id === cuttingSlipOrder.customerId ||
        (c.fullName &&
          c.fullName.toLowerCase() === cuttingSlipOrder.customerName?.toLowerCase())
    );
    if (found) return found;

    // Synthesize fallback customer profile if viewing mock orders
    const synth: Customer = {
      id: cuttingSlipOrder.customerId || 'synth-cust',
      shopId: cuttingSlipOrder.shopId,
      fullName: cuttingSlipOrder.customerName || 'Walk-in Client',
      whatsappNumber: '+2348030000000',
      gender: 'male',
      createdAt: new Date().toISOString(),
      measurements: cuttingSlipOrder.measurements,
    };
    return synth;
  }, [customers, cuttingSlipOrder]);

  return (
    <PageLayout
      header={
        <TopBar
          title="Cutting Table"
          subtitle="Client fabrics, cutting slips, and shears queue"
          showBack
          onBack={() => router.push(ROUTES.dashboard)}
          rightAction={<NotificationBell />}
        />
      }
    >
      {/* 1. Atelier Search Bar */}
      <div className={styles.searchWrap}>
        <Symbol name="search" size={18} className={styles.searchIcon} />
        <input
          id="fabric-search"
          type="search"
          className={styles.searchInput}
          placeholder="Search client, style, cutting notes, or #ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <Symbol name="close" size={16} />
          </button>
        )}
      </div>

      {/* 2. Apple iOS Atelier Segmented Control */}
      <div className={styles.stageSegmentedWrap} role="tablist" aria-label="Cutting Table Stages">
        <div className={styles.stageSegmentedControl}>
          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'uncut'}
            className={`${styles.stageSegmentBtn} ${stageFilter === 'uncut' ? styles.stageSegmentActive : ''}`}
            onClick={() => setStageFilter('uncut')}
          >
            <span>Waiting to Cut</span>
            <span className={styles.stageSegmentCount}>{uncutCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'cutting'}
            className={`${styles.stageSegmentBtn} ${stageFilter === 'cutting' ? styles.stageSegmentActive : ''}`}
            onClick={() => setStageFilter('cutting')}
          >
            <span>Cutting</span>
            <span className={styles.stageSegmentCount}>{cuttingCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'sewing'}
            className={`${styles.stageSegmentBtn} ${stageFilter === 'sewing' ? styles.stageSegmentActive : ''}`}
            onClick={() => setStageFilter('sewing')}
          >
            <span>Sewing</span>
            <span className={styles.stageSegmentCount}>{sewingCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'urgent'}
            className={`${styles.stageSegmentBtn} ${stageFilter === 'urgent' ? styles.stageSegmentActive : ''}`}
            onClick={() => setStageFilter('urgent')}
          >
            <span>Rush</span>
            <span
              className={`${styles.stageSegmentCount} ${priorityCount > 0 ? styles.stageSegmentCountUrgent : ''}`}
            >
              {priorityCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'all'}
            className={`${styles.stageSegmentBtn} ${stageFilter === 'all' ? styles.stageSegmentActive : ''}`}
            onClick={() => setStageFilter('all')}
          >
            <span>All</span>
            <span className={styles.stageSegmentCount}>{allCount}</span>
          </button>
        </div>
      </div>

      {/* 3. Loading skeleton */}
      {!isLoaded && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton width="100%" height={200} borderRadius={14} />
              <Skeleton width="70%" height={14} borderRadius={4} />
              <Skeleton width="50%" height={12} borderRadius={4} />
            </div>
          ))}
        </div>
      )}

      {/* 4. Swatches Grid */}
      {isLoaded && (
        <>
          {filtered.length > 0 ? (
            <div className={styles.grid}>
              {filtered.map((order) => (
                <FabricCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                  onOpenSlip={(o) => setCuttingSlipOrder(o)}
                />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 24 }}>
              <EmptyState
                icon={<Symbol name="texture" size={32} />}
                title={
                  search
                    ? 'No fabrics match your search'
                    : stageFilter === 'uncut'
                      ? 'All documented fabrics have been cut'
                      : stageFilter === 'cutting'
                        ? 'No fabrics currently on the shears'
                        : stageFilter === 'sewing'
                          ? 'No cut fabrics currently in sewing'
                          : stageFilter === 'urgent'
                            ? 'No rush fabric orders pending'
                            : 'Cutting table is clear'
                }
                description={
                  search
                    ? `No materials found matching "${search}". Try searching by customer name, style, or order reference.`
                    : stageFilter === 'uncut'
                      ? 'No uncut fabrics currently waiting on the table. Switch to "Cutting" or "Sewing" to view active atelier garments.'
                      : stageFilter === 'cutting'
                        ? 'Select an order from "Waiting to Cut" to begin cutting cloth on the workshop table.'
                        : stageFilter === 'sewing'
                          ? 'Cut pieces are passed directly to the sewing machine.'
                          : stageFilter === 'urgent'
                            ? 'No rush or high-priority fabric orders are in queue.'
                            : 'Documented fabric swatches and workshop garments will appear here.'
                }
                action={
                  search
                    ? { label: 'Clear Search', onClick: () => setSearch('') }
                    : isUsingMock && mockOrders.length === 0
                      ? {
                        label: 'Load Sample Fabrics',
                        onClick: handleResetDemo,
                      }
                      : stageFilter === 'uncut' && cuttingCount > 0
                        ? {
                          label: 'View Cutting Queue',
                          onClick: () => setStageFilter('cutting'),
                        }
                        : stageFilter !== 'all' && allCount > 0
                          ? {
                            label: 'View All Orders',
                            onClick: () => setStageFilter('all'),
                          }
                          : {
                            label: 'Create New Order',
                            onClick: () => router.push(ROUTES.orderNew),
                          }
                }
              />
            </div>
          )}
        </>
      )}

      {/* 7. Detail sheet */}
      <FabricDetailSheet
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        onOpenCuttingSlip={(order) => setCuttingSlipOrder(order)}
      />

      {/* 8. Cutting Slip Modal */}
      <CuttingSlipModal
        isOpen={cuttingSlipOrder !== null}
        onClose={() => setCuttingSlipOrder(null)}
        order={cuttingSlipOrder}
        customer={cuttingSlipCustomer}
      />
    </PageLayout>
  );
}