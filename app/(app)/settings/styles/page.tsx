'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import CustomStyleFieldBuilder from '@/components/orders/CustomStyleFieldBuilder/CustomStyleFieldBuilder';
import styles from './page.module.css';

interface CustomStyle {
  name: string;
  photoUrl?: string;
  measurementFields?: { id: string; label: string }[];
}

export default function CustomStylesSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop, renameCustomStyle, upsertCustomStyle } = useData();
  const { showToast } = useToast();

  const customStyles = currentShop?.customStyles || [];
  const [activeStyle, setActiveStyle] = useState<CustomStyle | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingFields, setEditingFields] = useState(false);

  const openStyleSheet = (style: CustomStyle) => {
    setActiveStyle(style);
    setEditName(style.name);
  };

  const handleSaveRename = async () => {
    if (!activeStyle || !editName.trim() || editName.trim() === activeStyle.name) return;
    setSaving(true);
    try {
      await renameCustomStyle(activeStyle.name, editName.trim());
      showToast('Style renamed — updated on any customers who had it as a preference', 'success');
      setActiveStyle(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not rename style', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeStyle) return;
    setConfirmDelete(false);
    const next = customStyles.filter((s) => s.name !== activeStyle.name);
    await updateShop({ customStyles: next });
    showToast('Style deleted', 'success');
    setActiveStyle(null);
  };

  const handleSaveFields = async (fields: { id: string; label: string }[]) => {
    if (!activeStyle) return;
    try {
      await upsertCustomStyle(activeStyle.name, activeStyle.photoUrl, fields);
      showToast('Measurement fields saved', 'success');
      setEditingFields(false);
      setActiveStyle(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save fields', 'error');
    }
  };

  return (
    <PageLayout width="narrow" header={<TopBar title="Custom Styles" showBack onBack={() => router.push('/settings')} />}>
      {customStyles.length === 0 ? (
        <EmptyState
          icon={<Symbol name="checkroom" size={40} />}
          title="No custom styles yet"
          description="They'll appear here as your team adds them while creating new orders."
        />
      ) : (
        <div className={styles.grid}>
          {customStyles.map((s) => (
            <button key={s.name} type="button" className={styles.card} onClick={() => openStyleSheet(s)}>
              <div className={styles.photo}>
                {s.photoUrl ? <img src={s.photoUrl} alt="" /> : <Symbol name="checkroom" size={32} />}
              </div>
              <div className={styles.label}>
                <h3>{s.name}</h3>
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!activeStyle} onClose={() => setActiveStyle(null)} title={activeStyle?.name}>
        <div className={styles.sheetBody}>
          {activeStyle?.photoUrl && (
            <div className={styles.sheetPhoto}>
              <img src={activeStyle.photoUrl} alt="" />
            </div>
          )}
          <Input label="Style Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <p className={styles.hintText}>
            Renaming updates every customer who already has this as a preferred style.
          </p>
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setActiveStyle(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSaveRename}>Save</Button>
          </div>
          <Button variant="secondary" onClick={() => setEditingFields(true)}>
            {activeStyle?.measurementFields?.length ? 'Edit Measurement Fields' : 'Set Up Measurement Fields'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete Style</Button>
        </div>
      </BottomSheet>

      {activeStyle && (
        <CustomStyleFieldBuilder
          isOpen={editingFields}
          styleName={activeStyle.name}
          initialFields={activeStyle.measurementFields || []}
          onClose={() => setEditingFields(false)}
          onSave={handleSaveFields}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={`Delete ${activeStyle?.name}?`}
        description="This won't affect existing orders that already use this style — only removes it from the picker for new orders."
        confirmLabel="Delete"
      />
    </PageLayout>
  );
}
