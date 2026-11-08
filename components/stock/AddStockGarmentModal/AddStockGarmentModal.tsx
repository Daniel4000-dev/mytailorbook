'use client';

import { useState, useEffect } from 'react';
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

const PRESET_CATEGORIES = [
  'Senator',
  'Boubou',
  'Agbada',
  'Kaftan',
  'Suit',
  'Two-Piece',
  'Dress',
  'Shirt',
  'Accessory',
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
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [rackLocation, setRackLocation] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sizeMode, setSizeMode] = useState<'letter' | 'numeric' | 'free'>('letter');
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [showAddCustomSize, setShowAddCustomSize] = useState(false);
  const [newCustomSizeInput, setNewCustomSizeInput] = useState('');

  // Map of size string -> quantity
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    M: 1,
    L: 1
  });

  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever modal opens fresh
  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategory('Senator');
      setIsCustomCategory(false);
      setCustomCategory('');
      setPrice('');
      setCostPrice('');
      setColor('');
      setFabric('');
      setRackLocation('');
      setSku('');
      setImageUrl('');
      setSizeMode('letter');
      setCustomSizes([]);
      setShowAddCustomSize(false);
      setNewCustomSizeInput('');
      setSizeQuantities({ M: 1, L: 1 });
    }
  }, [isOpen]);

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(costPrice) || 0;

  const currentSizeList = [
    ...(sizeMode === 'letter'
      ? LETTER_SIZES
      : sizeMode === 'numeric'
      ? NUMERIC_SIZES
      : ['Free Size']),
    ...customSizes
  ];

  const totalQuantity = Object.values(sizeQuantities).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
  const activeSizes = Object.entries(sizeQuantities).filter(([_, qty]) => qty > 0);
  const activeSizesCount = activeSizes.length;

  const effectiveCategory = isCustomCategory ? customCategory.trim() || 'Custom' : category;

  const handleSizeClick = (size: string) => {
    setSizeQuantities(prev => ({
      ...prev,
      [size]: (prev[size] && prev[size] > 0) ? prev[size] : 1
    }));
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

  const handleQuantityDirectInput = (size: string, val: string) => {
    if (val === '') {
      setSizeQuantities(prev => ({ ...prev, [size]: 0 }));
      return;
    }
    const parsed = parseInt(val, 10);
    setSizeQuantities(prev => {
      if (isNaN(parsed) || parsed < 0) {
        return { ...prev, [size]: 0 };
      }
      return { ...prev, [size]: Math.min(999, parsed) };
    });
  };

  const handleBlurSize = (size: string) => {
    setSizeQuantities(prev => {
      if ((prev[size] || 0) <= 0) {
        const next = { ...prev };
        delete next[size];
        return next;
      }
      return prev;
    });
  };

  const handleRemoveSizeAllocation = (size: string) => {
    setSizeQuantities(prev => {
      const next = { ...prev };
      delete next[size];
      return next;
    });
  };

  const handleQuickPreset = (qtyPerSize: number) => {
    const updated: Record<string, number> = {};
    currentSizeList.forEach(sz => {
      updated[sz] = qtyPerSize;
    });
    setSizeQuantities(updated);
  };

  const handleClearSizes = () => {
    setSizeQuantities({});
  };

  const handleAddCustomSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSize = newCustomSizeInput.trim().toUpperCase();
    if (!cleanSize) return;

    if (currentSizeList.includes(cleanSize)) {
      showToast(`Size ${cleanSize} is already in the matrix`, 'info');
      handleSizeClick(cleanSize);
    } else {
      setCustomSizes(prev => [...prev, cleanSize]);
      setSizeQuantities(prev => ({ ...prev, [cleanSize]: 1 }));
    }
    setNewCustomSizeInput('');
    setShowAddCustomSize(false);
  };

  const handleSwitchSizeMode = (newMode: 'letter' | 'numeric' | 'free') => {
    setSizeMode(newMode);
    setCustomSizes([]);
    setShowAddCustomSize(false);
    if (newMode === 'free') {
      setSizeQuantities({ 'Free Size': 1 });
    } else {
      const allowed = newMode === 'letter' ? LETTER_SIZES : NUMERIC_SIZES;
      const next: Record<string, number> = {};
      Object.entries(sizeQuantities).forEach(([k, v]) => {
        if (allowed.includes(k) && v > 0) {
          next[k] = v;
        }
      });
      if (Object.keys(next).length === 0) {
        if (newMode === 'letter') {
          next['M'] = 1;
          next['L'] = 1;
        } else {
          next['40'] = 1;
          next['42'] = 1;
        }
      }
      setSizeQuantities(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please enter a garment style name', 'error');
      return;
    }

    if (isCustomCategory && !customCategory.trim()) {
      showToast('Please enter a name for your custom category', 'error');
      return;
    }

    if (parsedPrice <= 0) {
      showToast('Please enter a valid retail selling price', 'error');
      return;
    }

    const sizesToSubmit = activeSizes.map(([size, quantity]) => ({ size, quantity }));

    if (sizesToSubmit.length === 0) {
      showToast('Please allocate at least one piece to a size', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addStockGarmentsAction(shopId, {
        name: name.trim(),
        category: effectiveCategory,
        price: parsedPrice,
        costPrice: parsedCost > 0 ? parsedCost : undefined,
        color: color.trim() || undefined,
        fabric: fabric.trim() || undefined,
        rackLocation: rackLocation.trim() || undefined,
        sku: sku.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        sizes: sizesToSubmit
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(
          `Successfully processed ${totalQuantity} garment${totalQuantity > 1 ? 's' : ''} for showroom rack`,
          'success'
        );
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
    parsedPrice > 0 && parsedCost > 0
      ? {
          amount: parsedPrice - parsedCost,
          percentage: Math.round(((parsedPrice - parsedCost) / parsedPrice) * 100),
          isNegative: parsedPrice < parsedCost
        }
      : null;

  const totalRetailValue = totalQuantity * parsedPrice;

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
            {PRESET_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`${styles.categoryChip} ${
                  !isCustomCategory && category === cat ? styles.categoryChipActive : ''
                }`}
                onClick={() => {
                  setCategory(cat);
                  setIsCustomCategory(false);
                }}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.categoryChip} ${
                isCustomCategory ? styles.categoryChipActive : ''
              }`}
              onClick={() => setIsCustomCategory(true)}
            >
              + Custom
            </button>
          </div>

          {isCustomCategory && (
            <div style={{ marginTop: '8px' }}>
              <Input
                placeholder="Enter custom category (e.g. Kimono, Cap, Wrapper)..."
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Style Name */}
        <div className={styles.section}>
          <Input
            label="Garment Style Name"
            placeholder={`e.g. Royal Blue ${effectiveCategory}`}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus={!isCustomCategory}
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
          <div
            className={`${styles.marginPreview} ${
              margin.isNegative ? styles.marginPreviewNegative : ''
            }`}
          >
            <span className={styles.marginLabel}>
              {margin.isNegative ? 'Warning: Cost Exceeds Retail Price' : 'Estimated Gross Margin'}
            </span>
            <span
              className={`${styles.marginValue} ${
                margin.isNegative ? styles.marginValueNegative : ''
              }`}
            >
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

        {/* Rack Location & SKU */}
        <div className={styles.twoCol}>
          <Input
            label="Rack Location (Optional)"
            placeholder="e.g. Rail 1, Window Display"
            value={rackLocation}
            onChange={e => setRackLocation(e.target.value)}
          />
          <Input
            label="SKU / Barcode (Optional)"
            placeholder="e.g. SEN-NAV-01"
            value={sku}
            onChange={e => setSku(e.target.value)}
          />
        </div>

        {/* Showroom Image URL */}
        <Input
          label="Showroom Photo URL (Optional)"
          placeholder="https://... photo link for online showroom rack"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />

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
                onClick={() => handleSwitchSizeMode('letter')}
              >
                Letter
              </button>
              <button
                type="button"
                className={`${styles.sizeModeBtn} ${
                  sizeMode === 'numeric' ? styles.sizeModeBtnActive : ''
                }`}
                onClick={() => handleSwitchSizeMode('numeric')}
              >
                Numeric
              </button>
              <button
                type="button"
                className={`${styles.sizeModeBtn} ${
                  sizeMode === 'free' ? styles.sizeModeBtnActive : ''
                }`}
                onClick={() => handleSwitchSizeMode('free')}
              >
                Free Size
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className={styles.quickPresetsBar}>
            {sizeMode !== 'free' && (
              <>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => handleQuickPreset(1)}
                >
                  1 of each
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => handleQuickPreset(2)}
                >
                  2 of each
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={handleClearSizes}
                >
                  Clear all
                </button>
              </>
            )}
            {!showAddCustomSize ? (
              <button
                type="button"
                className={styles.addCustomSizeToggle}
                onClick={() => setShowAddCustomSize(true)}
              >
                + Custom Size
              </button>
            ) : (
              <div className={styles.customSizeInlineBox}>
                <input
                  type="text"
                  placeholder="e.g. 4XL"
                  className={styles.customSizeInput}
                  value={newCustomSizeInput}
                  onChange={e => setNewCustomSizeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSize();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.customSizeAddBtn}
                  onClick={() => handleAddCustomSize()}
                  disabled={!newCustomSizeInput.trim()}
                >
                  Add
                </button>
                <button
                  type="button"
                  className={styles.customSizeCancelBtn}
                  onClick={() => {
                    setShowAddCustomSize(false);
                    setNewCustomSizeInput('');
                  }}
                >
                  <Symbol name="close" size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Size Cards Grid */}
          <div className={styles.matrixGrid}>
            {currentSizeList.map(sz => {
              const isSelected = sz in sizeQuantities;
              const qty = sizeQuantities[sz] ?? 0;

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
                      <input
                        type="number"
                        min="0"
                        className={styles.counterInput}
                        value={qty === 0 ? '' : qty}
                        placeholder="0"
                        onChange={e => handleQuantityDirectInput(sz, e.target.value)}
                        onBlur={() => handleBlurSize(sz)}
                        aria-label={`Quantity for ${sz}`}
                      />
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

          {/* Active Allocations Pills */}
          {activeSizes.length > 0 && (
            <div className={styles.activeAllocations}>
              {activeSizes.map(([sz, qty]) => (
                <span key={sz} className={styles.allocationChip}>
                  <span>Size {sz}: <strong>{qty}</strong></span>
                  <button
                    type="button"
                    className={styles.allocationChipRemove}
                    onClick={() => handleRemoveSizeAllocation(sz)}
                    aria-label={`Remove size ${sz}`}
                  >
                    <Symbol name="close" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Real-time Summary Badge */}
          <div className={styles.summaryBadge}>
            <div className={styles.summaryRow}>
              <span>Ready for Showroom Rack:</span>
              <span>
                {totalQuantity} piece{totalQuantity !== 1 ? 's' : ''} across {activeSizesCount} size
                {activeSizesCount !== 1 ? 's' : ''}
              </span>
            </div>
            {parsedPrice > 0 && totalQuantity > 0 && (
              <div className={styles.totalValueText}>
                Estimated Retail Inventory Value: {formatCurrency(totalRetailValue, currency)}
              </div>
            )}
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
