'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { getPortfolioCurationPhotosAction, setPortfolioPhotoOverrideAction, type PortfolioCurationPhoto } from '@/app/actions';
import styles from './page.module.css';

export default function PortfolioCurationSettingsPage() {
  const router = useRouter();
  const { currentShop } = useData();
  const { showToast } = useToast();

  const [photos, setPhotos] = useState<PortfolioCurationPhoto[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PortfolioCurationPhoto | null>(null);

  const load = useCallback(() => {
    if (!currentShop?.id) return;
    getPortfolioCurationPhotosAction(currentShop.id)
      .then((p) => {
        setPhotos(p);
        setIsLoaded(true);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Could not load portfolio photos', 'error');
        setIsLoaded(true);
      });
  }, [currentShop, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (updates: { hidden?: boolean; featured?: boolean }) => {
    if (!activePhoto || !currentShop?.id) return;
    const reverted = activePhoto;
    const next = { ...activePhoto, ...updates };
    setActivePhoto(next);
    setPhotos((prev) => prev.map((p) => (p.url === activePhoto.url ? next : p)));
    try {
      await setPortfolioPhotoOverrideAction(currentShop.id, activePhoto.url, updates);
    } catch {
      showToast('Could not update this photo', 'error');
      // Roll the sheet's own state back too — otherwise its checkboxes
      // keep showing the failed optimistic value until closed/reopened.
      setActivePhoto(reverted);
      setPhotos((prev) => prev.map((p) => (p.url === reverted.url ? reverted : p)));
    }
  };

  return (
    <PageLayout header={<TopBar title="Manage Portfolio" showBack onBack={() => router.push('/settings')} />}>
      <p className={styles.intro}>Choose which photos customers see on your public portfolio page.</p>

      {isLoaded && photos.length === 0 ? (
        <EmptyState
          icon={<Symbol name="photo_library" size={40} />}
          title="No photos yet"
          description="Completed orders with photos will appear here automatically."
        />
      ) : (
        <div className={styles.grid}>
          {photos.map((p) => (
            <button
              key={p.url}
              type="button"
              className={styles.card}
              onClick={() => setActivePhoto(p)}
            >
              <img src={p.url} alt="" className={p.hidden ? styles.hiddenPhoto : ''} />
              {p.featured && <span className={styles.badge}>Featured</span>}
              {p.hidden && <span className={styles.hiddenOverlay}><Symbol name="visibility_off" size={20} /></span>}
            </button>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!activePhoto} onClose={() => setActivePhoto(null)} title="Photo Options">
        {activePhoto && (
          <div className={styles.sheetBody}>
            <img src={activePhoto.url} alt="" className={styles.sheetPhoto} />
            <label className={styles.toggleRow}>
              <span>
                <span className={styles.toggleLabel}>Feature this photo</span>
                <span className={styles.toggleHint}>Shows first on your public portfolio</span>
              </span>
              <input
                type="checkbox"
                checked={activePhoto.featured}
                onChange={(e) => handleToggle({ featured: e.target.checked })}
              />
            </label>
            <label className={styles.toggleRow}>
              <span>
                <span className={styles.toggleLabel}>Hide from portfolio</span>
                <span className={styles.toggleHint}>Stops showing publicly, stays in the order&apos;s history</span>
              </span>
              <input
                type="checkbox"
                checked={activePhoto.hidden}
                onChange={(e) => handleToggle({ hidden: e.target.checked })}
              />
            </label>
          </div>
        )}
      </BottomSheet>
    </PageLayout>
  );
}
