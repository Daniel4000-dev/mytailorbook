'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { StyleCatalogue } from '@/lib/types';
import { getCataloguesAction, createCatalogueAction } from '@/app/actions/catalogues';
import styles from './page.module.css';
import { useToast } from '@/contexts/ToastContext';

const POPULAR_STYLE_PRESETS = [
  'Royal Agbada',
  'Senator Styles',
  'Two-Piece Suit',
  'Luxury Kaftan',
  'Bridal & Gowns',
  'Aso-Ebi & Events',
  'Casual Danshiki',
];

export default function CataloguesPage() {
  const { currentShop } = useData();
  const router = useRouter();
  const { showToast } = useToast();

  const [catalogues, setCatalogues] = useState<StyleCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentShop) return;
    getCataloguesAction(currentShop.id)
      .then((res) => {
        setCatalogues(res);
        setLoading(false);
      })
      .catch((err) => {
        showToast(err.message, 'error');
        setLoading(false);
      });
  }, [currentShop, showToast]);

  const handleCreate = async (titleToCreate?: string) => {
    const title = (titleToCreate || newTitle).trim();
    if (!currentShop || !title) {
      showToast('Please enter an album title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const id = await createCatalogueAction(currentShop.id, title);
      showToast(`Album "${title}" created!`, 'success');
      setIsCreating(false);
      setNewTitle('');
      router.push(`/catalogues/${id}`);
    } catch (e: any) {
      showToast(e.message || 'Could not create album', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareGeneral = () => {
    if (!currentShop?.slug) {
      showToast('You must set a Public Link in Studio Settings first.', 'info');
      router.push('/settings/studio');
      return;
    }
    const url = `https://mytailorbook.com/catalogue/${currentShop.slug}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showToast('General Catalogue link copied to clipboard!', 'success');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenPublicPreview = () => {
    if (!currentShop?.slug) {
      showToast('Please set your Studio URL Slug first.', 'info');
      router.push('/settings/studio');
      return;
    }
    window.open(`/catalogue/${currentShop.slug}`, '_blank');
  };

  const totalPhotos = catalogues.reduce((sum, c) => sum + (c.photos?.length || 0), 0);

  return (
    <div className={styles.container}>
      <TopBar title="Inspiration Lookbooks" showBack={false} />

      <div className={styles.content}>
        {/* Atelier Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroText}>
            <div className={styles.heroBadgeRow}>
              <span className={styles.heroPill}>
                <Symbol name="photo_library" size={14} />
                <span>{catalogues.length} {catalogues.length === 1 ? 'Album' : 'Albums'}</span>
              </span>
              <span className={styles.heroPill}>
                <Symbol name="collections" size={14} />
                <span>{totalPhotos} {totalPhotos === 1 ? 'Style Photo' : 'Style Photos'}</span>
              </span>
            </div>
            <h2 className={styles.heroTitle}>Curate Your Signature Craft</h2>
            <p className={styles.heroSubtitle}>
              Organize style ideas for walk-in consultations and broadcast collections directly to matching clients on WhatsApp.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryCreateBtn}
              onClick={() => {
                setNewTitle('');
                setIsCreating(true);
              }}
            >
              <Symbol name="add" size={18} />
              <span>Create New Album</span>
            </button>

            <button
              type="button"
              className={styles.secondaryShareBtn}
              onClick={handleShareGeneral}
              title="Copy shareable link to full lookbook"
            >
              <Symbol name="share" size={16} />
              <span>Share Lookbook</span>
            </button>

            {currentShop?.slug && (
              <button
                type="button"
                className={styles.previewBtn}
                onClick={handleOpenPublicPreview}
                title="Preview client view"
              >
                <Symbol name="visibility" size={16} />
                <span>Client View</span>
              </button>
            )}
          </div>
        </div>

        {/* Catalogues Grid or Skeleton */}
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton width="100%" height="160px" borderRadius="var(--sf-radius-lg)" />
                <div className={styles.skeletonInfo}>
                  <Skeleton width="70%" height="16px" />
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogues.length === 0 ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              icon={<Symbol name="photo_library" size={48} />}
              title="Your Style Atelier is Empty"
              description="Create style albums like 'Royal Agbada' or 'Senator Wear' to showcase what you can sew, impress walk-in clients, and broadcast menus to VIP customers."
            />
            <div className={styles.quickStartCard}>
              <h4 className={styles.quickStartTitle}>Popular Atelier Albums — Tap to Create:</h4>
              <div className={styles.quickStartPresets}>
                {POPULAR_STYLE_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={styles.presetChip}
                    onClick={() => handleCreate(preset)}
                    disabled={submitting}
                  >
                    <Symbol name="add" size={14} />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {catalogues.map((cat) => {
              const photoCount = cat.photos?.length || 0;
              const coverPhoto = cat.photos && cat.photos.length > 0 ? cat.photos[0].imageUrl : null;

              return (
                <div
                  key={cat.id}
                  className={styles.card}
                  onClick={() => router.push(`/catalogues/${cat.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/catalogues/${cat.id}`);
                    }
                  }}
                >
                  <div className={styles.cardThumb}>
                    {coverPhoto ? (
                      <img src={coverPhoto} alt={cat.title} className={styles.coverImg} />
                    ) : (
                      <div className={styles.emptyThumb}>
                        <Symbol name="add_a_photo" size={32} />
                        <span className={styles.emptyThumbText}>Add Photos</span>
                      </div>
                    )}
                    <span className={styles.photoCountBadge}>
                      <Symbol name="collections" size={12} />
                      <span>{photoCount} {photoCount === 1 ? 'look' : 'looks'}</span>
                    </span>
                  </div>

                  <div className={styles.cardInfo}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>{cat.title}</h3>
                      <Symbol name="chevron_right" size={18} className={styles.cardChevron} />
                    </div>
                    <p className={styles.cardSub}>
                      {photoCount > 0 ? 'Tap to view & consult' : 'No photos yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Album BottomSheet */}
      <BottomSheet
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create Inspiration Album"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetSubtitle}>
            Give your album a descriptive name. Walk-in clients can browse it during consultations, and you can broadcast it directly on WhatsApp.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Album Title</label>
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Royal Agbada, Modern Senator"
              className={styles.titleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>

          <div className={styles.presetSection}>
            <span className={styles.presetLabel}>Quick Suggestions:</span>
            <div className={styles.presetChips}>
              {POPULAR_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`${styles.presetChip} ${newTitle === preset ? styles.presetChipActive : ''}`}
                  onClick={() => setNewTitle(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sheetActions}>
            <Button
              variant="ghost"
              onClick={() => setIsCreating(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreate()}
              disabled={submitting || !newTitle.trim()}
            >
              {submitting ? 'Creating...' : 'Create Album'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
