'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import { getCataloguesAction, createCatalogueAction } from '@/app/actions/catalogues';
import { getCachedCatalogues, setCachedCatalogues } from '@/lib/catalogueCache';
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

function getEstimatedYardage(title?: string): string {
  if (!title) return '4.0 yds';
  const lower = title.toLowerCase();
  if (lower.includes('agbada') || lower.includes('babban riga') || lower.includes('grand')) return '7.0 yds';
  if (lower.includes('suit') || lower.includes('tuxedo') || lower.includes('blazer')) return '3.5 yds';
  if (lower.includes('kaftan') || lower.includes('senator')) return '4.0 yds';
  if (lower.includes('trouser') || lower.includes('pant')) return '2.5 yds';
  if (lower.includes('shirt') || lower.includes('top')) return '2.0 yds';
  if (lower.includes('gown') || lower.includes('dress') || lower.includes('bridal')) return '5.0 yds';
  return '4.0 yds';
}

export default function CataloguesPage() {
  const { currentShop } = useData();
  const router = useRouter();
  const { showToast } = useToast();

  const cached = currentShop?.id ? getCachedCatalogues(currentShop.id) : null;
  const [catalogues, setCatalogues] = useState<StyleCatalogue[]>(cached || []);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 'albums' = Pinterest Board Cards, 'stream' = All Inspirations Staggered Masonry
  const [viewMode, setViewMode] = useState<'albums' | 'stream'>('albums');

  useEffect(() => {
    if (!currentShop?.id) {
      setCatalogues([]);
      setLoading(false);
      return;
    }

    const cachedNow = getCachedCatalogues(currentShop.id);
    if (cachedNow) {
      setCatalogues(cachedNow);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getCataloguesAction(currentShop.id)
      .then((res) => {
        const data = res || [];
        setCachedCatalogues(currentShop.id, data);
        setCatalogues(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('DB catalogue query error:', err.message);
        if (!cachedNow) {
          setCatalogues([]);
        }
        setLoading(false);
      });
  }, [currentShop?.id]);

  const handleCreate = async (titleToCreate?: string) => {
    if (currentShop?.subscriptionStatus === 'free') {
      showToast('Style Catalogues are strictly for Premium workshops. Upgrade to create curated albums.', 'info');
      router.push(ROUTES.settingsBilling);
      return;
    }
    if (currentShop?.subscriptionStatus === 'paused') {
      showToast('Your workshop subscription is currently paused. Resume your subscription to create new albums.', 'info');
      router.push(ROUTES.settingsBilling);
      return;
    }

    const title = (titleToCreate || newTitle).trim();
    if (!title) {
      showToast('Please enter an album title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (currentShop) {
        const id = await createCatalogueAction(currentShop.id, title);
        const newCat: StyleCatalogue = {
          id,
          shopId: currentShop.id,
          title,
          photos: [],
          createdAt: new Date().toISOString(),
        };
        const updatedList = [newCat, ...catalogues];
        setCachedCatalogues(currentShop.id, updatedList);
        setCatalogues(updatedList);
        showToast(`Album "${title}" created!`, 'success');
        setIsCreating(false);
        setNewTitle('');
        router.push(ROUTES.catalogueDetail({ id, title }));
      }
    } catch (e: any) {
      showToast(e.message || 'Could not create album', 'error');
    } finally {
      setSubmitting(false);
    }
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
        {currentShop?.subscriptionStatus === 'paused' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            margin: '0 0 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.08), rgba(99, 102, 241, 0.14))',
            border: '1px solid rgba(67, 56, 202, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Symbol name="pause_circle" size={20} style={{ color: 'var(--sf-brand-indigo, #4338CA)', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: 'var(--sf-text-primary)' }}>
                <strong>Subscription Paused:</strong> All catalogue pictures and customer albums are 100% safe &amp; preserved.
                {currentShop.subscriptionPauseEndsAt && (
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--sf-text-secondary)', marginTop: '2px' }}>
                    Scheduled resume: {new Date(currentShop.subscriptionPauseEndsAt).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.settingsBilling)}
              style={{
                background: 'var(--sf-brand-indigo, #4338CA)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Manage Pause
            </button>
          </div>
        )}

        {currentShop?.subscriptionStatus === 'free' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            margin: '0 0 16px',
            borderRadius: '12px',
            background: 'var(--sf-warning-bg, #FFFBEB)',
            border: '1px solid var(--sf-warning-border, #FDE68A)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Symbol name="workspace_premium" size={20} style={{ color: 'var(--sf-warning, #D97706)', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--sf-text-primary)' }}>Style Catalogues are a Premium Feature:</strong> High-resolution photos are retained for active and paused subscriptions (up to 3 months).
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.settingsBilling)}
              style={{
                background: 'var(--sf-color-primary, #047857)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Upgrade
            </button>
          </div>
        )}

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
              title="Your Style Catalog is Empty"
              description="Create style albums like 'Royal Agbada' or 'Senator Styles' to showcase what your shop can sew, impress walk-in clients, and broadcast designs to customers."
            />
            <div className={styles.quickStartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className={styles.quickStartTitle}>Popular Style Albums — Tap to Create:</h4>
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
                  onClick={() => router.push(ROUTES.catalogueDetail(cat))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(ROUTES.catalogueDetail(cat));
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
                        <img src={mainPhoto} alt={cat.title} decoding="async" className={styles.collageImg} />
                      </div>
                    ) : photoCount === 2 ? (
                      <>
                        <div className={styles.collageHalf}>
                          <img src={mainPhoto} alt={cat.title} decoding="async" className={styles.collageImg} />
                        </div>
                        <div className={styles.collageHalf}>
                          <img src={secondPhoto} alt={cat.title} decoding="async" className={styles.collageImg} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.collageMain}>
                          <img src={mainPhoto} alt={cat.title} decoding="async" className={styles.collageImg} />
                        </div>
                        <div className={styles.collageSide}>
                          <div className={styles.collageSideThumb}>
                            <img src={secondPhoto} alt="" decoding="async" className={styles.collageImg} />
                          </div>
                          <div className={styles.collageSideThumb}>
                            <img src={thirdPhoto} alt="" decoding="async" className={styles.collageImg} />
                          </div>
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
                onClick={() => router.push(ROUTES.catalogueDetail({ id: photo.catalogueId, title: photo.albumTitle }))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(ROUTES.catalogueDetail({ id: photo.catalogueId, title: photo.albumTitle }));
                  }
                }}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.albumTitle}
                  decoding="async"
                  className={styles.pinImg}
                />
                <span className={styles.pinAlbumBadge}>{photo.albumTitle}</span>
                <span className={styles.pinYardageBadge}>
                  <Symbol name="straighten" size={11} />
                  <span>{getEstimatedYardage(photo.albumTitle)}</span>
                </span>

                <div className={styles.pinOverlay}>
                  <div className={styles.pinActions}>
                    <button
                      type="button"
                      className={styles.pinQuoteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/quotes?style=${encodeURIComponent(photo.albumTitle)}&styleRef=${encodeURIComponent(
                            photo.imageUrl
                          )}`
                        );
                      }}
                      title="Calculate price quote for this style"
                    >
                      <Symbol name="calculate" size={14} />
                      <span className={styles.pinBtnLabel}>Quote</span>
                    </button>

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
                      <Symbol name="content_cut" size={14} />
                      <span className={styles.pinBtnLabel}>Sew This</span>
                    </button>
                  </div>
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
