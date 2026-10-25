'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import styles from './page.module.css';

interface CatalogueClientProps {
  shopName: string;
  logoUrl?: string | null;
  catalogues: StyleCatalogue[];
  shopPhone?: string | null;
}

export default function CatalogueClient({
  shopName,
  logoUrl,
  catalogues,
  shopPhone,
}: CatalogueClientProps) {
  const searchParams = useSearchParams();
  const initialAlbumId = searchParams.get('album');

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(initialAlbumId);
  const [selectedPhoto, setSelectedPhoto] = useState<StyleCataloguePhoto | null>(null);

  useEffect(() => {
    if (initialAlbumId) {
      setActiveAlbumId(initialAlbumId);
    }
  }, [initialAlbumId]);

  const activeAlbum = catalogues.find((c) => c.id === activeAlbumId);

  const handleSewThis = (photo: StyleCataloguePhoto) => {
    if (!shopPhone) return;
    const albumTitle = activeAlbum?.title || 'Bespoke Style';
    const text = `Hi ${shopName}! I saw this ${albumTitle} look in your catalogue and I would love to order something like this. Picture: ${photo.imageUrl}`;
    const cleanPhone = shopPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const totalStyles = catalogues.reduce((sum, c) => sum + (c.photos?.length || 0), 0);

  return (
    <div className={styles.container}>
      {/* Luxury Atelier Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoWrap}>
            {logoUrl ? (
              <img src={logoUrl} alt={shopName} className={styles.logo} />
            ) : (
              <div className={styles.logoPlaceholder}>
                <Symbol name="content_cut" size={24} />
              </div>
            )}
          </div>

          <div className={styles.headerText}>
            <span className={styles.studioKicker}>Bespoke Atelier Lookbook</span>
            <h1 className={styles.shopTitle}>{shopName}</h1>
            <p className={styles.instructions}>
              Curated bespoke inspiration for our esteemed clients. Tap any style you desire to commission your piece.
            </p>
          </div>

          {shopPhone && (
            <a
              href={`https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shopName}, I'm browsing your lookbook!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactChip}
            >
              <WhatsappIcon size={16} />
              <span>Contact Studio</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.content}>
        {activeAlbum ? (
          <div className={styles.albumView}>
            <div className={styles.albumHeader}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setActiveAlbumId(null)}
              >
                <Symbol name="arrow_back" size={16} />
                <span>All Collections</span>
              </button>

              <div className={styles.albumTitleRow}>
                <h2 className={styles.albumHeading}>{activeAlbum.title}</h2>
                <span className={styles.albumCountPill}>
                  {activeAlbum.photos?.length || 0} styles
                </span>
              </div>
              <p className={styles.albumInstructions}>
                Tap any design to inspect details or request it on WhatsApp.
              </p>
            </div>

            {activeAlbum.photos && activeAlbum.photos.length > 0 ? (
              <div className={styles.masonry}>
                {activeAlbum.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={styles.photoItem}
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
                    <img src={photo.imageUrl} alt={activeAlbum.title} className={styles.photoImg} />
                    <div className={styles.photoHoverTag}>
                      <WhatsappIcon size={14} />
                      <span>Request This</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCard}>
                <p>This collection is currently being updated with new designs.</p>
                <button
                  type="button"
                  className={styles.emptyBackBtn}
                  onClick={() => setActiveAlbumId(null)}
                >
                  View Other Collections
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.collectionsView}>
            <div className={styles.collectionsHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Curated Collections</h2>
                <p className={styles.sectionSub}>
                  Explore {catalogues.length} albums featuring {totalStyles} hand-tailored looks
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              {catalogues.map((cat) => {
                const cover = cat.photos && cat.photos.length > 0 ? cat.photos[0].imageUrl : null;
                const count = cat.photos?.length || 0;

                return (
                  <div
                    key={cat.id}
                    className={styles.card}
                    onClick={() => setActiveAlbumId(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveAlbumId(cat.id);
                      }
                    }}
                  >
                    <div className={styles.cardThumb}>
                      {cover ? (
                        <img src={cover} alt={cat.title} className={styles.cardImg} />
                      ) : (
                        <div className={styles.emptyThumb}>
                          <Symbol name="photo_library" size={28} />
                          <span>No photos</span>
                        </div>
                      )}
                      <span className={styles.cardPill}>{count} {count === 1 ? 'look' : 'looks'}</span>
                    </div>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardTitle}>{cat.title}</h3>
                      <span className={styles.cardArrow}>
                        <Symbol name="chevron_right" size={16} />
                      </span>
                    </div>
                  </div>
                );
              })}

              {catalogues.length === 0 && (
                <div className={styles.emptyCard}>
                  <p>No lookbook collections have been published yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Selected Photo Modal Overlay */}
      {selectedPhoto && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPhoto(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close"
            >
              <Symbol name="close" size={18} />
            </button>

            <div className={styles.modalImgWrap}>
              <img
                src={selectedPhoto.imageUrl}
                alt={activeAlbum?.title || 'Selected Style'}
                className={styles.modalImg}
              />
            </div>

            <div className={styles.modalActions}>
              <div className={styles.modalMeta}>
                <span className={styles.modalAlbumTag}>{activeAlbum?.title || 'Bespoke Style'}</span>
                <p className={styles.modalHint}>
                  Love this style? Send it to our studio via WhatsApp to discuss measurements, fabrics, and pricing.
                </p>
              </div>

              {shopPhone ? (
                <button
                  type="button"
                  className={styles.sewBtn}
                  onClick={() => handleSewThis(selectedPhoto)}
                >
                  <WhatsappIcon size={20} />
                  <span>Sew This For Me (WhatsApp)</span>
                </button>
              ) : (
                <p className={styles.noPhoneNotice}>
                  Please contact the studio directly to request this garment.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Luxury Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Symbol name="content_cut" size={16} />
            <span>{shopName}</span>
          </div>
          <p className={styles.poweredBy}>Powered by MyTailorBook — Haute Couture & Bespoke Atelier System</p>
        </div>
      </footer>
    </div>
  );
}
