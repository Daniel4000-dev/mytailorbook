'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import TemplatePicker, { TEMPLATE_DEFAULT_ACCENT, TEMPLATE_ACCENTS } from './_components/TemplatePicker';
import ReviewsSection from './_components/ReviewsSection';
import OutfitBuilder from './_components/OutfitBuilder';
import {
  syncAutoPortfolioPhotosAction,
  addManualPortfolioPhotoAction,
  deletePortfolioPhotoAction,
  getPortfolioPoolAction,
  getPortfolioOutfitsAction,
  deleteOutfitAction,
  type PortfolioPoolPhoto,
  type PortfolioOutfit,
} from './actions';
import type { Shop } from '@/lib/types';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

const MIN_FOUNDED_YEAR = 1950;

export default function PortfolioCurationSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pool, setPool] = useState<PortfolioPoolPhoto[]>([]);
  const [outfits, setOutfits] = useState<PortfolioOutfit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<PortfolioOutfit | undefined>(undefined);

  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [foundedYear, setFoundedYear] = useState('');

  // currentShop arrives asynchronously (SWR); seed the editable story
  // fields once it does. Adjusted during render (React's guidance for
  // deriving state from a changed value) rather than in an effect — same
  // pattern as ProductionBoard.tsx's prevUserRole sync.
  const [prevShopId, setPrevShopId] = useState<string | null>(null);
  if (currentShop && currentShop.id !== prevShopId) {
    setPrevShopId(currentShop.id);
    setTagline(currentShop.portfolioSettings.tagline || '');
    setBio(currentShop.portfolioSettings.bio || '');
    setFoundedYear(currentShop.portfolioSettings.foundedYear ? String(currentShop.portfolioSettings.foundedYear) : '');
  }

  const load = useCallback(async () => {
    if (!currentShop?.id) return;
    try {
      await syncAutoPortfolioPhotosAction(currentShop.id);
      const [poolPhotos, outfitList] = await Promise.all([
        getPortfolioPoolAction(currentShop.id),
        getPortfolioOutfitsAction(currentShop.id),
      ]);
      setPool(poolPhotos);
      setOutfits(outfitList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load your portfolio', 'error');
    } finally {
      setIsLoaded(true);
    }
  }, [currentShop, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !currentShop?.id || !user) return;
    setUploading(true);
    try {
      const file = await compressImage(rawFile);
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const imageUrl = supabase.storage.from('portfolio-photos').getPublicUrl(path).data.publicUrl;
      await addManualPortfolioPhotoAction(currentShop.id, imageUrl);
      await load();
      showToast('Photo added to your pool', 'success');
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
    } catch {
      showToast('Could not remove this photo', 'error');
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    try {
      await deleteOutfitAction(outfitId);
      setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
      load();
    } catch {
      showToast('Could not delete this outfit', 'error');
    }
  };

  const handleSelectTemplate = async (template: Shop['portfolioTemplate']) => {
    if (!currentShop) return;
    const fallbackAccent = TEMPLATE_DEFAULT_ACCENT[template];
    const stillValid = TEMPLATE_ACCENTS[template].some((a) => a.id === currentShop.portfolioAccent);
    try {
      await updateShop({ portfolioTemplate: template, portfolioAccent: stillValid ? currentShop.portfolioAccent : fallbackAccent });
    } catch {
      showToast('Could not change template', 'error');
    }
  };

  const handleSelectAccent = async (accent: string) => {
    try {
      await updateShop({ portfolioAccent: accent });
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
      showToast('Portfolio story saved', 'success');
    } catch {
      showToast('Could not save your portfolio story', 'error');
    }
  };

  return (
    <PageLayout
      width="narrow"
      header={
        <TopBar
          title="Manage Portfolio"
          showBack={!isDesktop}
          onBack={() => router.push(ROUTES.settings)}
          rightAction={
            currentShop && (
              <CircleIconButton
                icon={<Symbol name="open_in_new" size={18} />}
                onClick={() => window.open(`/studio/${currentShop.slug}`, '_blank')}
                ariaLabel="Preview my portfolio"
              />
            )
          }
        />
      }
    >
      {currentShop && (
        <>
          <h3 className={styles.sectionTitle}>Choose a Look</h3>
          <TemplatePicker
            template={currentShop.portfolioTemplate}
            accent={currentShop.portfolioAccent}
            onSelectTemplate={handleSelectTemplate}
            onSelectAccent={handleSelectAccent}
          />

          <h3 className={styles.sectionTitle}>Your Story</h3>
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
            <button type="button" className={styles.saveStoryBtn} onClick={handleSaveStory}>Save Story</button>
          </div>

          <h3 className={styles.sectionTitle}>Reviews</h3>
          <ReviewsSection shopId={currentShop.id} />

          <div className={styles.outfitsHeader}>
            <h3 className={styles.sectionTitle}>Outfits</h3>
            <button
              type="button"
              className={styles.newOutfitBtn}
              disabled={pool.length === 0}
              onClick={() => {
                setEditingOutfit(undefined);
                setBuilderOpen(true);
              }}
            >
              + New Outfit
            </button>
          </div>
          <p className={styles.intro}>
            An outfit is what visitors see as one gallery entry — pick photos from your pool below and tag their angles.
          </p>

          {isLoaded && outfits.length === 0 ? (
            <EmptyState
              icon={<Symbol name="checkroom" size={40} />}
              title="No outfits published yet"
              description="Build one from the photos in your pool below to add it to your public portfolio."
            />
          ) : (
            <div className={styles.outfitGrid}>
              {outfits.map((o) => {
                const cover = o.photos.find((p) => p.kind === 'display');
                return (
                  <button key={o.id} type="button" className={styles.outfitCard} onClick={() => { setEditingOutfit(o); setBuilderOpen(true); }}>
                    {cover ? (
                      <Image src={cover.imageUrl} alt="" fill sizes="200px" />
                    ) : (
                      <div className={styles.outfitCardEmpty} />
                    )}
                    <div className={styles.outfitCardFooter}>
                      <span className={styles.outfitCardTitle}>{o.title || 'Untitled outfit'}</span>
                      {o.storyModeEnabled && <span className={styles.storyBadge}>Story</span>}
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.deleteOutfitBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutfit(o.id);
                      }}
                    >
                      <Symbol name="delete" size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <h3 className={styles.sectionTitle}>Photo Pool</h3>
          <p className={styles.intro}>Every photo available to build outfits from — delivered orders add photos automatically, or upload your own.</p>

          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          <button type="button" className={styles.uploadBtn} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? 'Uploading…' : '+ Upload Photo'}
          </button>

          {isLoaded && pool.length === 0 ? (
            <EmptyState
              icon={<Symbol name="photo_library" size={40} />}
              title="No photos yet"
              description="Delivered orders with photos will appear here automatically, or upload one above."
            />
          ) : (
            <div className={styles.grid}>
              {pool.map((p) => (
                <div key={p.id} className={styles.poolCard}>
                  <Image src={p.imageUrl} alt="" fill sizes="(max-width: 768px) 33vw, 200px" />
                  {p.usedInOutfitIds.length > 0 && <span className={styles.badge}>In use</span>}
                  <button type="button" className={styles.poolDeleteBtn} onClick={() => handleDeletePhoto(p)} aria-label="Remove photo">
                    <Symbol name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {currentShop && (
        <OutfitBuilder
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          shopId={currentShop.id}
          pool={pool}
          editingOutfit={editingOutfit}
          onSaved={load}
        />
      )}
    </PageLayout>
  );
}
