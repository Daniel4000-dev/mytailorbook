'use client';

import { useState, useMemo, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
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

type CategoryFilter = 'all' | 'low_stock' | 'fabrics' | 'haberdashery';

function getMaterialCategory(item: InventoryItem): 'fabric' | 'haberdashery' | 'notion' {
  const lower = item.itemName.toLowerCase();
  if (lower.includes('thread') || item.unit === 'cones') return 'notion';
  if (lower.includes('zip') || lower.includes('button') || item.unit === 'pcs' || item.unit === 'packets') return 'haberdashery';
  return 'fabric';
}

export default function InventoryPage() {
  const router = useRouter();
  const { inventory: activeItems, isLoaded, updateInventoryItem } = useData();
  const { showToast } = useToast();

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

    try {
      await updateInventoryItem(itemId, { quantity: newQty });
      showToast(
        delta > 0
          ? `Restocked +${delta} ${target.unit} (${target.itemName})`
          : `Deducted ${Math.abs(delta)} ${target.unit} (${target.itemName})`,
        'success'
      );
    } catch {
      showToast('Failed to adjust quantity', 'error');
    }
  };

  // Counts for filter pills & hero overview
  const lowStockCount = useMemo(
    () => activeItems.filter((item) => item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold).length,
    [activeItems]
  );

  const healthyCount = useMemo(
    () => Math.max(0, activeItems.length - lowStockCount),
    [activeItems.length, lowStockCount]
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
        const cat = getMaterialCategory(item);
        return cat === 'fabric';
      }
      if (categoryFilter === 'haberdashery') {
        const cat = getMaterialCategory(item);
        return cat === 'notion' || cat === 'haberdashery';
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
        {/* 1. Executive Material Health Overview Card */}
        {activeItems.length > 0 && (
          <div className={styles.heroCard}>
            <div className={styles.heroStatsGrid}>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatHeader}>
                  <Symbol name="inventory_2" size={13} />
                  <span>Materials Tracked</span>
                </div>
                <div className={styles.heroStatValue}>{activeItems.length}</div>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatHeader}>
                  <Symbol name="warning" size={13} />
                  <span>Restock Needed</span>
                </div>
                <div className={`${styles.heroStatValue} ${lowStockCount > 0 ? styles.heroStatValueAlert : ''}`}>
                  {lowStockCount}
                </div>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatHeader}>
                  <Symbol name="check_circle" size={13} />
                  <span>In Stock</span>
                </div>
                <div className={`${styles.heroStatValue} ${styles.heroStatValueHealthy}`}>
                  {healthyCount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Top Search & Add Action */}
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

        {/* 3. Category Navigation Filter Chips */}
        {activeItems.length > 0 && (
          <div className={styles.filterRow}>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'all' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Materials ({activeItems.length})
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'low_stock' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('low_stock')}
              style={lowStockCount > 0 && categoryFilter !== 'low_stock' ? { color: 'var(--sf-error, #dc2626)', borderColor: 'rgba(239, 68, 68, 0.4)' } : undefined}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Symbol name="warning" size={13} />
                <span>Restock Needed ({lowStockCount})</span>
              </span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'fabrics' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('fabrics')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Symbol name="texture" size={13} />
                <span>Fabrics, Canvas & Lining</span>
              </span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${categoryFilter === 'haberdashery' ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter('haberdashery')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Symbol name="content_cut" size={13} />
                <span>Threads, Zips & Buttons</span>
              </span>
            </button>
          </div>
        )}

        {/* 4. Loading Skeletons */}
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

        {/* 5. Elegant Inventory Cards List */}
        {isLoaded && filtered.length > 0 && (
          <div className={styles.inventoryList}>
            {filtered.map((item) => {
              const isLowStock = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
              const cat = getMaterialCategory(item);
              const avatarClass =
                cat === 'fabric'
                  ? styles.avatarEmerald
                  : cat === 'notion'
                  ? styles.avatarIndigo
                  : styles.avatarAmber;
              const avatarIcon =
                cat === 'fabric' ? 'texture' : cat === 'notion' ? 'straighten' : 'content_cut';

              return (
                <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                  <div className={styles.cardLeftRow}>
                    <div className={`${styles.categoryAvatar} ${avatarClass}`}>
                      <Symbol name={avatarIcon} size={18} />
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.itemName}</span>
                      <div className={styles.itemMeta}>
                        {isLowStock ? (
                          <span className={styles.lowStockBadge}>
                            <Symbol name="warning" size={12} />
                            <span>Restock Alert (&le; {item.lowStockThreshold} {item.unit})</span>
                          </span>
                        ) : item.lowStockThreshold != null ? (
                          <span className={styles.normalStockBadge}>
                            <Symbol name="check" size={12} />
                            <span>In Stock (&gt; {item.lowStockThreshold} {item.unit})</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardRightCol}>
                    {/* 1-Tap Quick Steppers */}
                    <div className={styles.quickAdjustWrap} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.quickBtn}
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        title={`Use 1 ${item.unit}`}
                        aria-label="Deduct 1 unit"
                      >
                        <Symbol name="remove" size={13} />
                      </button>
                      <button
                        type="button"
                        className={styles.quickBtn}
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        title={`Restock 1 ${item.unit}`}
                        aria-label="Add 1 unit"
                      >
                        <Symbol name="add" size={13} />
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

        {/* 6. Empty State */}
        {isLoaded && filtered.length === 0 && (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              icon={<Symbol name="inventory_2" size={32} />}
              title={search || categoryFilter !== 'all' ? 'No matching materials found' : 'Inventory is empty'}
              description={
                search || categoryFilter !== 'all'
                  ? 'Try clearing your search or selecting another category filter.'
                  : 'Keep track of threads, lining, collar canvas, and workshop materials.'
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
      />
    </PageLayout>
  );
}
