'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import FabricCard from './_components/FabricCard';
import FabricDetailSheet from './_components/FabricDetailSheet';
import type { Order, OrderStatus } from '@/lib/types';
import { filterFabricOrders } from './utils';
import styles from './page.module.css';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Cutting', value: 'Cutting' },
  { label: 'Sewing', value: 'Sewing' },
  { label: 'Ready', value: 'Ready' },
  { label: 'Documented', value: 'Documented' },
];

export default function FabricsPage() {
  const { orders, isLoaded } = useData();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [showNoPhoto, setShowNoPhoto] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return filterFabricOrders(orders, { activeFilter, search, showNoPhoto });
  }, [orders, activeFilter, search, showNoPhoto]);

  const ordersWithPhoto = useMemo(
    () => orders.filter((o) => o.status !== 'Completed' && o.images && o.images.length > 0).length,
    [orders]
  );

  return (
    <PageLayout
      header={
        <TopBar
          title="Fabric Board"
          subtitle="Tap any fabric to find its order"
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
          placeholder="Search by customer, style or details…"
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

      {/* Filter pills */}
      <div className={styles.filtersRow}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`${styles.pill} ${activeFilter === f.value ? styles.pillActive : ''}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
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
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Symbol name="checkroom" size={40} />
              </div>
              <h3 className={styles.emptyTitle}>
                {search ? 'No fabrics match your search' : 'No fabrics to show'}
              </h3>
              <p className={styles.emptyDesc}>
                {search
                  ? 'Try a different name or style.'
                  : ordersWithPhoto === 0
                  ? 'Add a photo when logging or updating an order and it will appear here.'
                  : 'All fabrics for this stage are here once a photo is added.'}
              </p>
              {!showNoPhoto && ordersWithPhoto === 0 && (
                <button
                  type="button"
                  className={styles.toggleNoPhotoBtn}
                  onClick={() => setShowNoPhoto(true)}
                >
                  Show orders without photos
                </button>
              )}
            </div>
          )}

          {/* Show-no-photo toggle (when results exist) */}
          {filtered.length > 0 && (
            <label className={styles.noPhotoToggle}>
              <input
                type="checkbox"
                checked={showNoPhoto}
                onChange={(e) => setShowNoPhoto(e.target.checked)}
                className={styles.noPhotoCheckbox}
              />
              <span>Show orders without photos</span>
            </label>
          )}
        </>
      )}

      {/* Detail sheet */}
      <FabricDetailSheet
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />
    </PageLayout>
  );
}
