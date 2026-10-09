'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import { StyleCatalogue } from '@/lib/types';
import { getCataloguesAction, addCataloguePhotoAction, deleteCataloguePhotoAction, deleteCatalogueAction } from '@/app/actions/catalogues';
import styles from './page.module.css';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

export default function CatalogueDetailPage() {
  const { catalogueId } = useParams() as { catalogueId: string };
  const { currentShop, customers } = useData();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [catalogue, setCatalogue] = useState<StyleCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentShop) return;
    getCataloguesAction(currentShop.id)
      .then(res => {
        const cat = res.find(c => c.id === catalogueId);
        setCatalogue(cat || null);
        setLoading(false);
      })
      .catch(err => {
        showToast(err.message, 'error');
        setLoading(false);
      });
  }, [currentShop, catalogueId, showToast]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentShop || !catalogue) return;
    
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/catalogue_${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      
      const url = supabase.storage.from('portfolio-photos').getPublicUrl(path).data.publicUrl;
      
      await addCataloguePhotoAction(catalogue.id, url);
      // Reload
      const updated = await getCataloguesAction(currentShop.id);
      setCatalogue(updated.find(c => c.id === catalogueId) || null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Remove this photo?')) return;
    try {
      await deleteCataloguePhotoAction(photoId);
      setCatalogue(prev => prev ? { ...prev, photos: prev.photos?.filter(p => p.id !== photoId) } : null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCatalogue = async () => {
    if (!confirm('Delete this entire catalogue? This cannot be undone.')) return;
    try {
      await deleteCatalogueAction(catalogueId);
      router.push('/catalogues');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const matchingCustomers = customers.filter(c => c.preferredStyles?.includes(catalogue?.title || ''));

  const handleBroadcast = () => {
    if (!currentShop?.slug || !catalogue) {
      showToast('Set your public profile URL first', 'error');
      return;
    }
    const url = `https://mytailorbook.com/catalogue/${currentShop.slug}?album=${catalogue.id}`;
    const text = `Check out some new ${catalogue.title} inspirations I just put together! Let me know if you see something you like: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowBroadcast(false);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!catalogue) return <div className={styles.loading}>Catalogue not found.</div>;

  return (
    <div className={styles.container}>
      <TopBar title={catalogue.title} onBack={() => router.push('/catalogues')} />
      
      <div className={styles.content}>
        <div className={styles.actions}>
          <button className={styles.broadcastBtn} onClick={() => setShowBroadcast(true)}>
            <Symbol name="campaign" size={18} /> Broadcast to Audience
          </button>
          
          <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Symbol name="add_a_photo" size={18} /> {uploading ? 'Uploading...' : 'Add Inspiration'}
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
        </div>

        {catalogue.photos && catalogue.photos.length > 0 ? (
          <div className={styles.masonry}>
            {catalogue.photos.map(p => (
              <div key={p.id} className={styles.photoItem}>
                <img src={p.imageUrl} alt="" />
                <button className={styles.deletePhotoBtn} onClick={() => handleDeletePhoto(p.id)}>
                  <Symbol name="delete" size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={<Symbol name="image" size={40} />}
            title="Empty Album"
            description="Tap 'Add Inspiration' above to start adding photos to this album."
          />
        )}

        <button className={styles.deleteAlbumBtn} onClick={handleDeleteCatalogue}>
          Delete Catalogue
        </button>
      </div>

      {showBroadcast && (
        <div className={styles.scrim} onClick={() => setShowBroadcast(false)}>
          <div className={styles.bottomSheet} onClick={e => e.stopPropagation()}>
            <h3>Broadcast to Audience</h3>
            <p className={styles.sheetSubtitle}>
              You have <strong>{matchingCustomers.length}</strong> customers whose profile says they prefer <strong>{catalogue.title}</strong> styles.
            </p>
            {matchingCustomers.length > 0 && (
              <div className={styles.customerList}>
                {matchingCustomers.slice(0, 5).map(c => (
                  <div key={c.id} className={styles.customerRow}>{c.fullName}</div>
                ))}
                {matchingCustomers.length > 5 && <div className={styles.customerRow}>...and {matchingCustomers.length - 5} more</div>}
              </div>
            )}
            <button className={styles.sendBroadcastBtn} onClick={handleBroadcast}>
              <Symbol name="send" size={16} /> Send via WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
