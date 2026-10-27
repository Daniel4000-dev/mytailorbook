'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import { getCataloguesAction, createCatalogueAction } from '@/app/actions/catalogues';
import {
  getStoredMockCatalogues,
  saveMockCatalogues,
  wipeMockCatalogues,
  resetMockCatalogues,
  isMockCataloguesActive,
} from '@/lib/mockCatalogues';
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

interface EnrichedPhoto extends StyleCataloguePhoto {
  albumTitle: string;
}

export default function CataloguesPage() {
  const { currentShop } = useData();
  const router = useRouter();
  const { showToast } = useToast();

  const [catalogues, setCatalogues] = useState<StyleCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);

  // 'albums' = Pinterest Board Cards, 'stream' = All Inspirations Staggered Masonry
  const [viewMode, setViewMode] = useState<'albums' | 'stream'>('albums');

  useEffect(() => {
    if (!currentShop) {
      // If no current shop yet, load mock catalogues immediately so user can inspect
      const mocks = getStoredMockCatalogues();
      setCatalogues(mocks);
      setIsUsingMock(true);
      setLoading(false);
      return;
    }

    getCataloguesAction(currentShop.id)
      .then((res) => {
        if (res && res.length > 0) {
          setCatalogues(res);
          setIsUsingMock(false);
        } else {
          // If shop has no catalogues in DB, fallback to stored frontend mock data if enabled
          const mocks = getStoredMockCatalogues();
          setCatalogues(mocks);
          setIsUsingMock(mocks.length > 0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('DB catalogue query error, falling back to mock:', err.message);
        const mocks = getStoredMockCatalogues();
        setCatalogues(mocks);
        setIsUsingMock(mocks.length > 0);
        setLoading(false);
      });
  }, [currentShop]);

  const handleCreate = async (titleToCreate?: string) => {
    const title = (titleToCreate || newTitle).trim();
    if (!title) {
      showToast('Please enter an album title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (currentShop && !isUsingMock) {
        const id = await createCatalogueAction(currentShop.id, title);
        showToast(`Album "${title}" created!`, 'success');
        setIsCreating(false);
        setNewTitle('');
        router.push(`/catalogues/${id}`);
      } else {
        // Frontend Mock Mode creation
        const newCat: StyleCatalogue = {
          id: `mock-${Date.now()}`,
          shopId: currentShop?.id || 'mock-shop',
          title,
          createdAt: new Date().toISOString(),
          photos: [],
        };
        const updated = [...catalogues, newCat];
        setCatalogues(updated);
        saveMockCatalogues(updated);
        setIsUsingMock(true);
        showToast(`Album "${title}" created in mock mode!`, 'success');
        setIsCreating(false);
        setNewTitle('');
        router.push(`/catalogues/${newCat.id}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Could not create album', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWipeMock = () => {
    wipeMockCatalogues();
    setCatalogues([]);
    setIsUsingMock(false);
    showToast('Frontend demo data wiped. Lookbook is now empty.', 'info');
  };

  const handleResetMock = () => {
    const fresh = resetMockCatalogues();
    setCatalogues(fresh);
    setIsUsingMock(true);
    showToast('Sample lookbook loaded with 5 collections!', 'success');
  };

  const handleShareGeneral = () => {
    const slug = currentShop?.slug || 'your-studio';
    const url = `${window.location.origin}/catalogue/${slug}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showToast('Public Lookbook link copied to clipboard!', 'success');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenPublicPreview = () => {
    const slug = currentShop?.slug || 'demo';
    window.open(`/catalogue/${slug}`, '_blank');
  };

  const totalPhotos = catalogues.reduce((sum, c) => sum + (c.photos?.length || 0), 0);

  // Flattened photos for the global staggered stream view
  const allStreamPhotos = useMemo<EnrichedPhoto[]>(() => {
    const list: EnrichedPhoto[] = [];
    for (const cat of catalogues) {
      for (const p of cat.photos || []) {
        list.push({ ...p, albumTitle: cat.title });
      }
    }
    return list;
  }, [catalogues]);

  return (
    <div className={styles.container}>
      <TopBar title="Inspiration Lookbooks" showBack={false} />

      <div className={styles.content}>
        {/* ── Atelier Hero Liquid Glass Banner ── */}
        <div className={styles.heroBanner}>
          <div className={styles.heroText}>
            <div className={styles.heroBadgeRow}>
              <span className={styles.heroPill}>
                <Symbol name="photo_library" size={14} />
                <span>{catalogues.length} {catalogues.length === 1 ? 'Album' : 'Albums'}</span>
              </span>
              <span className={styles.heroPill}>
                <Symbol name="collections" size={14} />
                <span>{totalPhotos} {totalPhotos === 1 ? 'Inspiration Look' : 'Inspiration Looks'}</span>
              </span>
              {isUsingMock && (
                <span className={styles.heroPill} style={{ background: 'rgba(67, 56, 202, 0.12)', color: 'var(--sf-brand-indigo)' }}>
                  <Symbol name="auto_awesome" size={13} />
                  <span>Frontend Demo Mode</span>
                </span>
              )}
            </div>
            <h2 className={styles.heroTitle}>Curate Your Signature Craft</h2>
            <p className={styles.heroSubtitle}>
              Organize style collections for walk-in consultations and broadcast menus directly to VIP clients on WhatsApp.
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

            <button
              type="button"
              className={styles.previewBtn}
              onClick={handleOpenPublicPreview}
              title="Preview client view"
            >
              <Symbol name="visibility" size={16} />
              <span>Client View</span>
            </button>

            {/* Quick Demo Data Controls */}
            {isUsingMock ? (
              <button
                type="button"
                className={styles.previewBtn}
                style={{ borderColor: 'rgba(220, 38, 38, 0.3)', color: '#DC2626' }}
                onClick={handleWipeMock}
                title="Wipe frontend demo data"
              >
                <Symbol name="delete" size={15} />
                <span>Wipe Demo Data</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.previewBtn}
                onClick={handleResetMock}
                title="Load sample lookbook"
              >
                <Symbol name="auto_awesome" size={15} />
                <span>Load Sample Lookbook</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Apple Segmented Control: Curated Albums vs All Inspirations ── */}
        {!loading && catalogues.length > 0 && (
          <div className={styles.segmentedWrap}>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${viewMode === 'albums' ? styles.segmentBtnActive : ''}`}
                onClick={() => setViewMode('albums')}
              >
                <Symbol name="apps" size={15} />
                <span>Curated Albums ({catalogues.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${viewMode === 'stream' ? styles.segmentBtnActive : ''}`}
                onClick={() => setViewMode('stream')}
              >
                <Symbol name="collections" size={15} />
                <span>All Inspirations ({totalPhotos})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Loading Skeleton ── */}
        {loading ? (
          <div className={styles.albumsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ borderRadius: '18px', overflow: 'hidden' }}>
                <Skeleton width="100%" height="180px" borderRadius="18px" />
                <div style={{ padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton width="70%" height="16px" />
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogues.length === 0 ? (
          /* ── Empty State & Quick Presets ── */
          <div className={styles.emptyWrap}>
            <EmptyState
              icon={<Symbol name="photo_library" size={44} />}
              title="Your Style Lookbook is Empty"
              description="Create style albums like 'Royal Agbada' or 'Senator Styles' to showcase what your atelier can sew, impress walk-in clients, and broadcast menus to VIP customers."
            />
            <div className={styles.quickStartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className={styles.quickStartTitle}>Popular Atelier Albums — Tap to Create:</h4>
                <button
                  type="button"
                  onClick={handleResetMock}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--sf-brand-indigo)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Symbol name="auto_awesome" size={13} />
                  <span>Load Sample Lookbook</span>
                </button>
              </div>
              <div className={styles.quickStartPresets}>
                {POPULAR_STYLE_PRESETS.slice(0, 5).map((preset) => (
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
        ) : viewMode === 'albums' ? (
          /* ── Mode 1: Curated Pinterest Board Albums ── */
          <div className={styles.albumsGrid}>
            {catalogues.map((cat) => {
              const photos = cat.photos || [];
              const photoCount = photos.length;
              const mainPhoto = photos[0]?.imageUrl;
              const secondPhoto = photos[1]?.imageUrl;
              const thirdPhoto = photos[2]?.imageUrl;

              return (
                <div
                  key={cat.id}
                  className={styles.albumCard}
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
                  {/* Pinterest Multi-Photo Board Collage */}
                  <div className={styles.albumCollage}>
                    {photoCount === 0 ? (
                      <div className={styles.emptyCollage}>
                        <Symbol name="add_a_photo" size={28} />
                        <span>Add Photos</span>
                      </div>
                    ) : photoCount === 1 ? (
                      <div className={styles.collageMain} style={{ flex: 1 }}>
                        <img src={mainPhoto} alt={cat.title} className={styles.collageImg} />
                      </div>
                    ) : (
                      <>
                        <div className={styles.collageMain}>
                          <img src={mainPhoto} alt={cat.title} className={styles.collageImg} />
                        </div>
                        <div className={styles.collageSide}>
                          <div className={styles.collageSideThumb}>
                            <img src={secondPhoto} alt="" className={styles.collageImg} />
                          </div>
                          {thirdPhoto && (
                            <div className={styles.collageSideThumb}>
                              <img src={thirdPhoto} alt="" className={styles.collageImg} />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <span className={styles.collageCountBadge}>
                      <Symbol name="collections" size={12} />
                      <span>{photoCount} {photoCount === 1 ? 'look' : 'looks'}</span>
                    </span>
                  </div>

                  <div className={styles.albumInfo}>
                    <div className={styles.albumHeaderRow}>
                      <h3 className={styles.albumTitle}>{cat.title}</h3>
                      <Symbol name="chevron_right" size={16} className={styles.albumArrow} />
                    </div>
                    <p className={styles.albumSub}>
                      {photoCount > 0 ? 'Tap to consult with client' : 'No photos uploaded yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Mode 2: All Inspirations (Pinterest Staggered Masonry Feed) ── */
          <div className={styles.masonryGrid}>
            {allStreamPhotos.map((photo) => (
              <div
                key={photo.id}
                className={styles.pinCard}
                onClick={() => router.push(`/catalogues/${photo.catalogueId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/catalogues/${photo.catalogueId}`);
                  }
                }}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.albumTitle}
                  loading="lazy"
                  className={styles.pinImg}
                />
                <span className={styles.pinAlbumBadge}>{photo.albumTitle}</span>

                <div className={styles.pinOverlay}>
                  <button
                    type="button"
                    className={styles.pinOrderBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/orders/new?style=${encodeURIComponent(photo.albumTitle)}&styleRef=${encodeURIComponent(
                          photo.imageUrl
                        )}`
                      );
                    }}
                  >
                    <Symbol name="content_cut" size={13} />
                    <span>Sew This</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Album BottomSheet ── */}
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
