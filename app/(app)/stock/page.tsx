'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Symbol from '@/components/ui/Symbol/Symbol';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { formatCurrency } from '@/lib/formatters';
import { getStockAction, updateStockPriceAction, updateStockQuantityAction, processSaleAction } from '@/app/actions/stock';
import { FinishedGood } from '@/lib/types';
import styles from './page.module.css';

export default function StockPage() {
  const { currentShop, isLoaded: dataLoaded } = useData();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [stock, setStock] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  
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
          showToast('Not enough stock', 'error');
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
      showToast('Item updated', 'success');
      setEditingItem(null);
      loadStock();
    }
    setSavingEdit(false);
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

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0);

  if (!dataLoaded || authLoading || loading) return null;

  return (
    <PageLayout header={<TopBar title="Stock & POS" />}>
      <div className={styles.layout}>
        {/* Main Stock Grid */}
        <div className={styles.stockArea}>
          {stock.length === 0 ? (
            <EmptyState 
              icon="inventory_2"
              title="No finished goods yet"
              description="Complete a production batch in the Production board to add items here."
            />
          ) : (
            <div className={styles.grid}>
              {stock.map(item => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.name}>{item.name}</h3>
                    <Button variant="secondary" onClick={() => openEdit(item)}><Symbol name="edit" size={16} /></Button>
                  </div>
                  <div className={styles.details}>
                    <span className={styles.size}>Size: {item.size}</span>
                    <span className={styles.qty}>Stock: {item.quantity}</span>
                    <span className={styles.price}>{item.price > 0 ? formatCurrency(item.price) : 'No Price'}</span>
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => addToCart(item)}
                    disabled={item.quantity === 0}
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    {item.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POS Cart Sidebar / Bottom Bar */}
        {(cart.length > 0 || checkoutOpen) && (
          <div className={styles.cartArea}>
            <div className={styles.cartHeader}>
              <h3>Current Sale</h3>
              <span className={styles.itemCount}>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
            </div>
            
            <div className={styles.cartItems}>
              {cart.map(item => (
                <div key={item.goodId} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <span className={styles.cartItemName}>{item.name} (Size {item.size})</span>
                    <span className={styles.cartItemPrice}>{item.quantity} x {formatCurrency(item.priceAtSale)}</span>
                  </div>
                  <Button variant="secondary" onClick={() => setCart(prev => prev.filter(p => p.goodId !== item.goodId))}>
                    <Symbol name="close" size={16} />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className={styles.cartTotal}>
              <span>Total</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            
            <Button variant="primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => setCheckoutOpen(true)}>
              Checkout
            </Button>
          </div>
        )}
      </div>

      <BottomSheet isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)}>
        <div className={styles.sheetContent}>
          <h2>Complete Sale</h2>
          <div className={styles.summaryRow}>
            <span>Amount Due</span>
            <span style={{ fontSize: '24px', fontWeight: 600 }}>{formatCurrency(cartTotal)}</span>
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
          
          <Button variant="primary" loading={processing} onClick={handleCheckout} style={{ width: '100%', marginTop: '16px' }}>
            Confirm Payment
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!editingItem} onClose={() => setEditingItem(null)}>
        <div className={styles.sheetContent}>
          <h2>Edit Item</h2>
          {editingItem && (
            <p style={{ margin: '0 0 16px 0', color: 'var(--sf-text-secondary)' }}>
              {editingItem.name} (Size {editingItem.size})
            </p>
          )}
          <Input 
            type="number"
            label="Price"
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
          />
          <Input 
            type="number"
            label="Stock Quantity"
            value={editQuantity}
            onChange={e => setEditQuantity(e.target.value)}
          />
          <Button variant="primary" loading={savingEdit} onClick={handleSaveEdit} style={{ width: '100%', marginTop: '16px' }}>
            Save Changes
          </Button>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
