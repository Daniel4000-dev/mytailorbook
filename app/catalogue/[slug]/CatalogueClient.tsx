'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StyleCatalogue } from '@/lib/types';
import styles from './page.module.css';

export default function CatalogueClient({ shopName, logoUrl, catalogues, shopPhone }: { shopName: string, logoUrl: string, catalogues: StyleCatalogue[], shopPhone?: string }) {
  const searchParams = useSearchParams();
  const initialAlbumId = searchParams.get('album');
  
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(initialAlbumId);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Update active album if URL changes
  useEffect(() => {
    if (initialAlbumId) {
      setActiveAlbumId(initialAlbumId);
    }
  }, [initialAlbumId]);

  const activeAlbum = catalogues.find(c => c.id === activeAlbumId);

  const handleSewThis = () => {
    if (!shopPhone || !selectedPhoto) return;
    const text = `Hi ${shopName}! I saw this style in your catalogue and I'd love to get something similar made for me. Here is the picture: ${selectedPhoto}`;
    window.open(`https://wa.me/${shopPhone.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {logoUrl ? <img src={logoUrl} alt={shopName} className={styles.logo} /> : <div className={styles.logoPlaceholder}>{shopName.charAt(0)}</div>}
        <div className={styles.headerText}>
          <h1>{shopName}</h1>
          <p className={styles.tagline}>Style Inspiration Catalogue</p>
          <p className={styles.instructions}>Browse our curated collections below. Tap any style you love to request it!</p>
        </div>
      </header>
      
      <div className={styles.content}>
        {activeAlbum ? (
          <div>
            <div className={styles.albumHeader}>
              <button className={styles.backBtn} onClick={() => setActiveAlbumId(null)}>← Back to Collections</button>
              <h2>{activeAlbum.title}</h2>
              <p className={styles.albumInstructions}>Tap a photo to send it to us.</p>
            </div>
            
            {activeAlbum.photos && activeAlbum.photos.length > 0 ? (
              <div className={styles.masonry}>
                {activeAlbum.photos.map(p => (
                  <div key={p.id} className={styles.photoItem} onClick={() => setSelectedPhoto(p.imageUrl)}>
                    <img src={p.imageUrl} alt="" />
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>This catalogue is currently empty.</p>
            )}
          </div>
        ) : (
          <div>
            <h2 className={styles.sectionTitle}>Explore Collections</h2>
            <div className={styles.grid}>
              {catalogues.map(cat => (
                <div key={cat.id} className={styles.card} onClick={() => setActiveAlbumId(cat.id)}>
                  <div className={styles.cardThumb}>
                    {cat.photos && cat.photos.length > 0 ? (
                      <img src={cat.photos[0].imageUrl} alt={cat.title} />
                    ) : (
                      <div className={styles.emptyThumb}>No photos</div>
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3>{cat.title}</h3>
                    <p>{cat.photos?.length || 0} styles</p>
                  </div>
                </div>
              ))}
              {catalogues.length === 0 && (
                <p className={styles.empty}>No catalogues available right now.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPhoto(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedPhoto(null)}>✕</button>
            <img src={selectedPhoto} alt="Selected Style" className={styles.modalImg} />
            <div className={styles.modalActions}>
              <button className={styles.sewBtn} onClick={handleSewThis}>
                Sew this for me (WhatsApp)
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className={styles.footer}>
        <p>Powered by MyTailorBook</p>
      </footer>
    </div>
  );
}
