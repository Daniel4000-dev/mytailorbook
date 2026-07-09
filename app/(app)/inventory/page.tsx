'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { FaBars, FaPlus, FaPen, FaTrash, FaTriangleExclamation } from 'react-icons/fa6';
import { useSidebar } from '@/contexts/SidebarContext';
import { formatCurrency } from '@/lib/formatters';
import { getFabricItemsAction, addFabricItemAction, updateFabricItemAction, deleteFabricItemAction } from '@/app/actions';
import type { FabricItem } from '@/lib/types';
import styles from './page.module.css';

export default function InventoryPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { currentShop, isLoaded } = useData();
  const { toggleMenu } = useSidebar();
  const { showToast } = useToast();

  const [items, setItems] = useState<FabricItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costPerYard, setCostPerYard] = useState('');
  const [yardsInStock, setYardsInStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentShop) {
      getFabricItemsAction(currentShop.id)
        .then(setItems)
        .finally(() => setItemsLoaded(true));
    }
  }, [currentShop]);

  if (authLoading || !isLoaded) {
    return (
      <PageLayout
        className={styles.pageGrid}
        header={
          <TopBar
            profileMode={{ greeting: 'Fabric Inventory', name: user?.name || 'Owner', avatarInitials: user?.name ? user.name[0] : 'O' }}
            leftAction={
              <div className={styles.mobileOnly}>
                <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
              </div>
            }
          />
        }
      >
        <div className={styles.pageGrid} />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sf-text-secondary)' }}>
          <h2>Access Denied</h2>
          <p>Only the studio owner can manage fabric inventory.</p>
        </div>
      </PageLayout>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCostPerYard('');
    setYardsInStock('');
    setLowStockThreshold('5');
    setShowForm(false);
  };

  const startEdit = (item: FabricItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCostPerYard(String(item.costPerYard));
    setYardsInStock(String(item.yardsInStock));
    setLowStockThreshold(String(item.lowStockThreshold));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!currentShop || !name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        costPerYard: parseInt(costPerYard.replace(/,/g, '')) || 0,
        yardsInStock: parseFloat(yardsInStock) || 0,
        lowStockThreshold: parseFloat(lowStockThreshold) || 0,
      };
      if (editingId) {
        const updated = await updateFabricItemAction(editingId, payload, currentShop.id);
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        showToast('Fabric updated', 'success');
      } else {
        const created = await addFabricItemAction(currentShop.id, payload);
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Fabric added', 'success');
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: FabricItem) => {
    if (!currentShop) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteFabricItemAction(item.id, currentShop.id);
    showToast('Fabric removed', 'success');
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={
        <TopBar
          profileMode={{ greeting: 'Fabric Inventory', name: user?.name || 'Owner', avatarInitials: user?.name ? user.name[0] : 'O' }}
          leftAction={
            <div className={styles.mobileOnly}>
              <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
            </div>
          }
        />
      }
    >
      <div className={styles.container}>
        <p className={styles.introText}>
          Track fabric stock and cost per yard — check before quoting a job, and adjust manually as fabric gets used.
        </p>

        <div className={styles.card}>
          {itemsLoaded && items.length === 0 && !showForm && (
            <p className={styles.emptyText}>No fabrics added yet.</p>
          )}

          <div className={styles.itemList}>
            {items.map((item) => {
              const isLow = item.yardsInStock <= item.lowStockThreshold;
              return (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {item.name}
                      {isLow && (
                        <span className={styles.lowStockBadge}>
                          <FaTriangleExclamation /> Low Stock
                        </span>
                      )}
                    </span>
                    <span className={styles.itemMeta}>
                      {item.yardsInStock} yards · {formatCurrency(item.costPerYard)}/yard
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button type="button" className={styles.itemActionBtn} onClick={() => startEdit(item)} aria-label="Edit fabric">
                      <FaPen />
                    </button>
                    <button type="button" className={styles.itemActionBtn} onClick={() => handleDelete(item)} aria-label="Remove fabric">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {showForm ? (
            <div className={styles.form}>
              <Input label="Fabric Name" placeholder="e.g. Ankara Print" value={name} onChange={(e) => setName(e.target.value)} />
              <div className={styles.formRow}>
                <Input label="Cost / Yard (₦)" placeholder="0" value={costPerYard} onChange={(e) => setCostPerYard(e.target.value.replace(/[^0-9,]/g, ''))} inputMode="numeric" />
                <Input label="Yards in Stock" placeholder="0" value={yardsInStock} onChange={(e) => setYardsInStock(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" />
              </div>
              <Input label="Low Stock Alert Below" placeholder="5" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" />
              <div className={styles.formActions}>
                <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Save</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)} className={styles.addBtn}>
              <FaPlus /> Add Fabric
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
