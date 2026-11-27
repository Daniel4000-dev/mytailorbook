'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import {
  createOutfitAction,
  updateOutfitAction,
  addManualPortfolioPhotoAction,
  getPortfolioPoolAction,
  type PortfolioPoolPhoto,
  type PortfolioOutfit,
  type PhotoAngle,
  type OutfitPhotoInput,
} from '../actions';
import styles from './OutfitBuilder.module.css';

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'detail', label: 'Detail' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  pool: PortfolioPoolPhoto[];
  editingOutfit?: PortfolioOutfit;
  onSaved: () => void;
}

export default function OutfitBuilder({ isOpen, onClose, shopId, pool, editingOutfit, onSaved }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPool, setCurrentPool] = useState<PortfolioPoolPhoto[]>(pool);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [displayAngles, setDisplayAngles] = useState<Map<string, PhotoAngle | null>>(new Map());
  const [storyModeEnabled, setStoryModeEnabled] = useState(false);
  const [storyPhotoIds, setStoryPhotoIds] = useState<Set<string>>(new Set());
  const [storyCaption, setStoryCaption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentPool(pool);
  }, [pool]);

  // Re-seed every time a different outfit is opened for editing (or the
  // sheet opens fresh for a new one) — same derive-on-prop-change pattern
  // used elsewhere in this app rather than an effect with a dependency
  // array that's easy to get subtly wrong.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = isOpen ? editingOutfit?.id ?? 'new' : null;
  if (isOpen && seedKey !== seededFor) {
    setSeededFor(seedKey);
    setTitle(editingOutfit?.title ?? '');
    setStoryModeEnabled(editingOutfit?.storyModeEnabled ?? false);
    setStoryCaption(editingOutfit?.storyCaption ?? '');
    const angles = new Map<string, PhotoAngle | null>();
    const storyIds = new Set<string>();
    for (const p of editingOutfit?.photos ?? []) {
      if (p.kind === 'display') angles.set(p.photoId, p.angle);
      else storyIds.add(p.photoId);
    }
    setDisplayAngles(angles);
    setStoryPhotoIds(storyIds);
  }

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !shopId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${shopId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        const imageUrl = supabase.storage.from('portfolio-photos').getPublicUrl(path).data.publicUrl;
        await addManualPortfolioPhotoAction(shopId, imageUrl);
      }
      const refreshedPool = await getPortfolioPoolAction(shopId);
      setCurrentPool(refreshedPool || []);
      if (refreshedPool && refreshedPool.length > 0 && displayAngles.size === 0) {
        setDisplayAngles(new Map([[refreshedPool[0].id, 'front']]));
      }
      showToast('Photos uploaded to look', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleDisplay = (photoId: string) => {
    setDisplayAngles((prev) => {
      const next = new Map(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.set(photoId, null);
      return next;
    });
    setStoryPhotoIds((prev) => {
      if (!prev.has(photoId)) return prev;
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  };

  const toggleStory = (photoId: string) => {
    setStoryPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
    setDisplayAngles((prev) => {
      if (!prev.has(photoId)) return prev;
      const next = new Map(prev);
      next.delete(photoId);
      return next;
    });
  };

  const handleSave = async () => {
    if (displayAngles.size === 0) {
      showToast('Add at least one display photo', 'error');
      return;
    }
    setSaving(true);
    const photos: OutfitPhotoInput[] = [
      ...Array.from(displayAngles.entries()).map(([photoId, angle], i) => ({
        photoId,
        kind: 'display' as const,
        angle,
        sortOrder: i,
      })),
      ...Array.from(storyPhotoIds).map((photoId, i) => ({
        photoId,
        kind: 'story' as const,
        angle: null,
        sortOrder: i,
      })),
    ];

    const result = editingOutfit
      ? await updateOutfitAction(editingOutfit.id, { title, storyModeEnabled, storyCaption, photos })
      : await createOutfitAction({ shopId, title, storyModeEnabled, storyCaption, photos });

    setSaving(false);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(editingOutfit ? 'Outfit updated' : 'Outfit published to your portfolio', 'success');
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingOutfit ? 'Edit Outfit' : 'New Outfit'}
      variant="panel"
      footer={
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editingOutfit ? 'Save Changes' : 'Publish Outfit'}
        </button>
      }
    >
      <div className={styles.body}>
        <Input label="Title (optional)" placeholder="e.g. Emerald Agbada" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />

        <div>
          <div className={styles.uploadActionRow}>
            <div>
              <h4 className={styles.sectionLabel}>Display Photos</h4>
              <p className={styles.sectionHint}>Tap a photo to add it, then tag its angle. These are what visitors see first.</p>
            </div>
            <label className={styles.uploadBtn} title="Upload new photos directly">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleDirectUpload}
                disabled={uploading}
              />
              <Symbol name={uploading ? 'sync' : 'add_a_photo'} size={14} />
              <span>{uploading ? 'Uploading…' : '+ Upload'}</span>
            </label>
          </div>

          {currentPool.length === 0 ? (
            <div className={styles.emptyPoolBox}>
              <Symbol name="photo_library" size={28} />
              <p>No photos in your workshop pool yet.</p>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Symbol name="add_a_photo" size={14} />
                <span>Upload Garment Photos</span>
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {currentPool.map((p) => {
                const selected = displayAngles.has(p.id);
                return (
                  <div key={p.id} className={styles.photoTile}>
                    <button
                      type="button"
                      className={`${styles.photoBtn} ${selected ? styles.photoBtnSelected : ''}`}
                      onClick={() => toggleDisplay(p.id)}
                    >
                      <Image src={p.imageUrl} alt="" fill sizes="120px" />
                      {selected && (
                        <span className={styles.checkBadge}>
                          <Symbol name="check" size={12} />
                        </span>
                      )}
                    </button>
                    {selected && (
                      <select
                        className={styles.angleSelect}
                        value={displayAngles.get(p.id) ?? ''}
                        onChange={(e) => setDisplayAngles((prev) => new Map(prev).set(p.id, (e.target.value || null) as PhotoAngle | null))}
                      >
                        <option value="">No angle</option>
                        {ANGLES.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label className={styles.toggleRow}>
          <span>
            <span className={styles.toggleLabel}>Include the creation story</span>
            <span className={styles.toggleHint}>Cutting, sewing, fitting shots — visitors choose to view it, it&apos;s not shown by default</span>
          </span>
          <input type="checkbox" checked={storyModeEnabled} onChange={(e) => setStoryModeEnabled(e.target.checked)} />
        </label>

        {storyModeEnabled && (
          <div>
            <h4 className={styles.sectionLabel}>Story Photos</h4>
            <p className={styles.sectionHint}>The making-of sequence, in order — no angle tagging needed here.</p>
            {currentPool.length === 0 ? (
              <div className={styles.emptyPoolBox}>
                <Symbol name="photo_library" size={24} />
                <p>Upload photos above first to select for your creation story.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {currentPool.map((p) => {
                  const selected = storyPhotoIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.photoBtn} ${selected ? styles.photoBtnSelected : ''}`}
                      onClick={() => toggleStory(p.id)}
                    >
                      <Image src={p.imageUrl} alt="" fill sizes="120px" />
                      {selected && (
                        <span className={styles.checkBadge}>
                          <Symbol name="check" size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <TextArea
              label="Story caption (optional)"
              placeholder="e.g. Hand-beaded over three days, fitted in two sessions."
              value={storyCaption}
              maxLength={300}
              rows={3}
              onChange={(e) => setStoryCaption(e.target.value)}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
