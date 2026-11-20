'use client';

import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { triggerHaptic } from '@/lib/haptics';
import { ROUTES } from '@/lib/routes';
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

const SEED_STORAGE_KEY = 'mtb_inventory_seed_dadekunle31';

const SEED_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'seed-inv-1',
    shopId: 'shop-seeded',
    itemName: 'Royal Blue Cashmere Suiting Wool',
    quantity: 8.5,
    unit: 'yards',
    lowStockThreshold: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-2',
    shopId: 'shop-seeded',
    itemName: 'High-Grade Navy Satin Silk Lining',
    quantity: 24,
    unit: 'yards',
    lowStockThreshold: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-3',
    shopId: 'shop-seeded',
    itemName: 'Heavy Agbada Stay & Gum Interfacing',
    quantity: 3,
    unit: 'yards',
    lowStockThreshold: 5, // LOW STOCK TRIGGER!
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-4',
    shopId: 'shop-seeded',
    itemName: 'Medium-Weight White Collar Canvas',
    quantity: 12,
    unit: 'yards',
    lowStockThreshold: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-5',
    shopId: 'shop-seeded',
    itemName: 'Black Cones Sewing Thread (Size 40/2)',
    quantity: 7,
    unit: 'cones',
    lowStockThreshold: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-6',
    shopId: 'shop-seeded',
    itemName: 'Off-White Sewing Thread Cones',
    quantity: 2,
    unit: 'cones',
    lowStockThreshold: 4, // LOW STOCK TRIGGER!
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-7',
    shopId: 'shop-seeded',
    itemName: 'YKK 7-Inch Concealed Trouser Zips (Black)',
    quantity: 15,
    unit: 'pcs',
    lowStockThreshold: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-inv-8',
    shopId: 'shop-seeded',
    itemName: 'Metallic Senator Snap Buttons (Bronze)',
    quantity: 4,
    unit: 'packets',
    lowStockThreshold: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type CategoryFilter = 'all' | 'low_stock' | 'fabrics' | 'haberdashery';

export default function InventoryPage() {
  const router = useRouter();
  const { inventory: serverInventory, isLoaded, updateInventoryItem } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isDadekunle = user?.email?.trim().toLowerCase() === 'dadekunle31@gmail.com';

  // Seeded inventory state for dadekunle31@gmail.com
  const [seededItems, setSeededItems] = useState<InventoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SEED_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return SEED_INVENTORY_ITEMS;
  });

  // Ensure initial seed is saved in localStorage for dadekunle31@gmail.com
  useEffect(() => {
    if (isDadekunle && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SEED_STORAGE_KEY);
        if (!stored) {
          localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(SEED_INVENTORY_ITEMS));
          setSeededItems(SEED_INVENTORY_ITEMS);
        }
      } catch {}
    }
  }, [isDadekunle]);

  // Combined inventory: If dadekunle31@gmail.com and server is empty, use seeded items
  const activeItems = useMemo(() => {
    if (isDadekunle && serverInventory.length === 0) {
      return seededItems;
    }
    return serverInventory;
  }, [isDadekunle, serverInventory, seededItems]);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  
  // selectedItem can be null (closed), 'new' (add item), or an InventoryItem (edit)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | 'new' | null>(null);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(ROUTES.dashboard);
    }
  };

  // Quick 1-tap usage / restock stepper on card
  const handleQuickAdjust = async (itemId: string, delta: number) => {
    triggerHaptic('selection');
    const target = activeItems.find((i) => i.id === itemId);
    if (!target) return;

    const newQty = Math.max(0, parseFloat((target.quantity + delta).toFixed(2)));

    // If using seeded store for dadekunle31
    if (isDadekunle && serverInventory.length === 0) {
      const updated = seededItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQty, updatedAt: new Date().toISOString() } : item
      );
      setSeededItems(updated);
      try {
        localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      showToast(
        delta > 0
          ? `Restocked +${delta} ${target.unit} (${target.itemName})`
          : `Deducted ${Math.abs(delta)} ${target.unit} (${target.itemName})`,
        'success'
      );
      return;
    }

    // Otherwise use live DataContext update
    try {
      await updateInventoryItem(itemId, { quantity: newQty });
      showToast(
        delta > 0
          ? `Restocked +${delta} ${target.unit}`
          : `Deducted ${Math.abs(delta)} ${target.unit}`,
        'success'
      );
    } catch {
      showToast('Failed to adjust quantity', 'error');
    }
  };

  const handleSavedItem = (saved: InventoryItem) => {
    if (isDadekunle && serverInventory.length === 0) {
      const existingIdx = seededItems.findIndex((i) => i.id === saved.id);
      let next: InventoryItem[];
      if (existingIdx !== -1) {
        next = [...seededItems];
        next[existingIdx] = saved;
      } else {
        next = [saved, ...seededItems];
      }
      setSeededItems(next);
      try {
        localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  const handleDeletedItem = (itemId: string) => {
    if (isDadekunle && serverInventory.length === 0) {
      const next = seededItems.filter((i) => i.id !== itemId);
      setSeededItems(next);
      try {
        localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  // Counts for filter pills
  const lowStockCount = useMemo(
    () => activeItems.filter((item) => item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold).length,
    [activeItems]
  );

  const filtered = useMemo(() => {
    return activeItems.filter((item) => {
      // Search filter
      const matchesSearch = item.itemName.toLowerCase().includes(deferredSearch.toLowerCase());
      if (!matchesSearch) return false;

      // Category filter
      if (categoryFilter === 'low_stock') {
        return item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
      }
      if (categoryFilter === 'fabrics') {
        const lower = item.itemName.toLowerCase();
        return (
          lower.includes('wool') ||
          lower.includes('silk') ||
          lower.includes('lining') ||
          lower.includes('canvas') ||
          lower.includes('interfacing') ||
          lower.includes('stay') ||
          item.unit === 'yards'
        );
      }
      if (categoryFilter === 'haberdashery') {
        const lower = item.itemName.toLowerCase();
        return (
          lower.includes('thread') ||
          lower.includes('zip') ||
          lower.includes('button') ||
          item.unit === 'cones' ||
          item.unit === 'pcs' ||
          item.unit === 'packets'
        );
      }

      return true;
    });
  }, [activeItems, deferredSearch, categoryFilter]);

  return (
    <PageLayout
      header={
        <TopBar
          title="Inventory"
          subtitle="Materials, lining, threads & workshop stock"
          showBack
          onBack={handleBack}
          rightAction={<NotificationBell />}
        />
      }
    >
      <div className={styles.container}>
        {/* Top Header & Search */}
        <div className={styles.header}>
          <div className={styles.searchWrap} style={{ marginBottom: 0, flex: 1, marginRight: 16 }}>
            <Symbol name="search" size={18} className={styles.searchIcon} />
            <input
              id="inventory-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search materials, threads, canvas..."
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
            + Add Material
          </Button>
        </div>

        {/* Quick Filter Chips */}
        {activeItems.length > 0 && (
          <div className={styles.filterRow}>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'all' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Items ({activeItems.length})
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'low_stock' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('low_stock')}
              style={lowStockCount > 0 && categoryFilter !== 'low_stock' ? { color: 'var(--sf-error, #dc2626)', borderColor: 'rgba(239, 68, 68, 0.4)' } : undefined}
            >
              ⚠️ Restock Needed ({lowStockCount})
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'fabrics' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('fabrics')}
            >
              Fabrics, Canvas & Lining
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'haberdashery' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('haberdashery')}
            >
              Threads, Zips & Buttons
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
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

        {/* Inventory Cards List */}
        {isLoaded && filtered.length > 0 && (
          <div className={styles.inventoryList}>
            {filtered.map((item) => {
              const isLowStock = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
              return (
                <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.itemName}</span>
                    <div className={styles.itemMeta}>
                      {isLowStock ? (
                        <span className={styles.lowStockBadge}>⚠️ Restock Soon (≤ {item.lowStockThreshold} {item.unit})</span>
                      ) : (
                        item.lowStockThreshold != null && (
                          <span>Alert at ≤ {item.lowStockThreshold} {item.unit}</span>
                        )
                      )}
                    </div>
                  </div>

                  <div className={styles.cardRightCol}>
                    {/* 1-Tap Quick Usage / Restock Steppers */}
                    <div className={styles.quickAdjustWrap} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.quickBtn}
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        title={`Use 1 ${item.unit}`}
                        aria-label="Deduct 1 unit"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        className={styles.quickBtn}
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        title={`Restock 1 ${item.unit}`}
                        aria-label="Add 1 unit"
                      >
                        +1
                      </button>
                    </div>

                    <div className={styles.itemQty}>
                      <span className={`${styles.qtyValue} ${isLowStock ? styles.lowStock : ''}`}>
                        {item.quantity}
                      </span>
                      <span className={styles.qtyUnit}>{item.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {isLoaded && filtered.length === 0 && (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              icon={<Symbol name="inventory_2" size={32} />}
              title={search || categoryFilter !== 'all' ? 'No matching materials found' : 'Inventory is empty'}
              description={
                search || categoryFilter !== 'all'
                  ? 'Try clearing your search or selecting another category filter.'
                  : 'Keep track of threads, lining, collar canvas, and customer fabrics.'
              }
              action={
                search || categoryFilter !== 'all'
                  ? { label: 'Clear Filters', onClick: () => { setSearch(''); setCategoryFilter('all'); } }
                  : { label: 'Add First Material', onClick: () => setSelectedItem('new') }
              }
            />
          </div>
        )}
      </div>

      <InventoryDetailSheet
        item={selectedItem === 'new' ? undefined : selectedItem ?? undefined}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        onSaved={handleSavedItem}
        onDeleted={handleDeletedItem}
      />
    </PageLayout>
  );
}
