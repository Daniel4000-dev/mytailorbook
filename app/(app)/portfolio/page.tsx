'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import TemplatePicker from '../settings/portfolio/_components/TemplatePicker';
import ReviewsSection from '../settings/portfolio/_components/ReviewsSection';
import OutfitBuilder from '../settings/portfolio/_components/OutfitBuilder';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import { getPublicShopPortfolio } from '@/app/public-actions';
import type { PublicPortfolio } from '@/app/public-actions';
import {
  syncAutoPortfolioPhotosAction,
  addManualPortfolioPhotoAction,
  deletePortfolioPhotoAction,
  getPortfolioPoolAction,
  getPortfolioOutfitsAction,
  deleteOutfitAction,
  type PortfolioPoolPhoto,
  type PortfolioOutfit,
} from '../settings/portfolio/actions';
import { compressImage } from '@/lib/compressImage';
import { createClient } from '@/lib/supabase/client';
import { getCanonicalPublicUrl } from '@/lib/routes';
import styles from './page.module.css';

const MIN_FOUNDED_YEAR = 1950;

type PortfolioTab = 'preview' | 'outfits' | 'pool' | 'profile';

export default function OwnPortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as PortfolioTab) || 'preview';
  const shouldOpenNew = searchParams.get('new') === '1';

  const { isOwner, loading: authLoading, user } = useAuth();
  const { currentShop, updateShop } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<PortfolioTab>(initialTab);
  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(() => {
    if (typeof window === 'undefined' || !currentShop?.slug) return null;
    try {
      const stored = localStorage.getItem(`mtb_portfolio_${currentShop.slug}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!portfolio);

  // Management State
  const [pool, setPool] = useState<PortfolioPoolPhoto[]>([]);
  const [outfits, setOutfits] = useState<PortfolioOutfit[]>([]);
  const [builderOpen, setBuilderOpen] = useState(shouldOpenNew);
  const [editingOutfit, setEditingOutfit] = useState<PortfolioOutfit | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Story & Profile State
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [foundedYear, setFoundedYear] = useState('');

  const [prevShopId, setPrevShopId] = useState<string | null>(null);
  if (currentShop && currentShop.id !== prevShopId) {
    setPrevShopId(currentShop.id);
    setTagline(currentShop.portfolioSettings?.tagline || '');
    setBio(currentShop.portfolioSettings?.bio || '');
    setFoundedYear(currentShop.portfolioSettings?.foundedYear ? String(currentShop.portfolioSettings.foundedYear) : '');
  }

  const loadData = useCallback(async () => {
    if (!currentShop?.id || !currentShop?.slug) return;
    try {
      await syncAutoPortfolioPhotosAction(currentShop.id);
      const [pubRes, poolPhotos, outfitList] = await Promise.all([
        getPublicShopPortfolio(currentShop.slug),
        getPortfolioPoolAction(currentShop.id),
        getPortfolioOutfitsAction(currentShop.id),
      ]);
      if (pubRes) {
        setPortfolio(pubRes);
        try {
          localStorage.setItem(`mtb_portfolio_${currentShop.slug}`, JSON.stringify(pubRes));
        } catch {}
      }
      setPool(poolPhotos || []);
      setOutfits(outfitList || []);
    } catch {
      // Retain existing state
    } finally {
      setLoading(false);
    }
  }, [currentShop?.id, currentShop?.slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = () => {
    const slug = currentShop?.slug || 'savile-row';
    const url = getCanonicalPublicUrl(`/studio/${slug}`);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showToast('Storefront link copied to clipboard!', 'success');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleShareWhatsApp = () => {
    const slug = currentShop?.slug || 'savile-row';
    const shopName = currentShop?.name || 'our shop';
    const url = getCanonicalPublicUrl(`/studio/${slug}`);
    const text = `Greetings from ${shopName}! Explore our signature bespoke collections, handcrafted commissions, and creation stories:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleUploadPoolPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0 || !currentShop?.id || !user) return;
    setUploading(true);
    try {
      const supabase = createClient();
      for (const rawFile of Array.from(rawFiles)) {
        const file = await compressImage(rawFile);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${currentShop.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        const imageUrl = supabase.storage.from('portfolio-photos').getPublicUrl(path).data.publicUrl;
        await addManualPortfolioPhotoAction(currentShop.id, imageUrl);
      }
      await loadData();
      showToast('Photos added to your workshop vault', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photo: PortfolioPoolPhoto) => {
    if (photo.usedInOutfitIds.length > 0) {
      showToast('Remove this photo from its outfit(s) first', 'error');
      return;
    }
    try {
      await deletePortfolioPhotoAction(photo.id);
      setPool((prev) => prev.filter((p) => p.id !== photo.id));
      showToast('Photo removed', 'success');
    } catch {
      showToast('Could not remove this photo', 'error');
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    try {
      await deleteOutfitAction(outfitId);
      setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
      loadData();
      showToast('Outfit deleted', 'success');
    } catch {
      showToast('Could not delete this outfit', 'error');
    }
  };

  const handleSelectAccent = async (accent: string) => {
    try {
      await updateShop({ portfolioAccent: accent });
      loadData();
      showToast('Accent color updated', 'success');
    } catch {
      showToast('Could not change accent color', 'error');
    }
  };

  const handleSaveStory = async () => {
    if (!currentShop) return;
    const year = foundedYear.trim() ? parseInt(foundedYear, 10) : undefined;
    const currentYear = new Date().getFullYear();
    if (year !== undefined && (Number.isNaN(year) || year < MIN_FOUNDED_YEAR || year > currentYear)) {
      showToast(`Founded year must be between ${MIN_FOUNDED_YEAR} and ${currentYear}`, 'error');
      return;
    }
    try {
      await updateShop({
        portfolioSettings: {
          tagline: tagline.trim() || undefined,
          bio: bio.trim() || undefined,
          foundedYear: year,
        },
      });
      loadData();
      showToast('Portfolio story saved', 'success');
    } catch {
      showToast('Could not save your portfolio story', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className={styles.status}>
        <p>Loading your shop portfolio...</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={styles.status}>
        <p>Only the studio owner can manage this portfolio.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* ── Apple Liquid Glass Top Navigation Control Bar ── */}
      <FixedBottomPortal>
        <div className={styles.topFloatingBar}>
          <div className={styles.barLeftGroup}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => router.back()}
              aria-label="Back to Workshop"
            >
              <Symbol name="arrow_back" size={18} />
            </button>

            {/* Segmented Mode Selector */}
            <nav className={styles.tabNav} aria-label="Portfolio sections">
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Storefront
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'outfits' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('outfits')}
              >
                Outfits ({outfits.length})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'pool' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('pool')}
              >
                Photos ({pool.length})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Story & Look
              </button>
            </nav>
          </div>

          <div className={styles.barActions}>
            {activeTab === 'preview' && (
              <>
                <button
                  type="button"
                  className={styles.barActionBtn}
                  onClick={handleShareWhatsApp}
                  title="Share showcase on WhatsApp"
                >
                  <WhatsappIcon size={14} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className={`${styles.barActionBtn} ${styles.barActionPrimary}`}
                  onClick={handleShare}
                  title="Copy public storefront link"
                >
                  <Symbol name="share" size={13} />
                  <span>Copy Link</span>
                </button>
              </>
            )}

            {activeTab !== 'preview' && (
              <button
                type="button"
                className={`${styles.barActionBtn} ${styles.barActionPrimary}`}
                onClick={() => {
                  setEditingOutfit(undefined);
                  setBuilderOpen(true);
                }}
              >
                <Symbol name="add" size={13} />
                <span>+ Outfit</span>
              </button>
            )}
          </div>
        </div>
      </FixedBottomPortal>

      {/* ── TAB 1: LIVE STOREFRONT PREVIEW ── */}
      {activeTab === 'preview' && (
        <>
          {loading ? (
            <div className={styles.status}>
              <p>Loading your shop portfolio...</p>
            </div>
          ) : portfolio ? (
            <PortfolioView portfolio={portfolio} />
          ) : (
            <div className={styles.status}>
              <p>Could not load portfolio. Please check your connection and try again.</p>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: OUTFITS CURATION ── */}
      {activeTab === 'outfits' && (
        <main className={styles.manageContainer}>
          <div className={styles.manageHeader}>
            <div>
              <h2 className={styles.manageTitle}>Published Outfits</h2>
              <p className={styles.manageSubtitle}>
                Bespoke garments displayed on your public storefront. Tap any look to edit its angles or making-of sequence.
              </p>
            </div>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => {
                setEditingOutfit(undefined);
                setBuilderOpen(true);
              }}
            >
              <Symbol name="add" size={14} />
              <span>+ Add Look</span>
            </button>
          </div>

          {outfits.length === 0 ? (
            <div className={styles.emptyStateWrap}>
              <Symbol name="checkroom" size={36} />
              <h3 className={styles.emptyStateTitle}>No Outfits Published Yet</h3>
              <p className={styles.emptyStateSubtitle}>
                Add your first look from your phone gallery or past workshop commissions to showcase your craftsmanship to clients.
              </p>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => {
                  setEditingOutfit(undefined);
                  setBuilderOpen(true);
                }}
              >
                <Symbol name="add" size={14} />
                <span>Publish Your First Outfit</span>
              </button>
            </div>
          ) : (
            <div className={styles.outfitsGrid}>
              {outfits.map((outfit) => {
                const displayPhoto = outfit.photos.find((p) => p.kind === 'display');
                return (
                  <div
                    key={outfit.id}
                    className={styles.outfitCard}
                    onClick={() => {
                      setEditingOutfit(outfit);
                      setBuilderOpen(true);
                    }}
                  >
                    {displayPhoto ? (
                      <Image src={displayPhoto.imageUrl} alt={outfit.title || ''} fill sizes="250px" />
                    ) : (
                      <div className={styles.status} style={{ minHeight: '100%' }}>No photo</div>
                    )}
                    <button
                      type="button"
                      className={styles.deleteCardBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutfit(outfit.id);
                      }}
                      title="Delete outfit"
                      aria-label="Delete outfit"
                    >
                      <Symbol name="delete" size={14} />
                    </button>
                    <div className={styles.outfitCardFooter}>
                      <span className={styles.outfitCardTitle}>{outfit.title || 'Untitled Commission'}</span>
                      {outfit.storyModeEnabled && (
                        <span className={styles.outfitStoryBadge}>
                          <Symbol name="auto_awesome" size={10} />
                          Story
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── TAB 3: PHOTO VAULT / POOL ── */}
      {activeTab === 'pool' && (
        <main className={styles.manageContainer}>
          <div className={styles.manageHeader}>
            <div>
              <h2 className={styles.manageTitle}>Workshop Photo Vault</h2>
              <p className={styles.manageSubtitle}>
                Finished fitting photos and craft snapshots uploaded from phone or synced from completed orders.
              </p>
            </div>
            <label className={styles.primaryActionBtn} title="Upload photos directly">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleUploadPoolPhoto}
                disabled={uploading}
              />
              <Symbol name={uploading ? 'sync' : 'add_a_photo'} size={14} />
              <span>{uploading ? 'Uploading…' : '+ Upload Photos'}</span>
            </label>
          </div>

          {pool.length === 0 ? (
            <div className={styles.emptyStateWrap}>
              <Symbol name="photo_library" size={36} />
              <h3 className={styles.emptyStateTitle}>Your Photo Vault is Empty</h3>
              <p className={styles.emptyStateSubtitle}>
                Upload photos of your bespoke work, or mark orders Delivered in production to sync them automatically.
              </p>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Symbol name="add_a_photo" size={14} />
                <span>Upload Finished Photos</span>
              </button>
            </div>
          ) : (
            <div className={styles.poolGrid}>
              {pool.map((photo) => (
                <div key={photo.id} className={styles.poolCard}>
                  <Image src={photo.imageUrl} alt="" fill sizes="150px" />
                  {photo.usedInOutfitIds.length > 0 && (
                    <span className={styles.usedBadge}>In Outfit</span>
                  )}
                  {photo.usedInOutfitIds.length === 0 && (
                    <button
                      type="button"
                      className={styles.deleteCardBtn}
                      onClick={() => handleDeletePhoto(photo)}
                      title="Delete photo"
                      aria-label="Delete photo"
                    >
                      <Symbol name="delete" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── TAB 4: STUDIO PROFILE & LOOK ── */}
      {activeTab === 'profile' && currentShop && (
        <main className={styles.manageContainer}>
          <div className={styles.manageHeader}>
            <div>
              <h2 className={styles.manageTitle}>Studio Brand & Story</h2>
              <p className={styles.manageSubtitle}>
                Personalize your public storefront accent colors, shop biography, and client reviews.
              </p>
            </div>
          </div>

          <h3 className={styles.manageTitle} style={{ fontSize: '15px', marginBottom: '8px' }}>Accent Color Palette</h3>
          <TemplatePicker accent={currentShop.portfolioAccent} onSelectAccent={handleSelectAccent} />

          <h3 className={styles.manageTitle} style={{ fontSize: '15px', margin: '24px 0 8px' }}>Your Workshop Story</h3>
          <div className={styles.storyForm}>
            <Input
              label="Tagline"
              placeholder="e.g. Every stitch measured to you, cut by hand."
              value={tagline}
              maxLength={80}
              onChange={(e) => setTagline(e.target.value)}
            />
            <TextArea
              label="About your shop"
              placeholder="e.g. Started in a single room off Awolowo Road — today, a small team with one philosophy: nothing leaves the shop until it fits."
              value={bio}
              maxLength={400}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
            />
            <Input
              label="Founded year (optional)"
              type="number"
              placeholder="e.g. 2019"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
            />
            <button type="button" className={styles.primaryActionBtn} onClick={handleSaveStory}>
              Save Story
            </button>
          </div>

          <h3 className={styles.manageTitle} style={{ fontSize: '15px', margin: '32px 0 8px' }}>Client Reviews</h3>
          <ReviewsSection shopId={currentShop.id} />
        </main>
      )}

      {/* ── Dedicated Outfit Builder Sheet ── */}
      {currentShop && (
        <OutfitBuilder
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          shopId={currentShop.id}
          pool={pool}
          editingOutfit={editingOutfit}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
