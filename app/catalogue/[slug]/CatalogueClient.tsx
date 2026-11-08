'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  StyleCatalogue,
  StyleCataloguePhoto,
  PublicShowroomItem,
  PublicShowroomAccessory,
} from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { formatCurrency, getWhatsAppLink, formatShowroomWhatsAppOrderMessage } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import styles from './page.module.css';

interface EnrichedPhoto extends StyleCataloguePhoto {
  albumTitle: string;
}

interface CatalogueClientProps {
  shopName: string;
  shopSlug: string;
  logoUrl?: string | null;
  catalogues: StyleCatalogue[];
  showroomItems?: PublicShowroomItem[];
  showroomAccessories?: PublicShowroomAccessory[];
  shopPhone?: string | null;
  shopCurrency?: string;
}

function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'AT';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CatalogueClient({
  shopName,
  shopSlug,
  logoUrl,
  catalogues,
  showroomItems = [],
  showroomAccessories = [],
  shopPhone,
  shopCurrency = 'NGN',
}: CatalogueClientProps) {
  const searchParams = useSearchParams();
  const initialAlbumId = searchParams.get('album');
  const initialViewParam = searchParams.get('view');
  const initialItemId = searchParams.get('item');

  const hasShowroom = showroomItems.length > 0;
  const hasLookbook = catalogues.some((c) => (c.photos || []).length > 0);

  // View Mode: 'rack' (Showroom Floor) vs 'lookbook' (Bespoke Inspiration)
  const defaultMode: 'rack' | 'lookbook' = useMemo(() => {
    if (initialViewParam === 'lookbook') return 'lookbook';
    if (initialViewParam === 'rack') return 'rack';
    if (initialAlbumId) return 'lookbook';
    if (hasShowroom) return 'rack';
    return 'lookbook';
  }, [initialViewParam, initialAlbumId, hasShowroom]);

  const [viewMode, setViewMode] = useState<'rack' | 'lookbook'>(defaultMode);

  // Showroom Rack Filter State
  const [selectedRackCategory, setSelectedRackCategory] = useState<string>('All');
  const [selectedRackItem, setSelectedRackItem] = useState<PublicShowroomItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<Set<string>>(new Set());

  // Lookbook Filter State
  const [activeFilterId, setActiveFilterId] = useState<string | null>(initialAlbumId);
  const [selectedPhoto, setSelectedPhoto] = useState<EnrichedPhoto | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-open garment if ?item=[id] parameter is in URL
  useEffect(() => {
    if (initialItemId && showroomItems.length > 0) {
      const match = showroomItems.find((i) => i.id === initialItemId);
      if (match) {
        setSelectedRackItem(match);
        setViewMode('rack');
      }
    }
  }, [initialItemId, showroomItems]);

  useEffect(() => {
    if (initialAlbumId) {
      setActiveFilterId(initialAlbumId);
      setViewMode('lookbook');
    }
  }, [initialAlbumId]);

  // When selectedRackItem changes, initialize selected size and accessories
  useEffect(() => {
    if (selectedRackItem) {
      const availableSize = selectedRackItem.sizes.find((s) => s.quantity > 0) || selectedRackItem.sizes[0];
      setSelectedSize(availableSize ? availableSize.size : '');
      setSelectedAccessoryIds(new Set());
    }
  }, [selectedRackItem]);

  // Handle escape key and body scroll lock for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
        setSelectedRackItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (selectedPhoto || selectedRackItem) {
      const priorOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = priorOverflow;
      };
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, selectedRackItem]);

  // Aggregate all photos with album metadata for the Pinterest feed
  const allEnrichedPhotos = useMemo<EnrichedPhoto[]>(() => {
    const list: EnrichedPhoto[] = [];
    for (const cat of catalogues) {
      for (const p of cat.photos || []) {
        list.push({
          ...p,
          albumTitle: cat.title,
        });
      }
    }
    return list;
  }, [catalogues]);

  // Filtered photos for lookbook
  const displayedPhotos = useMemo<EnrichedPhoto[]>(() => {
    if (!activeFilterId) return allEnrichedPhotos;
    const cat = catalogues.find((c) => c.id === activeFilterId);
    if (!cat || !cat.photos) return [];
    return cat.photos.map((p) => ({
      ...p,
      albumTitle: cat.title,
    }));
  }, [activeFilterId, allEnrichedPhotos, catalogues]);

  const activeAlbumTitle = useMemo(() => {
    if (!activeFilterId) return 'All Inspiration Styles';
    return catalogues.find((c) => c.id === activeFilterId)?.title || 'Curated Collection';
  }, [activeFilterId, catalogues]);

  // Rack Categories
  const rackCategories = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const item of showroomItems) {
      if (item.category) set.add(item.category);
    }
    return ['All', ...Array.from(set)];
  }, [showroomItems]);

  // Filtered Rack Items
  const displayedRackItems = useMemo<PublicShowroomItem[]>(() => {
    if (selectedRackCategory === 'All') return showroomItems;
    return showroomItems.filter((i) => i.category === selectedRackCategory);
  }, [selectedRackCategory, showroomItems]);

  // Available Accessories for the selected item
  const itemAccessories = useMemo<PublicShowroomAccessory[]>(() => {
    if (!selectedRackItem) return [];
    if (selectedRackItem.pairedAccessories && selectedRackItem.pairedAccessories.length > 0) {
      return selectedRackItem.pairedAccessories;
    }
    return showroomAccessories.slice(0, 4);
  }, [selectedRackItem, showroomAccessories]);

  // Calculate Ensemble Total in Rack Quick-View
  const ensembleTotal = useMemo<number>(() => {
    if (!selectedRackItem) return 0;
    let sum = selectedRackItem.price;
    for (const acc of itemAccessories) {
      if (selectedAccessoryIds.has(acc.id)) {
        sum += acc.price;
      }
    }
    return sum;
  }, [selectedRackItem, itemAccessories, selectedAccessoryIds]);

  const toggleAccessory = (accId: string) => {
    setSelectedAccessoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId);
      else next.add(accId);
      return next;
    });
  };

  const handleOrderRackItemWhatsApp = () => {
    if (!selectedRackItem || !shopPhone) return;

    const chosenAccs = itemAccessories.filter((a) => selectedAccessoryIds.has(a.id));
    const publicUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/catalogue/${shopSlug}?view=rack&item=${selectedRackItem.id}`
      : undefined;

    const message = formatShowroomWhatsAppOrderMessage({
      shopName,
      styleName: selectedRackItem.name,
      size: selectedSize || 'Standard',
      price: selectedRackItem.price,
      currency: shopCurrency,
      accessories: chosenAccs.map((a) => ({ name: a.name, price: a.price })),
      publicUrl,
    });

    window.open(getWhatsAppLink(shopPhone, message), '_blank');
  };

  const handleSewThisLookbook = (photo: EnrichedPhoto) => {
    if (!shopPhone) return;
    const text = `Hi ${shopName}! I saw this ${photo.albumTitle} design in your catalogue and would love to commission something like this. Reference Photo: ${photo.imageUrl}`;
    window.open(getWhatsAppLink(shopPhone, text), '_blank');
  };

  const handleShareLink = async (url: string, title: string) => {
    if (typeof window === 'undefined') return;
    if (typeof navigator.canShare === 'function' && navigator.canShare({ url })) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {
        // Fallback
      }
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
                <span className={styles.studioKicker}>Atelier Showcase</span>
                <span className={styles.verifiedTag}>
                  <Symbol name="verified" size={13} />
                  <span>Verified Fashion House</span>
                </span>
              </div>
              <h1 className={styles.shopTitle}>{shopName}</h1>
            </div>
          </div>

          {shopPhone && (
            <a
              href={getWhatsAppLink(
                shopPhone,
                `Hello ${shopName}, I am browsing your online collection and would like to inquire about an order.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerContactBtn}
              title="Chat on WhatsApp"
            >
              <WhatsappIcon size={16} />
              <span>Contact Studio</span>
            </a>
          )}
        </div>
      </header>

      {/* ── Dual Mode Switcher (Showroom Floor vs Bespoke Lookbook) ── */}
      {hasShowroom && hasLookbook && (
        <section className={styles.viewModeBar}>
          <div className={styles.viewModeTrack}>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'rack' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('rack')}
            >
              <Symbol name="storefront" size={16} />
              <span>Showroom Floor</span>
              <span className={styles.viewModeCount}>{showroomItems.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'lookbook' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('lookbook')}
            >
              <Symbol name="collections" size={16} />
              <span>Bespoke Lookbook</span>
              <span className={styles.viewModeCount}>{allEnrichedPhotos.length}</span>
            </button>
          </div>
        </section>
      )}

      {/* ── View 1: Showroom Floor (Ready to Wear & Accessories) ── */}
      {viewMode === 'rack' && (
        <>
          {/* Horizontal Category Pill Filter Bar */}
          <nav className={styles.pillBarWrapper} aria-label="Showroom Categories Filter">
            <div className={styles.pillBar}>
              {rackCategories.map((cat) => {
                const isActive = selectedRackCategory === cat;
                const count = cat === 'All'
                  ? showroomItems.length
                  : showroomItems.filter((i) => i.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}
                    onClick={() => setSelectedRackCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span className={styles.pillCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className={styles.main}>
            <div className={styles.feedHeader}>
              <div>
                <h2 className={styles.feedTitle}>
                  {selectedRackCategory === 'All' ? 'In-Stock Ready to Wear' : `${selectedRackCategory} Collection`}
                </h2>
                <p className={styles.feedSubtitle}>
                  {displayedRackItems.length} {displayedRackItems.length === 1 ? 'style' : 'styles'} currently on the atelier rack
                </p>
              </div>
            </div>

            {displayedRackItems.length > 0 ? (
              <div className={styles.rackGrid}>
                {displayedRackItems.map((item) => {
                  const isAvailable = item.totalQuantity > 0;
                  const primarySize = item.sizes.find((s) => s.quantity > 0)?.size || item.sizes[0]?.size || 'Free Size';

                  return (
                    <article
                      key={item.id}
                      className={styles.rackCard}
                      onClick={() => setSelectedRackItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRackItem(item);
                        }
                      }}
                    >
                      <div className={styles.rackImgWrap}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className={styles.rackImg}
                          />
                        ) : (
                          <div className={styles.rackPlaceholder}>
                            <Symbol name="checkroom" size={32} />
                            <span className={styles.placeholderLabel}>{item.category}</span>
                          </div>
                        )}

                        <div className={styles.rackKickerRow}>
                          <span className={styles.categoryBadge}>{item.category}</span>
                          <span className={isAvailable ? styles.inStockBadge : styles.soldOutBadge}>
                            {isAvailable ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.rackCardBody}>
                        <div className={styles.rackCardHeader}>
                          <h3 className={styles.rackItemName}>{item.name}</h3>
                          <span className={styles.rackItemPrice}>
                            {formatCurrency(item.price, shopCurrency)}
                          </span>
                        </div>

                        {(item.fabric || item.color) && (
                          <p className={styles.rackItemMeta}>
                            {[item.fabric, item.color].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        <div className={styles.rackSizesRow}>
                          {item.sizes.map((s) => (
                            <span
                              key={s.id}
                              className={`${styles.sizePill} ${s.quantity === 0 ? styles.sizePillDepleted : ''}`}
                              title={`${s.size}: ${s.quantity} available`}
                            >
                              <span className={styles.sizeName}>{s.size}</span>
                              <span className={styles.sizeQty}>({s.quantity})</span>
                            </span>
                          ))}
                        </div>

                        <div className={styles.cardActionRow}>
                          <span className={styles.quickReserveLabel}>
                            <span>View & Reserve</span>
                            <Symbol name="arrow_forward" size={14} />
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyFeed}>
                <Symbol name="storefront" size={40} />
                <h3 className={styles.emptyTitle}>No Pieces in this Category</h3>
                <p className={styles.emptyText}>
                  We are updating our rack inventory with freshly finished pieces. Please check back shortly or explore All Styles.
                </p>
                {selectedRackCategory !== 'All' && (
                  <button
                    type="button"
                    className={styles.filterPill}
                    style={{ marginTop: '8px' }}
                    onClick={() => setSelectedRackCategory('All')}
                  >
                    <span>View All Styles</span>
                  </button>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* ── View 2: Bespoke Lookbook (Pinterest Masonry) ── */}
      {viewMode === 'lookbook' && (
        <>
          {/* Horizontal Apple Pill Filter Bar */}
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

              {catalogues.map((cat) => {
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

                      <span className={styles.pinAlbumBadge}>{photo.albumTitle}</span>

                      <div
                        className={styles.pinHoverAction}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSewThisLookbook(photo);
                        }}
                      >
                        <WhatsappIcon size={14} />
                        <span>Request on WhatsApp</span>
                      </div>

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
                  We are currently adding new designs to this collection. Please check back soon or browse All Looks.
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
        </>
      )}

      {/* ── Modal: Showroom Rack Quick-View & Ensemble Styling ── */}
      {selectedRackItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRackItem(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedRackItem.name}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedRackItem(null)}
              aria-label="Close Preview"
            >
              <Symbol name="close" size={18} />
            </button>

            <div className={styles.modalImgFrame}>
              {selectedRackItem.imageUrl ? (
                <img
                  src={selectedRackItem.imageUrl}
                  alt={selectedRackItem.name}
                  className={styles.modalImg}
                />
              ) : (
                <div className={styles.modalPlaceholder}>
                  <Symbol name="checkroom" size={54} />
                  <span>{selectedRackItem.category}</span>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalMetaRow}>
                <span className={styles.categoryBadge}>{selectedRackItem.category}</span>
                <span className={styles.modalStudioSign}>{shopName}</span>
              </div>

              <h2 className={styles.modalTitle}>{selectedRackItem.name}</h2>
              <div className={styles.modalPriceTag}>
                {formatCurrency(selectedRackItem.price, shopCurrency)}
              </div>

              {(selectedRackItem.fabric || selectedRackItem.color) && (
                <div className={styles.modalSpecsRow}>
                  {selectedRackItem.fabric && (
                    <span className={styles.specChip}>
                      <strong>Fabric:</strong> {selectedRackItem.fabric}
                    </span>
                  )}
                  {selectedRackItem.color && (
                    <span className={styles.specChip}>
                      <strong>Color:</strong> {selectedRackItem.color}
                    </span>
                  )}
                </div>
              )}

              {/* Sizing Selection on Rack */}
              <div className={styles.ensembleSection}>
                <h4 className={styles.sectionHeading}>Select Available Size on Rack:</h4>
                <div className={styles.sizeSelectGrid}>
                  {selectedRackItem.sizes.map((s) => {
                    const isOutOfStock = s.quantity <= 0;
                    const isSelected = selectedSize === s.size;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isOutOfStock}
                        className={`${styles.sizeSelectBtn} ${isSelected ? styles.sizeSelectBtnActive : ''} ${
                          isOutOfStock ? styles.sizeSelectBtnDisabled : ''
                        }`}
                        onClick={() => setSelectedSize(s.size)}
                      >
                        <span className={styles.sizeSelectLabel}>{s.size}</span>
                        <span className={styles.sizeSelectStock}>
                          {isOutOfStock ? 'Sold out' : `${s.quantity} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style With Accessories (Accessory Ensemble Pairing) */}
              {itemAccessories.length > 0 && (
                <div className={styles.ensembleSection}>
                  <div className={styles.sectionHeaderRow}>
                    <h4 className={styles.sectionHeading}>Style With / Complete the Look:</h4>
                    <span className={styles.sectionSub}>Optional atelier accessories</span>
                  </div>

                  <div className={styles.accessoryList}>
                    {itemAccessories.map((acc) => {
                      const isChecked = selectedAccessoryIds.has(acc.id);

                      return (
                        <div
                          key={acc.id}
                          className={`${styles.accessoryCard} ${isChecked ? styles.accessoryCardActive : ''}`}
                          onClick={() => toggleAccessory(acc.id)}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                        >
                          <div className={styles.accessoryCheck}>
                            {isChecked && <Symbol name="check" size={14} />}
                          </div>

                          <div className={styles.accessoryBody}>
                            <div className={styles.accessoryTitleRow}>
                              <span className={styles.accessoryName}>{acc.name}</span>
                              <span className={styles.accessoryPrice}>
                                +{formatCurrency(acc.price, shopCurrency)}
                              </span>
                            </div>
                            {acc.color && <span className={styles.accessoryMeta}>{acc.color}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ensemble Subtotal Banner */}
              <div className={styles.ensembleSummaryBanner}>
                <div className={styles.ensembleSummaryLeft}>
                  <span className={styles.ensembleTotalLabel}>Ensemble Total:</span>
                  {selectedAccessoryIds.size > 0 && (
                    <span className={styles.ensembleBreakdown}>
                      Garment + {selectedAccessoryIds.size} {selectedAccessoryIds.size === 1 ? 'accessory' : 'accessories'}
                    </span>
                  )}
                </div>
                <span className={styles.ensembleTotalValue}>
                  {formatCurrency(ensembleTotal, shopCurrency)}
                </span>
              </div>

              <div className={styles.modalActions}>
                {shopPhone ? (
                  <button
                    type="button"
                    className={styles.sewThisBtn}
                    onClick={handleOrderRackItemWhatsApp}
                  >
                    <WhatsappIcon size={20} />
                    <span>Reserve & Order on WhatsApp</span>
                  </button>
                ) : (
                  <div className={styles.sharePinBtn} style={{ cursor: 'default', opacity: 0.8 }}>
                    <span>Contact shop directly to reserve this garment</span>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.sharePinBtn}
                  onClick={() =>
                    handleShareLink(
                      `${window.location.origin}/catalogue/${shopSlug}?view=rack&item=${selectedRackItem.id}`,
                      `${selectedRackItem.name} at ${shopName}`
                    )
                  }
                >
                  <Symbol name={copiedLink ? 'check' : 'share'} size={16} />
                  <span>{copiedLink ? 'Showroom Link Copied!' : 'Share Garment Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Bespoke Lookbook Pin Preview ── */}
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
                <span className={styles.modalStudioSign}>{shopName}</span>
              </div>

              <p className={styles.modalInstructions}>
                Love this bespoke design? Send it directly on WhatsApp to confirm custom measurements, fabric selection, and order delivery dates.
              </p>

              <div className={styles.modalActions}>
                {shopPhone ? (
                  <button
                    type="button"
                    className={styles.sewThisBtn}
                    onClick={() => handleSewThisLookbook(selectedPhoto)}
                  >
                    <WhatsappIcon size={20} />
                    <span>Sew This For Me on WhatsApp</span>
                  </button>
                ) : (
                  <div className={styles.sharePinBtn} style={{ cursor: 'default', opacity: 0.8 }}>
                    <span>Contact shop directly to request this garment</span>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.sharePinBtn}
                  onClick={() =>
                    handleShareLink(
                      `${window.location.origin}/catalogue/${shopSlug}?album=${selectedPhoto.catalogueId}`,
                      `${shopName} Lookbook`
                    )
                  }
                >
                  <Symbol name={copiedLink ? 'check' : 'share'} size={16} />
                  <span>{copiedLink ? 'Collection Link Copied!' : 'Share Collection Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Symbol name="content_cut" size={16} />
            <span>{shopName}</span>
          </div>
          <p className={styles.footerNote}>
            Powered by {APP_CONFIG.name} · Atelier Showroom & Bespoke Fashion Operating System
          </p>
        </div>
      </footer>
    </div>
  );
}
