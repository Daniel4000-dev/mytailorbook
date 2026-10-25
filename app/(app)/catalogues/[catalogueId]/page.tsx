'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { StyleCatalogue, StyleCataloguePhoto, Customer } from '@/lib/types';
import {
  getCataloguesAction,
  addCataloguePhotoAction,
  deleteCataloguePhotoAction,
  deleteCatalogueAction,
} from '@/app/actions/catalogues';
import { compressImage } from '@/lib/compressImage';
import { getWhatsAppLink } from '@/lib/formatters';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';

export default function CatalogueDetailPage() {
  const { catalogueId } = useParams() as { catalogueId: string };
  const { currentShop, customers } = useData();
  const router = useRouter();
  const { showToast } = useToast();

  const [catalogue, setCatalogue] = useState<StyleCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Sheets and Dialogs state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [inspectedPhoto, setInspectedPhoto] = useState<StyleCataloguePhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentShop) return;
    getCataloguesAction(currentShop.id)
      .then((res) => {
        const cat = res.find((c) => c.id === catalogueId);
        setCatalogue(cat || null);
        setLoading(false);
      })
      .catch((err) => {
        showToast(err.message, 'error');
        setLoading(false);
      });
  }, [currentShop, catalogueId, showToast]);

  // Smart case-insensitive matching between album title and customer preferredStyles
  const matchingCustomers = useMemo(() => {
    if (!catalogue?.title || !customers || customers.length === 0) return [];
    const catTitleLower = catalogue.title.toLowerCase().trim();
    const catWords = catTitleLower.split(/[\s,&/-]+/).filter((w) => w.length > 2);

    return customers.filter((c) => {
      if (!c.preferredStyles || c.preferredStyles.length === 0) return false;
      return c.preferredStyles.some((pref) => {
        const prefLower = pref.toLowerCase().trim();
        if (catTitleLower.includes(prefLower) || prefLower.includes(catTitleLower)) return true;
        return catWords.some((w) => prefLower.includes(w));
      });
    });
  }, [catalogue?.title, customers]);

  // Multi-photo batch upload with client-side compression
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !currentShop || !catalogue) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const compressed = await compressImage(file, { maxDimension: 1200 });
        const ext = compressed.name.split('.').pop() || 'jpg';
        const path = `${currentShop.id}/catalogue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('portfolio-photos')
          .upload(path, compressed, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error(uploadError.message);

        const url = supabase.storage.from('portfolio-photos').getPublicUrl(path).data.publicUrl;
        await addCataloguePhotoAction(catalogue.id, url);
        successCount++;
      } catch (err: any) {
        console.error('Error uploading photo:', err);
      }
    }

    if (successCount > 0) {
      showToast(`Added ${successCount} inspiration ${successCount === 1 ? 'photo' : 'photos'}!`, 'success');
      const updated = await getCataloguesAction(currentShop.id);
      setCatalogue(updated.find((c) => c.id === catalogueId) || null);
    } else {
      showToast('Could not upload photos. Please check your connection.', 'error');
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Delete single photo
  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setDeleting(true);
    try {
      await deleteCataloguePhotoAction(photoToDelete);
      setCatalogue((prev) =>
        prev ? { ...prev, photos: prev.photos?.filter((p) => p.id !== photoToDelete) } : null
      );
      if (inspectedPhoto?.id === photoToDelete) {
        setInspectedPhoto(null);
      }
      showToast('Photo removed from album', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
      setPhotoToDelete(null);
    }
  };

  // Delete entire album
  const confirmDeleteAlbum = async () => {
    setDeleting(true);
    try {
      await deleteCatalogueAction(catalogueId);
      showToast('Album deleted', 'info');
      router.push('/catalogues');
    } catch (err: any) {
      showToast(err.message, 'error');
      setDeleting(false);
      setIsDeletingAlbum(false);
    }
  };

  // Direct order intake handoff
  const handleStartOrderWithPhoto = (photo: StyleCataloguePhoto) => {
    if (!catalogue) return;
    const styleQuery = encodeURIComponent(catalogue.title);
    const photoQuery = encodeURIComponent(photo.imageUrl);
    router.push(`/orders/new?style=${styleQuery}&styleRef=${photoQuery}`);
  };

  // Broadcast General WhatsApp message
  const handleGeneralBroadcast = () => {
    if (!currentShop?.slug || !catalogue) {
      showToast('Please set your studio URL slug first', 'info');
      router.push('/settings/studio');
      return;
    }
    const url = `https://mytailorbook.com/catalogue/${currentShop.slug}?album=${catalogue.id}`;
    const text = `Good day! Check out our freshly curated ${catalogue.title} inspirations. Let us know which design you love and we will craft it for you: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowBroadcast(false);
  };

  // Individual Client WhatsApp Outreach
  const handleCustomerOutreach = (customer: Customer) => {
    if (!currentShop?.slug || !catalogue) return;
    const url = `https://mytailorbook.com/catalogue/${currentShop.slug}?album=${catalogue.id}`;
    const message = `Good day Chief ${customer.fullName}! We just updated our atelier with new ${catalogue.title} inspirations that match your style profile. Take a look here: ${url}`;
    const link = getWhatsAppLink(customer.whatsappNumber, message);
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <TopBar title="Loading Album..." onBack={() => router.push('/catalogues')} />
        <div className={styles.content}>
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} width="100%" height="180px" borderRadius="var(--sf-radius-md)" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!catalogue) {
    return (
      <div className={styles.container}>
        <TopBar title="Album Not Found" onBack={() => router.push('/catalogues')} />
        <div className={styles.content}>
          <EmptyState
            icon={<Symbol name="photo_library" size={40} />}
            title="Album Not Found"
            description="This album may have been deleted or moved."
            action={{ label: 'Return to Catalogues', onClick: () => router.push('/catalogues') }}
          />
        </div>
      </div>
    );
  }

  const photos = catalogue.photos || [];

  return (
    <div className={styles.container}>
      <TopBar
        title={catalogue.title}
        onBack={() => router.push('/catalogues')}
        rightAction={
          <button
            type="button"
            className={styles.headerDeleteBtn}
            onClick={() => setIsDeletingAlbum(true)}
            title="Delete this album"
          >
            <Symbol name="delete" size={18} />
          </button>
        }
      />

      <div className={styles.content}>
        {/* Album Sub-Header & Actions */}
        <div className={styles.albumHeaderCard}>
          <div className={styles.albumMeta}>
            <span className={styles.albumCountBadge}>
              <Symbol name="collections" size={14} />
              <span>{photos.length} {photos.length === 1 ? 'inspiration look' : 'inspiration looks'}</span>
            </span>
            <p className={styles.albumTip}>
              Consult with walk-ins on this screen. Tap any photo to inspect or convert directly into a bespoke order cutting slip.
            </p>
          </div>

          <div className={styles.albumActions}>
            <button
              type="button"
              className={styles.broadcastActionBtn}
              onClick={() => setShowBroadcast(true)}
            >
              <Symbol name="campaign" size={18} />
              <span>Broadcast ({matchingCustomers.length})</span>
            </button>

            <button
              type="button"
              className={styles.uploadActionBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Symbol name="add_a_photo" size={18} />
              <span>
                {uploading
                  ? uploadProgress
                    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                    : 'Uploading...'
                  : 'Add Photos'}
              </span>
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Photos Masonry Grid */}
        {photos.length > 0 ? (
          <div className={styles.masonryGrid}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={styles.photoCard}
                onClick={() => setInspectedPhoto(photo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setInspectedPhoto(photo);
                  }
                }}
              >
                <img src={photo.imageUrl} alt={catalogue.title} className={styles.photoImg} />
                <div className={styles.photoOverlay}>
                  <button
                    type="button"
                    className={styles.quickOrderBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartOrderWithPhoto(photo);
                    }}
                    title="Start bespoke order with this style"
                  >
                    <Symbol name="content_cut" size={14} />
                    <span>Sew This</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickDeleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoToDelete(photo.id);
                    }}
                    title="Remove photo"
                  >
                    <Symbol name="delete" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <EmptyState
              icon={<Symbol name="add_a_photo" size={48} />}
              title="No Style Photos Yet"
              description="Upload showroom pictures, client fitting samples, or fabric inspiration to build this album. You can select multiple photos at once."
              action={{
                label: 'Add Inspiration Photos',
                onClick: () => fileInputRef.current?.click(),
              }}
            />
          </div>
        )}
      </div>

      {/* Photo Inspector BottomSheet */}
      <BottomSheet
        isOpen={Boolean(inspectedPhoto)}
        onClose={() => setInspectedPhoto(null)}
        title={catalogue.title}
      >
        {inspectedPhoto && (
          <div className={styles.inspectBody}>
            <div className={styles.inspectImgWrap}>
              <img
                src={inspectedPhoto.imageUrl}
                alt={catalogue.title}
                className={styles.inspectImg}
              />
            </div>

            <div className={styles.inspectActions}>
              <button
                type="button"
                className={styles.inspectPrimaryOrderBtn}
                onClick={() => handleStartOrderWithPhoto(inspectedPhoto)}
              >
                <Symbol name="content_cut" size={18} />
                <span>Start Bespoke Order With This Style</span>
              </button>

              <div className={styles.inspectSecondaryRow}>
                <button
                  type="button"
                  className={styles.inspectShareBtn}
                  onClick={() => {
                    const text = `Look at this ${catalogue.title} design from our studio: ${inspectedPhoto.imageUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <Symbol name="share" size={16} />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  className={styles.inspectDeleteBtn}
                  onClick={() => setPhotoToDelete(inspectedPhoto.id)}
                >
                  <Symbol name="delete" size={16} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Broadcast Sheet */}
      <BottomSheet
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        title="Broadcast Style Album"
      >
        <div className={styles.broadcastBody}>
          <div className={styles.broadcastHeader}>
            <div className={styles.broadcastPill}>
              <Symbol name="person" size={14} />
              <span>{matchingCustomers.length} Matching VIP Clients</span>
            </div>
            <p className={styles.broadcastSubtitle}>
              Clients whose profile preferences match <strong>{catalogue.title}</strong> styles. Send a personalized preview to generate repeat commissions.
            </p>
          </div>

          {matchingCustomers.length > 0 ? (
            <div className={styles.clientList}>
              {matchingCustomers.map((cust) => (
                <div key={cust.id} className={styles.clientRow}>
                  <div className={styles.clientInfo}>
                    <Avatar name={cust.fullName} size="sm" />
                    <div>
                      <div className={styles.clientName}>{cust.fullName}</div>
                      <div className={styles.clientPref}>
                        {cust.preferredStyles?.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.clientMessageBtn}
                    onClick={() => handleCustomerOutreach(cust)}
                  >
                    <Symbol name="chat" size={14} />
                    <span>Message</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noMatchBox}>
              <p>No client profiles currently have &quot;{catalogue.title}&quot; in their preferred styles list.</p>
              <p className={styles.noMatchSub}>
                You can still broadcast the link to all contacts via WhatsApp below.
              </p>
            </div>
          )}

          <div className={styles.broadcastActions}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleGeneralBroadcast}
            >
              <Symbol name="campaign" size={16} />
              <span>Share General Album on WhatsApp</span>
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Confirm Dialog: Single Photo Removal */}
      <ConfirmDialog
        isOpen={Boolean(photoToDelete)}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={confirmDeletePhoto}
        title="Remove Photo?"
        description="This inspiration photo will be removed from this album."
        confirmLabel="Remove"
        destructive={true}
        loading={deleting}
      />

      {/* Confirm Dialog: Album Deletion */}
      <ConfirmDialog
        isOpen={isDeletingAlbum}
        onClose={() => setIsDeletingAlbum(false)}
        onConfirm={confirmDeleteAlbum}
        title="Delete Entire Album?"
        description={`Are you sure you want to delete "${catalogue.title}" and its ${photos.length} photos? This cannot be undone.`}
        confirmLabel="Delete Album"
        destructive={true}
        loading={deleting}
      />
    </div>
  );
}
