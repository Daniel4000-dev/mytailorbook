'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Symbol from '@/components/ui/Symbol/Symbol';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import InventoryDetailSheet from './_components/InventoryDetailSheet';
import type { InventoryItem } from '@/lib/types';
import styles from './page.module.css';

export default function InventoryPage() {
  const { inventory, isLoaded } = useData();
  const [search, setSearch] = useState('');
  
  // selectedItem can be null (closed), 'new' (add item), or an InventoryItem (edit)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | 'new' | null>(null);

  const filtered = useMemo(() => {
    return inventory.filter((item) => 
      item.itemName.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  return (
    <PageLayout
      header={
        <TopBar
          title="Inventory"
          subtitle="Manage fabrics, thread, and materials"
          rightAction={<NotificationBell />}
        />
      }
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchWrap} style={{ marginBottom: 0, flex: 1, marginRight: 16 }}>
            <Symbol name="search" size={18} className={styles.searchIcon} />
            <input
              id="inventory-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search materials..."
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
          <Button onClick={() => setSelectedItem('new')}>
            + Add
          </Button>
        </div>

        {!isLoaded && (
          <div className={styles.inventoryList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton width="40%" height={20} borderRadius={4} />
                <Skeleton width="15%" height={24} borderRadius={4} />
              </div>
            ))}
          </div>
        )}

        {isLoaded && filtered.length > 0 && (
          <div className={styles.inventoryList}>
            {filtered.map((item) => {
              const isLowStock = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
              return (
                <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.itemName}</span>
                    <div className={styles.itemMeta}>
                      {isLowStock && <span className={styles.lowStockBadge}>Low Stock</span>}
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <span className={`${styles.qtyValue} ${isLowStock ? styles.lowStock : ''}`}>
                      {item.quantity}
                    </span>
                    <span className={styles.qtyUnit}>{item.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isLoaded && filtered.length === 0 && (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              icon={<Symbol name="inventory_2" size={32} />}
              title={search ? 'No materials found' : 'Inventory is empty'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Keep track of threads, lining, interfacing, and customer fabrics.'
              }
              action={!search ? { label: 'Add First Item', onClick: () => setSelectedItem('new') } : undefined}
            />
          </div>
        )}
      </div>

      <InventoryDetailSheet
        item={selectedItem === 'new' ? undefined : selectedItem ?? undefined}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </PageLayout>
  );
}
