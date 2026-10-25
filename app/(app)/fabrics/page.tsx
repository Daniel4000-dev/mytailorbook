'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import FabricCard from './_components/FabricCard';
import FabricDetailSheet from './_components/FabricDetailSheet';
import CuttingSlipModal from '../production/_components/CuttingSlipModal';
import type { Order } from '@/lib/types';
import { filterFabricOrders, type FabricStageFilter } from './utils';
import styles from './page.module.css';

export default function FabricsPage() {
  const { orders, customers, isLoaded } = useData();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<FabricStageFilter>('uncut');
  const [showNoPhoto, setShowNoPhoto] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cuttingSlipOrder, setCuttingSlipOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return filterFabricOrders(orders, { search, stageFilter, showNoPhoto });
  }, [orders, search, stageFilter, showNoPhoto]);

  // Stage counts for badges
  const uncutCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'Documented' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [orders, showNoPhoto]
  );

  const productionCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === 'Cutting' || o.status === 'Sewing') &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [orders, showNoPhoto]
  );

  const allCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== 'Delivered' &&
          (showNoPhoto || (o.images && o.images.length > 0))
      ).length,
    [orders, showNoPhoto]
  );

  // Customer for cutting slip modal
  const cuttingSlipCustomer = useMemo(() => {
    if (!cuttingSlipOrder) return null;
    return (
      customers.find(
        (c) =>
          c.id === cuttingSlipOrder.customerId ||
          (c.fullName &&
            c.fullName.toLowerCase() === cuttingSlipOrder.customerName?.toLowerCase())
      ) || null
    );
  }, [customers, cuttingSlipOrder]);

  return (
    <PageLayout
      header={
        <TopBar
          title="Fabric Board"
          subtitle="Match cutting table fabrics to orders and cutting slips"
          rightAction={<NotificationBell />}
        />
      }
    >
      {/* Search bar */}
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

      {/* Segmented Stage Filter Tabs */}
      <div className={styles.filtersRow}>
        <button
          type="button"
          className={`${styles.pill} ${stageFilter === 'uncut' ? styles.pillActive : ''}`}
          onClick={() => setStageFilter('uncut')}
        >
          <Symbol name="content_cut" size={14} />
          <span>Uncut Fabrics</span>
          <span className={styles.pillCount}>{uncutCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.pill} ${stageFilter === 'production' ? styles.pillActive : ''}`}
          onClick={() => setStageFilter('production')}
        >
          <Symbol name="dry_cleaning" size={14} />
          <span>In Production</span>
          <span className={styles.pillCount}>{productionCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.pill} ${stageFilter === 'all' ? styles.pillActive : ''}`}
          onClick={() => setStageFilter('all')}
        >
          <Symbol name="texture" size={14} />
          <span>All Materials</span>
          <span className={styles.pillCount}>{allCount}</span>
        </button>
      </div>

      {/* Loading skeleton */}
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

      {/* Gallery grid */}
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
                    : stageFilter === 'uncut'
                    ? 'All documented fabrics have been cut'
                    : stageFilter === 'production'
                    ? 'No active fabrics in cutting or sewing'
                    : 'No workshop materials found'
                }
                description={
                  search
                    ? `No materials found matching "${search}". Try searching by customer name, style, or order reference.`
                    : stageFilter === 'uncut'
                    ? 'No uncut fabrics currently waiting on the cutting table. Switch to "In Production" to see garments being crafted.'
                    : stageFilter === 'production'
                    ? 'Move uncut fabrics from the "Uncut Fabrics" tab to start cutting and sewing.'
                    : 'Documented fabric swatches and workshop garments will appear here.'
                }
                action={
                  search
                    ? { label: 'Clear Search', onClick: () => setSearch('') }
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

      {/* Detail sheet */}
      <FabricDetailSheet
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        onOpenCuttingSlip={(order) => setCuttingSlipOrder(order)}
      />

      {/* Cutting Slip Modal */}
      <CuttingSlipModal
        isOpen={cuttingSlipOrder !== null}
        onClose={() => setCuttingSlipOrder(null)}
        order={cuttingSlipOrder}
        customer={cuttingSlipCustomer}
      />
    </PageLayout>
  );
}
