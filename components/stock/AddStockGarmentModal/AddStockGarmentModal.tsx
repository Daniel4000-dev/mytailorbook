'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/formatters';
import { addStockGarmentsAction } from '@/app/actions/stock';
import styles from './AddStockGarmentModal.module.css';

interface AddStockGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  currency?: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Senator',
  'Boubou',
  'Agbada',
  'Kaftan',
  'Suit',
  'Two-Piece',
  'Dress',
  'Shirt',
  'Traditional',
  'Casual'
];

const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];
const NUMERIC_SIZES = ['36', '38', '40', '42', '44', '46', '48', '50'];

export default function AddStockGarmentModal({
  isOpen,
  onClose,
  shopId,
  currency = 'NGN',
  onSuccess
}: AddStockGarmentModalProps) {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Senator');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [rackLocation, setRackLocation] = useState('');
  const [sizeMode, setSizeMode] = useState<'letter' | 'numeric' | 'free'>('letter');

  // Map of size string -> quantity
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    M: 1,
    L: 1
  });

  const [submitting, setSubmitting] = useState(false);

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(costPrice) || 0;

  const currentSizeList =
    sizeMode === 'letter'
      ? LETTER_SIZES
      : sizeMode === 'numeric'
      ? NUMERIC_SIZES
      : ['Free Size'];

  const totalQuantity = Object.values(sizeQuantities).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
  const activeSizesCount = Object.values(sizeQuantities).filter(q => q > 0).length;

  const handleSizeClick = (size: string) => {
    setSizeQuantities(prev => {
      const current = prev[size] || 0;
      if (current === 0) {
        return { ...prev, [size]: 1 };
      }
      return prev;
    });
  };

  const handleIncrement = (size: string) => {
    setSizeQuantities(prev => ({
      ...prev,
      [size]: (prev[size] || 0) + 1
    }));
  };

  const handleDecrement = (size: string) => {
    setSizeQuantities(prev => {
      const current = prev[size] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[size];
        return next;
      }
      return { ...prev, [size]: current - 1 };
    });
  };

  const handleResetForm = () => {
    setName('');
    setCategory('Senator');
    setPrice('');
    setCostPrice('');
    setColor('');
    setFabric('');
    setRackLocation('');
    setSizeMode('letter');
    setSizeQuantities({ M: 1, L: 1 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please enter a garment style name', 'error');
      return;
    }

    if (parsedPrice <= 0) {
      showToast('Please enter a valid retail selling price', 'error');
      return;
    }

    const sizesToSubmit = Object.entries(sizeQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([size, quantity]) => ({ size, quantity }));

    if (sizesToSubmit.length === 0) {
      showToast('Please allocate at least one piece to a size', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addStockGarmentsAction(shopId, {
        name: name.trim(),
        category,
        price: parsedPrice,
        costPrice: parsedCost > 0 ? parsedCost : undefined,
        color: color.trim() || undefined,
        fabric: fabric.trim() || undefined,
        rackLocation: rackLocation.trim() || undefined,
        sizes: sizesToSubmit
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(
          `Successfully added ${totalQuantity} garment${totalQuantity > 1 ? 's' : ''} to showroom rack`,
          'success'
        );
        handleResetForm();
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add garment to rack', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const margin =
    parsedPrice > 0 && parsedCost > 0 && parsedPrice >= parsedCost
      ? {
          amount: parsedPrice - parsedCost,
          percentage: Math.round(((parsedPrice - parsedCost) / parsedPrice) * 100)
        }
      : null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add Garment to Showroom Rack"
      variant="panel"
    >
      <form onSubmit={handleSubmit} className={styles.container}>
        {/* Category quick chips */}
        <div className={styles.section}>
          <label className={styles.label}>Style Category</label>
          <div className={styles.categoryList}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`${styles.categoryChip} ${
                  category === cat ? styles.categoryChipActive : ''
                }`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Style Name */}
        <div className={styles.section}>
          <Input
            label="Garment Style Name"
            placeholder={`e.g. Royal Blue ${category}`}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Pricing */}
        <div className={styles.twoCol}>
          <Input
            type="number"
            label="Selling Price (Retail)"
            placeholder="0.00"
            prefix={currency}
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
          />
          <Input
            type="number"
            label="Cost Price (Optional)"
            placeholder="0.00"
            prefix={currency}
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
          />
        </div>

        {margin && (
          <div className={styles.marginPreview}>
            <span className={styles.marginLabel}>Estimated Gross Margin</span>
            <span className={styles.marginValue}>
              {formatCurrency(margin.amount, currency)} ({margin.percentage}%)
            </span>
          </div>
        )}

        {/* Color and Fabric */}
        <div className={styles.twoCol}>
          <Input
            label="Color"
            placeholder="e.g. Navy Blue"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
          <Input
            label="Fabric / Material"
            placeholder="e.g. Cashmere Wool"
            value={fabric}
            onChange={e => setFabric(e.target.value)}
          />
        </div>

        {/* Rack Location */}
        <div className={styles.section}>
          <Input
            label="Rack Location / Section (Optional)"
            placeholder="e.g. Showroom Rail 1, Window Display"
            value={rackLocation}
            onChange={e => setRackLocation(e.target.value)}
          />
        </div>

        {/* Showroom Sizing Matrix */}
        <div className={styles.section}>
          <div className={styles.sizingHeader}>
            <label className={styles.label}>Showroom Sizing Matrix</label>
            <div className={styles.sizeModeToggle}>
              <button
                type="button"
                className={`${styles.sizeModeBtn} ${
                  sizeMode === 'letter' ? styles.sizeModeBtnActive : ''
                }`}
                onClick={() => setSizeMode('letter')}
              >
                Letter
              </button>
              <button
                type="button"
                className={`${styles.sizeModeBtn} ${
                  sizeMode === 'numeric' ? styles.sizeModeBtnActive : ''
                }`}
                onClick={() => setSizeMode('numeric')}
              >
                Numeric
              </button>
              <button
                type="button"
                className={`${styles.sizeModeBtn} ${
                  sizeMode === 'free' ? styles.sizeModeBtnActive : ''
                }`}
                onClick={() => {
                  setSizeMode('free');
                  setSizeQuantities({ 'Free Size': 1 });
                }}
              >
                Free Size
              </button>
            </div>
          </div>

          <div className={styles.matrixGrid}>
            {currentSizeList.map(sz => {
              const qty = sizeQuantities[sz] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={sz}
                  className={`${styles.sizeCard} ${
                    isSelected ? styles.sizeCardActive : ''
                  }`}
                  onClick={() => !isSelected && handleSizeClick(sz)}
                >
                  <span className={styles.sizeName}>{sz}</span>
                  {isSelected ? (
                    <div className={styles.counter} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => handleDecrement(sz)}
                        aria-label={`Decrease ${sz}`}
                      >
                        -
                      </button>
                      <span className={styles.counterQty}>{qty}</span>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => handleIncrement(sz)}
                        aria-label={`Increase ${sz}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className={styles.sizeAction}>+ Tap to add</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.summaryBadge}>
            <span>Ready for Showroom Floor:</span>
            <span>
              {totalQuantity} piece{totalQuantity !== 1 ? 's' : ''} across {activeSizesCount} size
              {activeSizesCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footerActions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!name.trim() || parsedPrice <= 0 || totalQuantity <= 0}
            icon={<Symbol name="add" size={18} />}
          >
            Add to Showroom Rack
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
