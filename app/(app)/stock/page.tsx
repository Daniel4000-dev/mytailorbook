'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Symbol from '@/components/ui/Symbol/Symbol';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import AddStockGarmentModal from '@/components/stock/AddStockGarmentModal/AddStockGarmentModal';
import { formatCurrency } from '@/lib/formatters';
import {
  getStockAction,
  updateStockPriceAction,
  updateStockQuantityAction,
  deleteStockGarmentAction,
  processSaleAction
} from '@/app/actions/stock';
import { FinishedGood } from '@/lib/types';
import styles from './page.module.css';

export default function StockPage() {
  const router = useRouter();
  const { currentShop, isLoaded: dataLoaded } = useData();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (dataLoaded && (currentShop?.businessMode || 'bespoke') === 'bespoke') {
      router.replace(ROUTES.dashboard);
    }
  }, [dataLoaded, currentShop, router]);

  const [stock, setStock] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [addGarmentOpen, setAddGarmentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart for POS
  const [cart, setCart] = useState<{ goodId: string; quantity: number; priceAtSale: number; name: string; size: string }[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  // Editing items
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  useEffect(() => {
    if (currentShop) {
      loadStock();
    }
  }, [currentShop]);

  const loadStock = async () => {
    if (!currentShop) return;
    setLoading(true);
    const res = await getStockAction(currentShop.id);
    if ('error' in res) {
      showToast(res.error, 'error');
    } else {
      setStock(res);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    stock.forEach(item => {
      if (item.metadata?.category) {
        set.add(item.metadata.category);
      }
    });
    return ['All', ...Array.from(set)];
  }, [stock]);

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.metadata?.color && item.metadata.color.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.metadata?.fabric && item.metadata.fabric.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' ||
        item.metadata?.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [stock, searchQuery, selectedCategory]);

  const addToCart = (item: FinishedGood) => {
    if (item.quantity <= 0) return;
    if (item.price <= 0) {
      showToast('Set a price before selling', 'error');
      openEdit(item);
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.goodId === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          showToast('Not enough stock on rack', 'error');
          return prev;
        }
        return prev.map(p => p.goodId === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { goodId: item.id, quantity: 1, priceAtSale: item.price, name: item.name, size: item.size }];
    });
  };

  const openEdit = (item: FinishedGood) => {
    setEditingItem(item);
    setEditPrice(item.price.toString());
    setEditQuantity(item.quantity.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    const price = parseFloat(editPrice) || 0;
    const qty = parseInt(editQuantity) || 0;

    let hasError = false;
    if (price !== editingItem.price) {
      const res = await updateStockPriceAction(editingItem.id, price);
      if (res.error) hasError = true;
    }
    if (qty !== editingItem.quantity) {
      const res = await updateStockQuantityAction(editingItem.id, qty);
      if (res.error) hasError = true;
    }

    if (hasError) {
      showToast('Error updating item', 'error');
    } else {
      showToast('Showroom rack updated', 'success');
      setEditingItem(null);
      loadStock();
    }
    setSavingEdit(false);
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (!window.confirm(`Are you sure you want to remove "${editingItem.name} (Size ${editingItem.size})" from the rack?`)) {
      return;
    }

    setDeletingItem(true);
    const res = await deleteStockGarmentAction(editingItem.id);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Item removed from showroom rack', 'success');
      setEditingItem(null);
      loadStock();
    }
    setDeletingItem(false);
  };

  const handleCheckout = async () => {
    if (!currentShop || !user || cart.length === 0) return;
    setProcessing(true);
    const res = await processSaleAction(currentShop.id, cart, paymentMethod, user.uid);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Sale completed successfully!', 'success');
      setCart([]);
      setCheckoutOpen(false);
      loadStock();
    }
    setProcessing(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.priceAtSale, 0);

  if (!dataLoaded || authLoading || loading) return null;

  return (
    <PageLayout
      header={
        <TopBar
          title="Showroom & Stock"
          rightAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddGarmentOpen(true)}
              icon={<Symbol name="add" size={16} />}
            >
              Add Garment
            </Button>
          }
        />
      }
    >
      <div className={styles.layout}>
        {/* Main Stock Area */}
        <div className={styles.stockArea}>
          {stock.length > 0 && (
            <div className={styles.controlsBar}>
              <Input
                placeholder="Search styles by name, color, or fabric..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                icon={<Symbol name="search" size={18} />}
              />

              {categories.length > 1 && (
                <div className={styles.filterChips}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.filterChip} ${
                        selectedCategory === cat ? styles.filterChipActive : ''
                      }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {stock.length === 0 ? (
            <EmptyState
              icon={<Symbol name="inventory_2" size={32} />}
              title="No garments on the rack yet"
              description="Add finished pieces directly to your showroom rack to begin managing inventory and recording sales."
              action={{
                label: 'Add First Garment to Rack',
                onClick: () => setAddGarmentOpen(true)
              }}
            />
          ) : filteredStock.length === 0 ? (
            <EmptyState
              icon={<Symbol name="search_off" size={32} />}
              title="No matching garments found"
              description="Try adjusting your search terms or category filter."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }
              }}
            />
          ) : (
            <div className={styles.grid}>
              {filteredStock.map(item => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = item.quantity > 0 && item.quantity <= 2;

                return (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        {item.metadata?.category && (
                          <span className={styles.categoryBadge}>
                            {item.metadata.category}
                          </span>
                        )}
                        <h3 className={styles.name}>{item.name}</h3>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(item)}
                        aria-label="Edit item"
                      >
                        <Symbol name="edit" size={16} />
                      </Button>
                    </div>

                    <div className={styles.details}>
                      <div>
                        <span>Size: <strong>{item.size}</strong></span>
                        {' • '}
                        <span
                          className={
                            isOutOfStock
                              ? styles.badgeOutOfStock
                              : isLowStock
                              ? styles.badgeLowStock
                              : ''
                          }
                        >
                          {isOutOfStock
                            ? 'Out of stock'
                            : `${item.quantity} in stock`}
                        </span>
                      </div>

                      {(item.metadata?.color || item.metadata?.fabric) && (
                        <div className={styles.metaRow}>
                          {[item.metadata?.color, item.metadata?.fabric]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}

                      {item.metadata?.rackLocation && (
                        <div className={styles.metaRow}>
                          Loc: {item.metadata.rackLocation}
                        </div>
                      )}

                      <div className={styles.price}>
                        {item.price > 0
                          ? formatCurrency(item.price, currentShop?.currency || 'NGN')
                          : 'No Price Set'}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => addToCart(item)}
                      disabled={isOutOfStock}
                      style={{ marginTop: '12px', width: '100%' }}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* POS Cart Sidebar / Bottom Bar */}
        {(cart.length > 0 || checkoutOpen) && (
          <div className={styles.cartArea}>
            <div className={styles.cartHeader}>
              <h3>Current Sale</h3>
              <span className={styles.itemCount}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className={styles.cartItems}>
              {cart.map(item => (
                <div key={item.goodId} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <span className={styles.cartItemName}>
                      {item.name} (Size {item.size})
                    </span>
                    <span className={styles.cartItemPrice}>
                      {item.quantity} x{' '}
                      {formatCurrency(item.priceAtSale, currentShop?.currency || 'NGN')}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCart(prev => prev.filter(p => p.goodId !== item.goodId))}
                  >
                    <Symbol name="close" size={16} />
                  </Button>
                </div>
              ))}
            </div>

            <div className={styles.cartTotal}>
              <span>Total</span>
              <span>{formatCurrency(cartTotal, currentShop?.currency || 'NGN')}</span>
            </div>

            <Button
              variant="primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </Button>
          </div>
        )}
      </div>

      {/* Complete Sale BottomSheet */}
      <BottomSheet isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)}>
        <div className={styles.sheetContent}>
          <h2>Complete Sale</h2>
          <div className={styles.summaryRow}>
            <span>Amount Due</span>
            <span style={{ fontSize: '24px', fontWeight: 600 }}>
              {formatCurrency(cartTotal, currentShop?.currency || 'NGN')}
            </span>
          </div>

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            options={[
              { value: 'card', label: 'Card / POS' },
              { value: 'cash', label: 'Cash' },
              { value: 'transfer', label: 'Bank Transfer' }
            ]}
          />

          <Button
            variant="primary"
            loading={processing}
            onClick={handleCheckout}
            style={{ width: '100%', marginTop: '16px' }}
          >
            Confirm Payment
          </Button>
        </div>
      </BottomSheet>

      {/* Edit Item BottomSheet */}
      <BottomSheet isOpen={!!editingItem} onClose={() => setEditingItem(null)}>
        <div className={styles.sheetContent}>
          <h2>Edit Rack Item</h2>
          {editingItem && (
            <p style={{ margin: '0 0 16px 0', color: 'var(--sf-text-secondary)' }}>
              {editingItem.name} (Size {editingItem.size})
            </p>
          )}
          <Input
            type="number"
            label="Price"
            prefix={currentShop?.currency || 'NGN'}
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
          />
          <Input
            type="number"
            label="Stock Quantity on Rack"
            value={editQuantity}
            onChange={e => setEditQuantity(e.target.value)}
          />

          <div className={styles.editActions}>
            <Button
              variant="ghost"
              style={{ color: '#ef4444' }}
              loading={deletingItem}
              onClick={handleDeleteItem}
            >
              Delete from Rack
            </Button>
            <Button
              variant="primary"
              loading={savingEdit}
              onClick={handleSaveEdit}
              style={{ flex: 1 }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Stock Garment Modal */}
      {currentShop && (
        <AddStockGarmentModal
          isOpen={addGarmentOpen}
          onClose={() => setAddGarmentOpen(false)}
          shopId={currentShop.id}
          currency={currentShop.currency || 'NGN'}
          onSuccess={loadStock}
        />
      )}
    </PageLayout>
  );
}
