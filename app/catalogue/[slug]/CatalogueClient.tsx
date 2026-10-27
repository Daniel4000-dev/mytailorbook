'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import { getStoredMockCatalogues } from '@/lib/mockCatalogues';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import styles from './page.module.css';

interface EnrichedPhoto extends StyleCataloguePhoto {
  albumTitle: string;
}

interface CatalogueClientProps {
  shopName: string;
  logoUrl?: string | null;
  catalogues: StyleCatalogue[];
  shopPhone?: string | null;
}

function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CatalogueClient({
  shopName,
  logoUrl,
  catalogues,
  shopPhone,
}: CatalogueClientProps) {
  const searchParams = useSearchParams();
  const initialAlbumId = searchParams.get('album');

  // null = 'All Looks', string = specific catalogueId
  const [activeFilterId, setActiveFilterId] = useState<string | null>(initialAlbumId);
  const [selectedPhoto, setSelectedPhoto] = useState<EnrichedPhoto | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialAlbumId) {
      setActiveFilterId(initialAlbumId);
    }
  }, [initialAlbumId]);

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [effectiveCatalogues, setEffectiveCatalogues] = useState<StyleCatalogue[]>(catalogues);

  useEffect(() => {
    if (catalogues && catalogues.length > 0) {
      setEffectiveCatalogues(catalogues);
    } else {
      setEffectiveCatalogues(getStoredMockCatalogues());
    }
  }, [catalogues]);

  // Aggregate all photos with album metadata for the unified Pinterest feed
  const allEnrichedPhotos = useMemo<EnrichedPhoto[]>(() => {
    const list: EnrichedPhoto[] = [];
    for (const cat of effectiveCatalogues) {
      for (const p of cat.photos || []) {
        list.push({
          ...p,
          albumTitle: cat.title,
        });
      }
    }
    return list;
  }, [effectiveCatalogues]);

  // Filtered photos depending on selected category pill
  const displayedPhotos = useMemo<EnrichedPhoto[]>(() => {
    if (!activeFilterId) return allEnrichedPhotos;
    const cat = effectiveCatalogues.find((c) => c.id === activeFilterId);
    if (!cat || !cat.photos) return [];
    return cat.photos.map((p) => ({
      ...p,
      albumTitle: cat.title,
    }));
  }, [activeFilterId, allEnrichedPhotos, effectiveCatalogues]);

  const activeAlbumTitle = useMemo(() => {
    if (!activeFilterId) return 'All Inspiration Styles';
    return effectiveCatalogues.find((c) => c.id === activeFilterId)?.title || 'Curated Collection';
  }, [activeFilterId, effectiveCatalogues]);

  const handleSewThis = (photo: EnrichedPhoto) => {
    if (!shopPhone) return;
    const text = `Hi ${shopName}! I saw this ${photo.albumTitle} design in your catalogue and would love to commission something like this. Reference Photo: ${photo.imageUrl}`;
    const cleanPhone = shopPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyPhotoLink = (photo: EnrichedPhoto) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?album=${photo.catalogueId}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className={styles.container}>
      {/* ── Apple Liquid Glass Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <div className={styles.logoWrap}>
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} className={styles.logo} />
              ) : (
                <span className={styles.monogramSeal}>{getMonogram(shopName)}</span>
              )}
            </div>

            <div className={styles.brandText}>
              <div className={styles.studioBadgeRow}>
                <span className={styles.studioKicker}>Atelier Lookbook</span>
                <span className={styles.verifiedTag}>
                  <Symbol name="verified" size={13} />
                  <span>Bespoke Studio</span>
                </span>
              </div>
              <h1 className={styles.shopTitle}>{shopName}</h1>
            </div>
          </div>

          {shopPhone && (
            <a
              href={`https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hello ${shopName}, I am browsing your inspiration lookbook and would like to inquire about a custom order.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerContactBtn}
              title="Chat with atelier on WhatsApp"
            >
              <WhatsappIcon size={16} />
              <span>Contact Studio</span>
            </a>
          )}
        </div>
      </header>

      {/* ── Horizontal Apple Pill Filter Bar ── */}
      <nav className={styles.pillBarWrapper} aria-label="Collections Filter">
        <div className={styles.pillBar}>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterId === null ? styles.filterPillActive : ''}`}
            onClick={() => setActiveFilterId(null)}
          >
            <span>All Looks</span>
            <span className={styles.pillCount}>{allEnrichedPhotos.length}</span>
          </button>

          {effectiveCatalogues.map((cat) => {
            const count = cat.photos?.length || 0;
            const isActive = activeFilterId === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilterId(cat.id)}
              >
                <span>{cat.title}</span>
                <span className={styles.pillCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Main Pinterest Staggered Masonry View ── */}
      <main className={styles.main}>
        <div className={styles.feedHeader}>
          <div>
            <h2 className={styles.feedTitle}>{activeAlbumTitle}</h2>
            <p className={styles.feedSubtitle}>
              Showing {displayedPhotos.length} {displayedPhotos.length === 1 ? 'curated look' : 'curated looks'}
            </p>
          </div>
        </div>

        {displayedPhotos.length > 0 ? (
          <div className={styles.masonryGrid}>
            {displayedPhotos.map((photo) => (
              <div
                key={photo.id}
                className={styles.pinCard}
                onClick={() => setSelectedPhoto(photo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPhoto(photo);
                  }
                }}
              >
                <div className={styles.pinImgWrap}>
                  <img
                    src={photo.imageUrl}
                    alt={photo.albumTitle}
                    loading="lazy"
                    className={styles.pinImg}
                  />

                  {/* Album tag badge */}
                  <span className={styles.pinAlbumBadge}>{photo.albumTitle}</span>

                  {/* Hover Floating Action (Pinterest Style) */}
                  <div
                    className={styles.pinHoverAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSewThis(photo);
                    }}
                  >
                    <WhatsappIcon size={14} />
                    <span>Request on WhatsApp</span>
                  </div>

                  {/* Touch device indicator */}
                  <div className={styles.touchInquireIcon} aria-hidden="true">
                    <WhatsappIcon size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyFeed}>
            <Symbol name="photo_library" size={40} />
            <h3 className={styles.emptyTitle}>No Designs in this Collection Yet</h3>
            <p className={styles.emptyText}>
              The atelier is currently curating new bespoke inspirations for this collection. Please check back soon or browse All Looks.
            </p>
            {activeFilterId !== null && (
              <button
                type="button"
                className={styles.filterPill}
                style={{ marginTop: '8px' }}
                onClick={() => setActiveFilterId(null)}
              >
                <span>View All Looks</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* ── Apple-Style Pin Lightbox Modal ── */}
      {selectedPhoto && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPhoto(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.albumTitle}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close Preview"
            >
              <Symbol name="close" size={18} />
            </button>

            <div className={styles.modalImgFrame}>
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.albumTitle}
                className={styles.modalImg}
              />
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalMetaRow}>
                <span className={styles.modalAlbumTag}>
                  <Symbol name="collections" size={14} />
                  <span>{selectedPhoto.albumTitle}</span>
                </span>
                <span className={styles.modalStudioSign}>{shopName} Atelier</span>
              </div>

              <p className={styles.modalInstructions}>
                Love this design? Send it directly to our atelier on WhatsApp to confirm custom measurements, fabric selection, and order delivery dates.
              </p>

              <div className={styles.modalActions}>
                {shopPhone ? (
                  <button
                    type="button"
                    className={styles.sewThisBtn}
                    onClick={() => handleSewThis(selectedPhoto)}
                  >
                    <WhatsappIcon size={20} />
                    <span>Sew This For Me on WhatsApp</span>
                  </button>
                ) : (
                  <div className={styles.sharePinBtn} style={{ cursor: 'default', opacity: 0.8 }}>
                    <span>Contact atelier directly to request this garment</span>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.sharePinBtn}
                  onClick={() => handleCopyPhotoLink(selectedPhoto)}
                >
                  <Symbol name={copiedLink ? 'check' : 'share'} size={16} />
                  <span>{copiedLink ? 'Collection Link Copied!' : 'Share Collection Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Luxury Atelier Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Symbol name="content_cut" size={16} />
            <span>{shopName} Bespoke Atelier</span>
          </div>
          <p className={styles.footerNote}>
            Powered by MyTailorBook • Haute Couture & Bespoke Atelier Management
          </p>
        </div>
      </footer>
    </div>
  );
}
