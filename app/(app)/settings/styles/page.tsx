'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import CustomStyleFieldBuilder from '@/components/orders/CustomStyleFieldBuilder/CustomStyleFieldBuilder';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

interface CustomStyle {
  name: string;
  photoUrl?: string;
  gender?: 'male' | 'female';
  measurementFields?: { id: string; label: string }[];
}

export default function CustomStylesSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop, renameCustomStyle, upsertCustomStyle, isLoaded } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const customStyles = currentShop?.customStyles || [];
  const [activeStyle, setActiveStyle] = useState<CustomStyle | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingFields, setEditingFields] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !activeStyle || !currentShop?.id) return;
    setUploadingPhoto(true);
    try {
      const file = await compressImage(rawFile);
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/custom-styles/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const photoUrl = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;

      await upsertCustomStyle(activeStyle.name, photoUrl, activeStyle.measurementFields);
      setActiveStyle((prev) => (prev ? { ...prev, photoUrl } : prev));
      showToast('Style photo saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSetGender = async (gender: 'male' | 'female') => {
    if (!activeStyle) return;
    const next = gender === activeStyle.gender ? undefined : gender;
    setSaving(true);
    try {
      await upsertCustomStyle(activeStyle.name, activeStyle.photoUrl, activeStyle.measurementFields, next);
      setActiveStyle((prev) => (prev ? { ...prev, gender: next } : prev));
      showToast('Style updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update style', 'error');
    } finally {
      setSaving(false);
    }
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
    <PageLayout width="narrow" header={<TopBar title="Custom Styles" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
      {!isLoaded ? (
        <div className={styles.grid}>
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      ) : customStyles.length === 0 ? (
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
                {s.photoUrl ? <Image src={s.photoUrl} alt="" width={400} height={400} /> : <Symbol name="checkroom" size={32} />}
              </div>
              <div className={styles.label}>
                <h3>{s.name}</h3>
                <p>{s.gender === 'male' ? 'Male' : s.gender === 'female' ? 'Female' : 'Unassigned — shows for both'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!activeStyle} onClose={() => setActiveStyle(null)} title={activeStyle?.name}>
        <div className={styles.sheetBody}>
          {activeStyle?.photoUrl && (
            <div className={styles.sheetPhoto}>
              <Image src={activeStyle.photoUrl} alt="" width={800} height={600} />
            </div>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handleUploadPhoto} />
          <Button
            variant="secondary"
            loading={uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            {activeStyle?.photoUrl ? 'Change Photo' : 'Add Photo'}
          </Button>
          <Input label="Style Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <p className={styles.hintText}>
            Renaming updates every customer who already has this as a preferred style.
          </p>
          <div className={styles.genderRow} role="radiogroup" aria-label="Gender">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={activeStyle?.gender === g}
                className={activeStyle?.gender === g ? styles.genderRowActive : ''}
                onClick={() => handleSetGender(g)}
              >
                {g === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
          <p className={styles.hintText}>
            Only shows up when creating an order for that gender. Tap again to unset and show it for both.
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
