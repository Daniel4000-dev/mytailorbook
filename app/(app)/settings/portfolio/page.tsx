'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { getPortfolioCurationPhotosAction, setPortfolioPhotoOverrideAction, type PortfolioCurationPhoto } from '@/app/actions';
import type { Shop } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import TemplatePicker, { TEMPLATE_DEFAULT_ACCENT, TEMPLATE_ACCENTS } from './_components/TemplatePicker';
import ReviewsSection from './_components/ReviewsSection';
import styles from './page.module.css';

const MIN_FOUNDED_YEAR = 1950;

export default function PortfolioCurationSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop } = useData();
  const { showToast } = useToast();

  const [photos, setPhotos] = useState<PortfolioCurationPhoto[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PortfolioCurationPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

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

  const load = useCallback(() => {
    if (!currentShop?.id) return;
    getPortfolioCurationPhotosAction(currentShop.id)
      .then((p) => {
        setPhotos(p);
        setIsLoaded(true);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Could not load portfolio photos', 'error');
        setIsLoaded(true);
      });
  }, [currentShop, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (updates: { hidden?: boolean; featured?: boolean; consentConfirmed?: boolean; caption?: string }) => {
    if (!activePhoto || !currentShop?.id) return;
    const reverted = activePhoto;
    const next = { ...activePhoto, ...updates };
    setActivePhoto(next);
    setPhotos((prev) => prev.map((p) => (p.url === activePhoto.url ? next : p)));
    try {
      await setPortfolioPhotoOverrideAction(currentShop.id, activePhoto.url, updates);
    } catch {
      showToast('Could not update this photo', 'error');
      // Roll the sheet's own state back too — otherwise its checkboxes
      // keep showing the failed optimistic value until closed/reopened.
      setActivePhoto(reverted);
      setPhotos((prev) => prev.map((p) => (p.url === reverted.url ? reverted : p)));
    }
  };

  const handleSaveCaption = () => handleToggle({ caption: captionDraft.trim() || undefined });

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
          showBack
          onBack={() => router.push('/settings')}
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

          <h3 className={styles.sectionTitle}>Photos</h3>
        </>
      )}

      <p className={styles.intro}>Choose which photos customers see on your public portfolio page.</p>

      {isLoaded && photos.length === 0 ? (
        <EmptyState
          icon={<Symbol name="photo_library" size={40} />}
          title="No photos yet"
          description="Completed orders with photos will appear here automatically."
        />
      ) : (
        <div className={styles.grid}>
          {photos.map((p) => (
            <button
              key={p.url}
              type="button"
              className={styles.card}
              onClick={() => {
                setActivePhoto(p);
                setCaptionDraft(p.caption || '');
              }}
            >
              <Image src={p.url} alt="" fill sizes="(max-width: 768px) 33vw, 200px" className={p.hidden ? styles.hiddenPhoto : ''} />
              {p.featured && <span className={styles.badge}>Featured</span>}
              {FEATURE_FLAGS.photoConsentTracking && !p.hidden && !p.consentConfirmed && <span className={styles.consentBadge}>Consent not confirmed</span>}
              {p.hidden && <span className={styles.hiddenOverlay}><Symbol name="visibility_off" size={20} /></span>}
            </button>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!activePhoto} onClose={() => setActivePhoto(null)} title="Photo Options">
        {activePhoto && (
          <div className={styles.sheetBody}>
            <Image src={activePhoto.url} alt="" width={800} height={600} className={styles.sheetPhoto} />
            <Input
              label="Caption (optional)"
              placeholder="e.g. Finished in 4 days, silk-lined bodice"
              value={captionDraft}
              maxLength={120}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onBlur={handleSaveCaption}
            />
            <label className={styles.toggleRow}>
              <span>
                <span className={styles.toggleLabel}>Feature this photo</span>
                <span className={styles.toggleHint}>Shows first on your public portfolio</span>
              </span>
              <input
                type="checkbox"
                checked={activePhoto.featured}
                onChange={(e) => handleToggle({ featured: e.target.checked })}
              />
            </label>
            <label className={styles.toggleRow}>
              <span>
                <span className={styles.toggleLabel}>Hide from portfolio</span>
                <span className={styles.toggleHint}>Stops showing publicly, stays in the order&apos;s history</span>
              </span>
              <input
                type="checkbox"
                checked={activePhoto.hidden}
                onChange={(e) => handleToggle({ hidden: e.target.checked })}
              />
            </label>
            {FEATURE_FLAGS.photoConsentTracking && (
              <label className={styles.toggleRow}>
                <span>
                  <span className={styles.toggleLabel}>Customer consented to public use</span>
                  <span className={styles.toggleHint}>Confirm you&apos;ve checked with the customer before this shows publicly</span>
                </span>
                <input
                  type="checkbox"
                  checked={activePhoto.consentConfirmed}
                  onChange={(e) => handleToggle({ consentConfirmed: e.target.checked })}
                />
              </label>
            )}
          </div>
        )}
      </BottomSheet>
    </PageLayout>
  );
}
