'use client';

import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
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
import { filterFabricOrders, type FabricStageFilter } from './utils';
import {
  getStoredMockFabricOrders,
  wipeMockFabricOrders,
  resetMockFabricOrders,
  isMockFabricsActive,
} from '@/lib/mockFabrics';
import styles from './page.module.css';

export default function FabricsPage() {
  const { orders: liveOrders, customers, isLoaded } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<FabricStageFilter>('uncut');
  const [showNoPhoto, setShowNoPhoto] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cuttingSlipOrder, setCuttingSlipOrder] = useState<Order | null>(null);

  const [mockOrders, setMockOrders] = useState<Order[]>([]);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    // If live DB has orders with images/materials, use live data
    const realFabricOrders = liveOrders.filter(
      (o) => o.images && o.images.length > 0 && o.status !== 'Delivered'
    );

    if (realFabricOrders.length > 0) {
      setMockOrders(liveOrders);
      setIsUsingMock(false);
    } else {
      // Fallback to client-side mock fabric queue for demo exploration
      const stored = getStoredMockFabricOrders();
      setMockOrders(stored);
      setIsUsingMock(isMockFabricsActive() && stored.length > 0);
    }
  }, [liveOrders]);

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

  // Stage counts for badges & metric bar
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

  const productionCount = useMemo(
    () => cuttingCount + sewingCount,
    [cuttingCount, sewingCount]
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
          subtitle="Match cutting table fabrics to orders and cutting slips"
          rightAction={<NotificationBell />}
        />
      }
    >
      {/* 1. Apple Liquid Glass Workshop Metric Bar */}
      <div className={styles.workshopMetricBar}>
        <div className={styles.workshopMetric}>
          <div className={styles.workshopMetricIcon}>
            <Symbol name="content_cut" size={18} />
          </div>
          <div className={styles.workshopMetricContent}>
            <span className={styles.workshopMetricValue}>{uncutCount}</span>
            <span className={styles.workshopMetricLabel}>Waiting on Table</span>
          </div>
        </div>
        <div className={styles.workshopMetric}>
          <div className={styles.workshopMetricIcon}>
            <Symbol name="straighten" size={18} />
          </div>
          <div className={styles.workshopMetricContent}>
            <span className={styles.workshopMetricValue}>{cuttingCount}</span>
            <span className={styles.workshopMetricLabel}>On the Shears</span>
          </div>
        </div>
        <div className={styles.workshopMetric}>
          <div className={styles.workshopMetricIcon}>
            <Symbol name="precision_manufacturing" size={18} />
          </div>
          <div className={styles.workshopMetricContent}>
            <span className={styles.workshopMetricValue}>{sewingCount}</span>
            <span className={styles.workshopMetricLabel}>Sewing Floor</span>
          </div>
        </div>
        <div className={styles.workshopMetric}>
          <div
            className={styles.workshopMetricIcon}
            style={{ color: '#DC2626', background: 'rgba(220, 38, 38, 0.08)' }}
          >
            <Symbol name="bolt" size={18} />
          </div>
          <div className={styles.workshopMetricContent}>
            <span
              className={styles.workshopMetricValue}
              style={{ color: priorityCount > 0 ? '#DC2626' : undefined }}
            >
              {priorityCount}
            </span>
            <span className={styles.workshopMetricLabel}>Rush & Urgent</span>
          </div>
        </div>
      </div>

      {/* 2. Demo Controls Pill Row (When viewing seeded sample fabrics) */}
      {isUsingMock && (
        <div className={styles.demoControlsRow}>
          <div className={styles.demoTag}>
            <Symbol name="verified" size={12} />
            <span>Demo Cutting Table</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {mockOrders.length > 0 ? (
              <button
                type="button"
                className={styles.demoActionBtn}
                style={{ color: '#DC2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                onClick={handleWipeDemo}
                title="Wipe demo fabrics"
              >
                <Symbol name="delete" size={12} />
                <span>Wipe Demo</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.demoActionBtn}
                onClick={handleResetDemo}
                title="Restore sample fabrics"
              >
                <Symbol name="auto_awesome" size={12} />
                <span>Load Sample Fabrics</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Search bar */}
      <div className={styles.searchWrap}>
        <Symbol name="search" size={18} className={styles.searchIcon} />
        <input
          id="fabric-search"
          type="search"
          className={styles.searchInput}
          placeholder="Search customer, style, cutting notes, or #ref…"
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

      {/* 4. Segmented Stage Filter Tabs */}
      <div className={styles.filtersRow}>
        <button
          type="button"
          className={`${styles.pill} ${
            stageFilter === 'uncut' ? `${styles.pillActive} ${styles.pillActiveUncut}` : ''
          }`}
          onClick={() => setStageFilter('uncut')}
        >
          <Symbol name="content_cut" size={14} />
          <span>Uncut Fabrics</span>
          <span className={styles.pillCount}>{uncutCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.pill} ${
            stageFilter === 'production' ? `${styles.pillActive} ${styles.pillActiveProduction}` : ''
          }`}
          onClick={() => setStageFilter('production')}
        >
          <Symbol name="dry_cleaning" size={14} />
          <span>In Production</span>
          <span className={styles.pillCount}>{productionCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.pill} ${
            stageFilter === 'all' ? `${styles.pillActive} ${styles.pillActiveAll}` : ''
          }`}
          onClick={() => setStageFilter('all')}
        >
          <Symbol name="texture" size={14} />
          <span>All Materials</span>
          <span className={styles.pillCount}>{allCount}</span>
        </button>
      </div>

      {/* 5. Loading skeleton */}
      {!isLoaded && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton width="100%" height={220} borderRadius={12} />
              <Skeleton width="70%" height={14} borderRadius={4} />
              <Skeleton width="50%" height={12} borderRadius={4} />
            </div>
          ))}
        </div>
      )}

      {/* 6. Gallery grid */}
      {isLoaded && (
        <>
          {filtered.length > 0 ? (
            <div className={styles.grid}>
              {filtered.map((order) => (
                <FabricCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrder(order)}
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
                    : isUsingMock && mockOrders.length === 0
                    ? 'Cutting table is currently blank'
                    : stageFilter === 'uncut'
                    ? 'All documented fabrics have been cut'
                    : stageFilter === 'production'
                    ? 'No active fabrics in cutting or sewing'
                    : 'No workshop materials found'
                }
                description={
                  search
                    ? `No materials found matching "${search}". Try searching by customer name, style, or order reference.`
                    : isUsingMock && mockOrders.length === 0
                    ? 'You have wiped the demo fabrics. Tap below to reload 7 sample bespoke fabric rolls.'
                    : stageFilter === 'uncut'
                    ? 'No uncut fabrics currently waiting on the cutting table. Switch to "In Production" to see garments being crafted.'
                    : stageFilter === 'production'
                    ? 'Move uncut fabrics from the "Uncut Fabrics" tab to start cutting and sewing.'
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
                    : stageFilter === 'uncut' && productionCount > 0
                    ? {
                        label: 'View In-Production Fabrics',
                        onClick: () => setStageFilter('production'),
                      }
                    : stageFilter === 'production' && uncutCount > 0
                    ? {
                        label: 'View Uncut Fabrics',
                        onClick: () => setStageFilter('uncut'),
                      }
                    : !showNoPhoto
                    ? {
                        label: 'Show orders without photos',
                        onClick: () => setShowNoPhoto(true),
                      }
                    : undefined
                }
              />
            </div>
          )}

          {/* Show-no-photo toggle */}
          <label className={styles.noPhotoToggle}>
            <input
              type="checkbox"
              checked={showNoPhoto}
              onChange={(e) => setShowNoPhoto(e.target.checked)}
              className={styles.noPhotoCheckbox}
            />
            <span>Show orders without fabric photos</span>
          </label>
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
