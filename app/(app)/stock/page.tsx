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
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import {
  getStockAction,
  updateStockPriceAction,
  updateStockQuantityAction,
  quickRestockSizeAction,
  deleteStockGarmentAction,
  processSaleAction,
  ProcessSaleItem
} from '@/app/actions/stock';
import { FinishedGood } from '@/lib/types';
import styles from './page.module.css';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];
const sortSizes = (a: string, b: string) => {
  const indexA = SIZE_ORDER.indexOf(a);
  const indexB = SIZE_ORDER.indexOf(b);
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.localeCompare(b);
};

interface StyleGroup {
  key: string;
  name: string;
  category?: string;
  color?: string;
  fabric?: string;
  rackLocation?: string;
  price: number;
  totalQuantity: number;
  items: FinishedGood[];
  hasLowStock: boolean;
  isOutOfStock: boolean;
}

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');

  // Cart for POS
  const [cart, setCart] = useState<ProcessSaleItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pos');
  const [processing, setProcessing] = useState(false);

  // POS Checkout Options & e-Receipt state
  const [discountInput, setDiscountInput] = useState('');
  const [customerMode, setCustomerMode] = useState<'walkin' | 'attach'>('walkin');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [completedSale, setCompletedSale] = useState<{
    orderId: string;
    totalAmount: number;
    customerName: string;
    customerPhone?: string;
    paymentMethod: string;
    itemCount: number;
  } | null>(null);

  // Editing individual item
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  // Editing style group
  const [editingGroup, setEditingGroup] = useState<StyleGroup | null>(null);
  const [editGroupPrice, setEditGroupPrice] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

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

  // Metrics
  const totalPieces = useMemo(() => {
    return stock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [stock]);

  const totalRetailValuation = useMemo(() => {
    return stock.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  }, [stock]);

  const lowStockSizesCount = useMemo(() => {
    return stock.filter(item => item.quantity > 0 && item.quantity <= 2).length;
  }, [stock]);

  const outOfStockSizesCount = useMemo(() => {
    return stock.filter(item => item.quantity === 0).length;
  }, [stock]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stock.forEach(item => {
      if (item.metadata?.category) {
        set.add(item.metadata.category);
      }
    });
    return ['All', ...Array.from(set)];
  }, [stock]);

  const styleGroups = useMemo<StyleGroup[]>(() => {
    const map = new Map<string, FinishedGood[]>();
    stock.forEach(item => {
      const key = item.name.trim().toLowerCase();
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });

    const groups: StyleGroup[] = [];
    map.forEach((items, key) => {
      items.sort((a, b) => sortSizes(a.size, b.size));
      const first = items[0];
      const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const hasLowStock = items.some(i => i.quantity > 0 && i.quantity <= 2);
      const isOutOfStock = totalQuantity === 0;

      groups.push({
        key,
        name: first.name,
        category: first.metadata?.category,
        color: first.metadata?.color,
        fabric: first.metadata?.fabric,
        rackLocation: first.metadata?.rackLocation,
        price: first.price,
        totalQuantity,
        items,
        hasLowStock,
        isOutOfStock
      });
    });

    return groups;
  }, [stock]);

  const filteredStyleGroups = useMemo(() => {
    return styleGroups.filter(group => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        group.name.toLowerCase().includes(q) ||
        (group.category && group.category.toLowerCase().includes(q)) ||
        (group.color && group.color.toLowerCase().includes(q)) ||
        (group.fabric && group.fabric.toLowerCase().includes(q)) ||
        (group.rackLocation && group.rackLocation.toLowerCase().includes(q)) ||
        group.items.some(i => i.size.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || group.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = group.hasLowStock;
      } else if (statusFilter === 'out_of_stock') {
        matchesStatus = group.isOutOfStock;
      } else if (statusFilter === 'in_stock') {
        matchesStatus = group.totalQuantity > 0;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [styleGroups, searchQuery, selectedCategory, statusFilter]);

  const filteredFlatStock = useMemo(() => {
    return stock.filter(item => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        (item.metadata?.category && item.metadata.category.toLowerCase().includes(q)) ||
        (item.metadata?.color && item.metadata.color.toLowerCase().includes(q)) ||
        (item.metadata?.fabric && item.metadata.fabric.toLowerCase().includes(q)) ||
        (item.metadata?.rackLocation && item.metadata.rackLocation.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || item.metadata?.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = item.quantity > 0 && item.quantity <= 2;
      } else if (statusFilter === 'out_of_stock') {
        matchesStatus = item.quantity === 0;
      } else if (statusFilter === 'in_stock') {
        matchesStatus = item.quantity > 0;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stock, searchQuery, selectedCategory, statusFilter]);

  const addToCart = (item: FinishedGood) => {
    if (item.quantity <= 0) {
      showToast(`Size ${item.size} is out of stock. Tap + to restock`, 'info');
      return;
    }
    if (item.price <= 0) {
      showToast('Set a price before selling', 'error');
      openEdit(item);
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.goodId === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          showToast(`Only ${item.quantity} available on rack`, 'error');
          return prev;
        }
        return prev.map(p => p.goodId === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { goodId: item.id, quantity: 1, priceAtSale: item.price, name: item.name, size: item.size }];
    });
    showToast(`Added ${item.name} (${item.size}) to cart`, 'success');
  };

  const handleQuickRestock = async (item: FinishedGood, delta: number) => {
    const res = await quickRestockSizeAction(item.id, delta);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Size ${item.size} now has ${res.newQuantity} on rack`, 'success');
      setStock(prev =>
        prev.map(p => (p.id === item.id ? { ...p, quantity: res.newQuantity ?? p.quantity } : p))
      );
    }
  };

  const updateCartQuantity = (goodId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(p => p.goodId === goodId);
      if (!existing) return prev;
      const targetGood = stock.find(s => s.id === goodId);
      const maxStock = targetGood ? targetGood.quantity : existing.quantity;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(p => p.goodId !== goodId);
      }
      if (newQty > maxStock) {
        showToast('Not enough stock on rack', 'error');
        return prev;
      }
      return prev.map(p => p.goodId === goodId ? { ...p, quantity: newQty } : p);
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
    const price = Math.max(0, parseFloat(editPrice) || 0);
    const qty = Math.max(0, parseInt(editQuantity, 10) || 0);

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

  const openStyleEdit = (group: StyleGroup) => {
    setEditingGroup(group);
    setEditGroupPrice(group.price > 0 ? group.price.toString() : '');
  };

  const handleSaveStyleEdit = async () => {
    if (!editingGroup) return;
    setSavingGroup(true);
    const newPrice = Math.max(0, parseFloat(editGroupPrice) || 0);

    let hasError = false;
    if (newPrice !== editingGroup.price) {
      for (const item of editingGroup.items) {
        const res = await updateStockPriceAction(item.id, newPrice);
        if (res.error) hasError = true;
      }
    }

    if (hasError) {
      showToast('Error updating style price', 'error');
    } else {
      showToast(`Updated showroom price for ${editingGroup.name}`, 'success');
      setEditingGroup(null);
      loadStock();
    }
    setSavingGroup(false);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.priceAtSale, 0);
  const numericDiscount = Math.max(0, parseFloat(discountInput.replace(/,/g, '')) || 0);
  const cappedDiscount = Math.min(numericDiscount, cartSubtotal);
  const cartTotal = Math.max(0, cartSubtotal - cappedDiscount);

  const cartCostTotal = useMemo(() => {
    return cart.reduce((sum, cartItem) => {
      const originalItem = stock.find(s => s.id === cartItem.goodId);
      const cost = originalItem?.metadata?.costPrice || 0;
      return sum + (cost * cartItem.quantity);
    }, 0);
  }, [cart, stock]);

  const isBelowCost = cartCostTotal > 0 && cartTotal < cartCostTotal;

  const handleNewSale = () => {
    setCompletedSale(null);
    setCheckoutOpen(false);
    setDiscountInput('');
    setCustomerMode('walkin');
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setNotesInput('');
  };

  const handleCheckout = async () => {
    if (!currentShop || !user || cart.length === 0) return;
    setProcessing(true);
    const saleOptions = {
      customerName: customerMode === 'attach' && customerNameInput.trim() ? customerNameInput.trim() : 'Retail Walk-In',
      customerPhone: customerMode === 'attach' && customerPhoneInput.trim() ? customerPhoneInput.trim() : undefined,
      discountAmount: cappedDiscount > 0 ? cappedDiscount : undefined,
      notes: customerMode === 'attach' && notesInput.trim() ? notesInput.trim() : undefined,
    };

    const res = await processSaleAction(currentShop.id, cart, paymentMethod, user.uid, saleOptions);
    if (res.error) {
      showToast(res.error, 'error');
    } else if (res.orderId) {
      showToast('Sale completed successfully!', 'success');
      setCompletedSale({
        orderId: res.orderId,
        totalAmount: res.totalAmount ?? cartTotal,
        customerName: saleOptions.customerName,
        customerPhone: saleOptions.customerPhone,
        paymentMethod,
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      });
      setCart([]);
      loadStock();
    }
    setProcessing(false);
  };

  const handleShareReceiptWhatsApp = () => {
    if (!completedSale) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const receiptUrl = `${origin}${ROUTES.receipt(completedSale.orderId)}`;
    const recipient = completedSale.customerName === 'Retail Walk-In' ? 'valued customer' : completedSale.customerName;
    const msg = `Hello ${recipient}, thank you for your purchase at ${currentShop?.name || 'our boutique'}! Here is your official e-receipt: ${receiptUrl}`;

    const isGenericPhone = !completedSale.customerPhone || completedSale.customerPhone === '0000000001' || completedSale.customerPhone.startsWith('23400');
    const waUrl = !isGenericPhone
      ? getWhatsAppLink(completedSale.customerPhone!, msg)
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
  };

  const handleViewReceipt = () => {
    if (!completedSale) return;
    window.open(ROUTES.receipt(completedSale.orderId), '_blank');
  };

  if (!dataLoaded || authLoading || loading) return null;

  const currency = currentShop?.currency || 'NGN';
  const hasItemsToShow = viewMode === 'grouped' ? filteredStyleGroups.length > 0 : filteredFlatStock.length > 0;

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
            <>
              {/* Showroom Floor Metrics Bar */}
              <div className={styles.metricsBar}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Total on Rack</span>
                  <span className={styles.metricValue}>{totalPieces}</span>
                  <span className={styles.metricSub}>Garment pieces</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Rack Valuation</span>
                  <span className={styles.metricValue}>{formatCurrency(totalRetailValuation, currency)}</span>
                  <span className={styles.metricSub}>Retail stock value</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Showroom Styles</span>
                  <span className={styles.metricValue}>{styleGroups.length}</span>
                  <span className={styles.metricSub}>Unique garment designs</span>
                </div>
                <div
                  className={`${styles.metricCard} ${
                    lowStockSizesCount + outOfStockSizesCount > 0 ? styles.metricAlert : ''
                  }`}
                  onClick={() => {
                    if (lowStockSizesCount + outOfStockSizesCount > 0) {
                      setStatusFilter(prev => (prev === 'low_stock' ? 'all' : 'low_stock'));
                    }
                  }}
                  title={lowStockSizesCount + outOfStockSizesCount > 0 ? 'Click to filter low stock items' : ''}
                >
                  <span className={styles.metricLabel}>Stock Alerts</span>
                  <span className={styles.metricValue}>
                    {lowStockSizesCount + outOfStockSizesCount}
                  </span>
                  <span className={styles.metricSub}>
                    {lowStockSizesCount} low • {outOfStockSizesCount} sold out
                  </span>
                </div>
              </div>

              {/* Controls, Filters & View Mode */}
              <div className={styles.controlsBar}>
                <Input
                  placeholder="Search styles by name, size, color, or fabric..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  icon={<Symbol name="search" size={18} />}
                />

                <div className={styles.viewModeBar}>
                  {/* Category Chips */}
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

                  {/* View Mode Switcher */}
                  <div className={styles.viewModeToggle}>
                    <button
                      type="button"
                      className={`${styles.viewModeBtn} ${
                        viewMode === 'grouped' ? styles.viewModeBtnActive : ''
                      }`}
                      onClick={() => setViewMode('grouped')}
                    >
                      Grouped by Style
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewModeBtn} ${
                        viewMode === 'all' ? styles.viewModeBtnActive : ''
                      }`}
                      onClick={() => setViewMode('all')}
                    >
                      All Units ({stock.length})
                    </button>
                  </div>
                </div>

                {/* Status Chips */}
                <div className={styles.filterChips}>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${
                      statusFilter === 'all' ? styles.filterChipActive : ''
                    }`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All Items
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${
                      statusFilter === 'in_stock' ? styles.filterChipActive : ''
                    }`}
                    onClick={() => setStatusFilter('in_stock')}
                  >
                    In Stock
                  </button>
                  {lowStockSizesCount > 0 && (
                    <button
                      type="button"
                      className={`${styles.filterChip} ${
                        statusFilter === 'low_stock' ? styles.filterChipActive : ''
                      }`}
                      onClick={() => setStatusFilter('low_stock')}
                    >
                      Low Stock ({lowStockSizesCount})
                    </button>
                  )}
                  {outOfStockSizesCount > 0 && (
                    <button
                      type="button"
                      className={`${styles.filterChip} ${
                        statusFilter === 'out_of_stock' ? styles.filterChipActive : ''
                      }`}
                      onClick={() => setStatusFilter('out_of_stock')}
                    >
                      Out of Stock ({outOfStockSizesCount})
                    </button>
                  )}
                </div>
              </div>
            </>
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
          ) : !hasItemsToShow ? (
            <EmptyState
              icon={<Symbol name="search_off" size={32} />}
              title="No matching garments found"
              description="Try adjusting your search terms, category, or stock status filter."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setStatusFilter('all');
                }
              }}
            />
          ) : viewMode === 'grouped' ? (
            /* Style-Grouped Showroom View */
            <div className={styles.grid}>
              {filteredStyleGroups.map(group => {
                return (
                  <div key={group.key} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        {group.category && (
                          <span className={styles.categoryBadge}>{group.category}</span>
                        )}
                        <h3 className={styles.name}>{group.name}</h3>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openStyleEdit(group)}
                        aria-label={`Edit ${group.name}`}
                      >
                        <Symbol name="edit" size={16} />
                      </Button>
                    </div>

                    <div className={styles.details}>
                      <div className={styles.stockSummaryRow}>
                        <span>Total: <strong>{group.totalQuantity} pcs</strong></span>
                        {' • '}
                        <span
                          className={
                            group.totalQuantity === 0
                              ? styles.badgeOutOfStock
                              : group.hasLowStock
                              ? styles.badgeLowStock
                              : ''
                          }
                        >
                          {group.totalQuantity === 0
                            ? 'Out of stock'
                            : `${group.items.length} size${group.items.length !== 1 ? 's' : ''} on rack`}
                        </span>
                      </div>

                      {(group.color || group.fabric) && (
                        <div className={styles.metaRow}>
                          {[group.color, group.fabric].filter(Boolean).join(' • ')}
                        </div>
                      )}

                      {group.rackLocation && (
                        <div className={styles.metaRow}>
                          Loc: {group.rackLocation}
                        </div>
                      )}

                      <div className={styles.price}>
                        {group.price > 0
                          ? formatCurrency(group.price, currency)
                          : 'No Price Set'}
                      </div>

                      {/* Interactive Size Pills */}
                      <div className={styles.styleSizePills}>
                        {group.items.map(item => {
                          const isOut = item.quantity === 0;
                          const isLow = item.quantity > 0 && item.quantity <= 2;

                          return (
                            <div
                              key={item.id}
                              className={`${styles.sizePill} ${
                                isOut ? styles.sizePillOut : isLow ? styles.sizePillLow : ''
                              } ${!isOut ? styles.sizePillInteractive : ''}`}
                              onClick={() => !isOut && addToCart(item)}
                              title={
                                isOut
                                  ? `Size ${item.size} is out of stock`
                                  : `Tap to sell Size ${item.size}`
                              }
                            >
                              <span className={styles.sizePillName}>{item.size}:</span>
                              <strong className={styles.sizePillQty}>
                                {isOut ? '0' : item.quantity}
                              </strong>
                              <button
                                type="button"
                                className={styles.sizePillRestockBtn}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleQuickRestock(item, 1);
                                }}
                                title={`Add 1 to Size ${item.size}`}
                                aria-label={`Restock Size ${item.size}`}
                              >
                                <Symbol name="add" size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat Individual Size Units View */
            <div className={styles.grid}>
              {filteredFlatStock.map(item => {
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
                          ? formatCurrency(item.price, currency)
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
                      {formatCurrency(item.priceAtSale, currentShop?.currency || 'NGN')} each
                    </span>
                  </div>
                  <div className={styles.cartItemControls}>
                    <div className={styles.cartStepper}>
                      <button
                        type="button"
                        className={styles.cartStepperBtn}
                        onClick={() => updateCartQuantity(item.goodId, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Symbol name="remove" size={14} />
                      </button>
                      <span className={styles.cartQtyText}>{item.quantity}</span>
                      <button
                        type="button"
                        className={styles.cartStepperBtn}
                        onClick={() => updateCartQuantity(item.goodId, 1)}
                        aria-label="Increase quantity"
                      >
                        <Symbol name="add" size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.cartRemoveBtn}
                      onClick={() => setCart(prev => prev.filter(p => p.goodId !== item.goodId))}
                      aria-label="Remove item"
                    >
                      <Symbol name="close" size={14} />
                    </button>
                  </div>
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
      <BottomSheet
        isOpen={checkoutOpen}
        onClose={() => {
          if (completedSale) {
            handleNewSale();
          } else {
            setCheckoutOpen(false);
          }
        }}
      >
        <div className={styles.sheetContent}>
          {completedSale ? (
            /* Sale Success Screen */
            <div className={styles.saleSuccessWrapper}>
              <div className={styles.saleSuccessIcon}>
                <Symbol name="check_circle" size={44} />
              </div>
              <h2 className={styles.saleSuccessTitle}>Sale Completed</h2>
              <div className={styles.saleSuccessAmount}>
                {formatCurrency(completedSale.totalAmount, currency)}
              </div>
              <p className={styles.saleSuccessSub}>
                Payment recorded via{' '}
                {completedSale.paymentMethod === 'pos' || completedSale.paymentMethod === 'card'
                  ? 'Card / POS'
                  : completedSale.paymentMethod === 'cash'
                  ? 'Cash'
                  : completedSale.paymentMethod === 'transfer'
                  ? 'Bank Transfer'
                  : 'Split Payment'}
              </p>

              <div className={styles.saleReceiptMeta}>
                <div className={styles.saleMetaRow}>
                  <span>Customer</span>
                  <strong>{completedSale.customerName}</strong>
                </div>
                {completedSale.customerPhone && (
                  <div className={styles.saleMetaRow}>
                    <span>Phone</span>
                    <strong>{completedSale.customerPhone}</strong>
                  </div>
                )}
                <div className={styles.saleMetaRow}>
                  <span>Units Sold</span>
                  <strong>{completedSale.itemCount} pcs</strong>
                </div>
                <div className={styles.saleMetaRow}>
                  <span>Receipt ID</span>
                  <code>#{completedSale.orderId.slice(0, 8)}</code>
                </div>
              </div>

              <div className={styles.saleSuccessActions}>
                <Button
                  variant="primary"
                  onClick={handleShareReceiptWhatsApp}
                  icon={<Symbol name="chat" size={18} />}
                  style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                >
                  Share WhatsApp Receipt
                </Button>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <Button
                    variant="secondary"
                    onClick={handleViewReceipt}
                    icon={<Symbol name="receipt_long" size={16} />}
                    style={{ flex: 1 }}
                  >
                    View Receipt
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleNewSale}
                    icon={<Symbol name="add" size={16} />}
                    style={{ flex: 1 }}
                  >
                    New Sale
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <>
              <h2>Complete Showroom Sale</h2>

              {/* Compact Cart Summary */}
              <div className={styles.checkoutItemsList}>
                {cart.map(item => (
                  <div key={item.goodId} className={styles.checkoutItemRow}>
                    <div className={styles.checkoutItemName}>
                      <span>{item.quantity}x {item.name}</span>
                      <small>Size {item.size}</small>
                    </div>
                    <span className={styles.checkoutItemAmount}>
                      {formatCurrency(item.quantity * item.priceAtSale, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Discount Section */}
              <div className={styles.discountSection}>
                <div className={styles.discountHeader}>
                  <label>Apply Discount (Optional)</label>
                  <div className={styles.quickDiscountChips}>
                    <button
                      type="button"
                      className={styles.quickDiscountChip}
                      onClick={() => setDiscountInput(String(Math.round(cartSubtotal * 0.05)))}
                    >
                      5%
                    </button>
                    <button
                      type="button"
                      className={styles.quickDiscountChip}
                      onClick={() => setDiscountInput(String(Math.round(cartSubtotal * 0.10)))}
                    >
                      10%
                    </button>
                    {discountInput && (
                      <button
                        type="button"
                        className={styles.quickDiscountChip}
                        onClick={() => setDiscountInput('')}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  prefix={currency}
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                />
              </div>

              {/* Financial Breakdown */}
              <div className={styles.breakdownBox}>
                <div className={styles.breakdownRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartSubtotal, currency)}</span>
                </div>
                {cappedDiscount > 0 && (
                  <div className={`${styles.breakdownRow} ${styles.discountText}`}>
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(cappedDiscount, currency)}</span>
                  </div>
                )}
                <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                  <span>Amount Due</span>
                  <span>{formatCurrency(cartTotal, currency)}</span>
                </div>
                {isBelowCost && (
                  <div className={styles.marginWarning}>
                    <Symbol name="warning" size={14} />
                    <span>Price is below atelier production cost ({formatCurrency(cartCostTotal, currency)})</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'pos', label: 'Card / POS' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'transfer', label: 'Bank Transfer' },
                  { value: 'split', label: 'Split Payment' }
                ]}
              />

              {/* Customer Attribution Toggle */}
              <div className={styles.customerToggleSection}>
                <label className={styles.sectionLabel}>Customer Attribution</label>
                <div className={styles.customerModeButtons}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${customerMode === 'walkin' ? styles.modeBtnActive : ''}`}
                    onClick={() => setCustomerMode('walkin')}
                  >
                    <Symbol name="person" size={16} />
                    Walk-in Guest
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${customerMode === 'attach' ? styles.modeBtnActive : ''}`}
                    onClick={() => setCustomerMode('attach')}
                  >
                    <Symbol name="person_add" size={16} />
                    VIP / Client
                  </button>
                </div>

                {customerMode === 'attach' && (
                  <div className={styles.attachCustomerFields}>
                    <Input
                      label="Customer Name"
                      placeholder="e.g. Alhaji Babangida"
                      value={customerNameInput}
                      onChange={e => setCustomerNameInput(e.target.value)}
                    />
                    <Input
                      label="Phone / WhatsApp"
                      placeholder="e.g. 08012345678"
                      value={customerPhoneInput}
                      onChange={e => setCustomerPhoneInput(e.target.value)}
                    />
                    <Input
                      label="Sale Memo / Note (Optional)"
                      placeholder="e.g. In-store fitting approved"
                      value={notesInput}
                      onChange={e => setNotesInput(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                loading={processing}
                onClick={handleCheckout}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Confirm Payment • {formatCurrency(cartTotal, currency)}
              </Button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Edit Style Group BottomSheet */}
      <BottomSheet isOpen={!!editingGroup} onClose={() => setEditingGroup(null)}>
        <div className={styles.sheetContent}>
          <h2>Edit Showroom Style</h2>
          {editingGroup && (
            <p style={{ margin: '0 0 12px 0', color: 'var(--sf-text-secondary)', fontSize: '14px' }}>
              {editingGroup.name} {editingGroup.category ? `• ${editingGroup.category}` : ''} ({editingGroup.totalQuantity} total pcs)
            </p>
          )}

          <Input
            type="number"
            label="Retail Price (Applies to all sizes)"
            prefix={currency}
            value={editGroupPrice}
            onChange={e => setEditGroupPrice(e.target.value)}
          />

          {editingGroup && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Stock by Size on Rack
              </label>
              <div className={styles.styleEditSizesList}>
                {editingGroup.items.map(item => (
                  <div key={item.id} className={styles.styleEditSizeRow}>
                    <div className={styles.styleEditSizeInfo}>
                      <span>Size {item.size}</span>
                    </div>
                    <div className={styles.styleEditSizeControls}>
                      <div className={styles.cartStepper}>
                        <button
                          type="button"
                          className={styles.cartStepperBtn}
                          onClick={() => handleQuickRestock(item, -1)}
                          disabled={item.quantity <= 0}
                          aria-label={`Decrease Size ${item.size}`}
                        >
                          <Symbol name="remove" size={14} />
                        </button>
                        <span className={styles.cartQtyText}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.cartStepperBtn}
                          onClick={() => handleQuickRestock(item, 1)}
                          aria-label={`Increase Size ${item.size}`}
                        >
                          <Symbol name="add" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.editActions}>
            <Button
              variant="secondary"
              onClick={() => setEditingGroup(null)}
              style={{ flex: 1 }}
            >
              Done
            </Button>
            <Button
              variant="primary"
              loading={savingGroup}
              onClick={handleSaveStyleEdit}
              style={{ flex: 1 }}
            >
              Save Price
            </Button>
          </div>
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
