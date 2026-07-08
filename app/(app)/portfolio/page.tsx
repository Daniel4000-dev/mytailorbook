'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import { FaBars, FaImage, FaXmark, FaCopy, FaLink, FaStore } from 'react-icons/fa6';
import { useSidebar } from '@/contexts/SidebarContext';
import { createClient } from '@/lib/supabase/client';
import { getPortfolioPhotosAction, addPortfolioPhotoAction, deletePortfolioPhotoAction } from '@/app/actions';
import type { PortfolioPhoto } from '@/lib/types';
import QRCode from 'qrcode';
import styles from './page.module.css';

export default function PortfolioPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { currentShop, updateShop, isLoaded } = useData();
  const { toggleMenu } = useSidebar();
  const { showToast } = useToast();

  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [publicUrl, setPublicUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentShop) {
      setTagline(currentShop.tagline || '');
      setBio(currentShop.bio || '');
      const url = `${window.location.origin}/studio/${currentShop.id}`;
      setPublicUrl(url);
      QRCode.toDataURL(url, { width: 160, margin: 1 }).then(setQrDataUrl).catch(() => {});
    }
  }, [currentShop]);

  useEffect(() => {
    if (currentShop) {
      getPortfolioPhotosAction(currentShop.id)
        .then(setPhotos)
        .finally(() => setPhotosLoaded(true));
    }
  }, [currentShop]);

  if (authLoading || !isLoaded) {
    return (
      <PageLayout
        header={
          <TopBar
            profileMode={{ greeting: 'Public Portfolio', name: user?.name || 'Owner', avatarInitials: user?.name ? user.name[0] : 'O' }}
            leftAction={
              <div className={styles.mobileOnly}>
                <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
              </div>
            }
          />
        }
      >
        <div className={styles.pageGrid} />
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sf-text-secondary)' }}>
          <h2>Access Denied</h2>
          <p>Only the studio owner can manage the public portfolio.</p>
        </div>
      </PageLayout>
    );
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateShop({ tagline: tagline || undefined, bio: bio || undefined });
      showToast('Portfolio profile updated', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentShop) return;
    setUploadingPhoto(true);
    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${currentShop.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from('portfolio-photos').getPublicUrl(path);
        const photo = await addPortfolioPhotoAction(currentShop.id, data.publicUrl);
        setPhotos((prev) => [...prev, photo]);
      }
      showToast(files.length > 1 ? `${files.length} photos added` : 'Photo added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (photo: PortfolioPhoto) => {
    if (!currentShop) return;
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    await deletePortfolioPhotoAction(photo.id, currentShop.id);
    const marker = '/portfolio-photos/';
    const markerIndex = photo.url.indexOf(marker);
    if (markerIndex !== -1) {
      const path = photo.url.slice(markerIndex + marker.length);
      const supabase = createClient();
      await supabase.storage.from('portfolio-photos').remove([path]);
    }
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={
        <TopBar
          profileMode={{ greeting: 'Public Portfolio', name: user?.name || 'Owner', avatarInitials: user?.name ? user.name[0] : 'O' }}
          leftAction={
            <div className={styles.mobileOnly}>
              <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
            </div>
          }
        />
      }
    >
      <div className={styles.container}>
        <p className={styles.introText}>
          This is your shop&apos;s public storefront — a shareable page showing off your best work and customer
          ratings, for attracting new customers. It has nothing to do with your existing customers&apos; orders.
        </p>

        {/* Shareable Link Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaLink className={styles.sectionIcon} /> Your Shareable Link
          </h3>
          <div className={styles.card}>
            <div className={styles.linkRow}>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Scan to view your portfolio" className={styles.linkQr} />
              )}
              <div className={styles.linkInfo}>
                <p className={styles.linkUrl}>{publicUrl}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    showToast('Link copied', 'success');
                  }}
                >
                  <FaCopy /> Copy Link
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaStore className={styles.sectionIcon} /> Studio Story
          </h3>
          <div className={styles.card}>
            <div className={styles.form}>
              <Input
                label="Tagline"
                placeholder="e.g. Bespoke agbada & senator wear since 2015"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={80}
              />
              <TextArea
                label="About Your Studio"
                placeholder="Tell prospective customers what makes your work special…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
              <Button variant="primary" size="sm" loading={savingProfile} onClick={handleSaveProfile} className={styles.submitBtn}>
                Save
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Photos */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaImage className={styles.sectionIcon} /> Featured Work
          </h3>
          <div className={styles.card}>
            {photosLoaded && photos.length === 0 && (
              <p className={styles.emptyText}>No photos yet — add a few examples of your best work.</p>
            )}
            <div className={styles.photoGrid}>
              {photos.map((photo) => (
                <div key={photo.id} className={styles.photoThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="Featured work" />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => handleRemovePhoto(photo)}
                    aria-label="Remove photo"
                  >
                    <FaXmark />
                  </button>
                </div>
              ))}
              <label className={styles.photoUploadBtn}>
                {uploadingPhoto ? '…' : '+'}
                <input type="file" accept="image/*" multiple hidden onChange={handleUploadPhoto} disabled={uploadingPhoto} />
              </label>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
