'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { GARMENT_STYLES } from '@/lib/constants';
import { formatDate } from '@/lib/formatters';
import {
  getStylePhotoSubmissionsAction,
  createStylePhotoSubmissionAction,
  approveStylePhotoSubmissionAction,
  discardStylePhotoSubmissionAction,
} from '@/app/actions';
import type { StylePhotoSubmission } from '@/lib/types';
import styles from './page.module.css';

export default function StyleDetailPage() {
  const params = useParams<{ styleName: string }>();
  const styleName = decodeURIComponent(params.styleName);
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { currentShop } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<StylePhotoSubmission[]>([]);
  const [saved, setSaved] = useState<StylePhotoSubmission[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<StylePhotoSubmission | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const catalogEntry = GARMENT_STYLES.find((g) => g.name === styleName);

  const load = useCallback(() => {
    if (!currentShop?.id) return;
    getStylePhotoSubmissionsAction(currentShop.id, styleName).then(({ pending, saved }) => {
      setPending(pending);
      setSaved(saved);
      setIsLoaded(true);
    });
  }, [currentShop, styleName]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentShop?.id || !user) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/${encodeURIComponent(styleName)}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('style-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const photoUrl = supabase.storage.from('style-photos').getPublicUrl(path).data.publicUrl;
      await createStylePhotoSubmissionAction(currentShop.id, styleName, path, photoUrl, user.uid, user.name);
      showToast('Photo added — waiting on approval', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApprove = async (submission: StylePhotoSubmission) => {
    setBusyId(submission.id);
    try {
      await approveStylePhotoSubmissionAction(submission.id, user!.uid);
      showToast('Approved — now in your outreach gallery', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not approve photo', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDiscard = async () => {
    if (!confirmDiscard) return;
    const submission = confirmDiscard;
    setConfirmDiscard(null);
    setBusyId(submission.id);
    try {
      await discardStylePhotoSubmissionAction(submission.id, submission.storagePath);
      showToast('Photo removed', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove photo', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageLayout width="narrow" header={<TopBar title={styleName} showBack onBack={() => router.push('/styles')} />}>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />

      <div className={styles.uploadCard} onClick={() => fileInputRef.current?.click()}>
        {catalogEntry && (
          <div className={styles.catalogPhoto}>
            <img src={catalogEntry.photoUrl} alt="" />
          </div>
        )}
        <div className={styles.uploadAction}>
          <Symbol name={uploading ? 'progress_activity' : 'add_a_photo'} size={22} />
          <span>{uploading ? 'Uploading…' : 'Add a photo for this style'}</span>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Pending Review {pending.length > 0 && `(${pending.length})`}</h3>
        {!isLoaded ? (
          <p className={styles.hint}>Loading…</p>
        ) : pending.length === 0 ? (
          <p className={styles.hint}>Nothing waiting on approval right now.</p>
        ) : (
          <div className={styles.photoGrid}>
            {pending.map((s) => {
              // A self-correcting display label (worst case it's off by the
              // gap between renders, and heals on the next one) — reading
              // "now" here is the whole point, not a side effect to guard
              // against.
              // eslint-disable-next-line react-hooks/purity
              const daysLeft = 10 - Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              return (
              <div key={s.id} className={styles.photoCard}>
                <div className={styles.photoWrap}>
                  <img src={s.photoUrl} alt="" />
                  <span className={`${styles.expiryTag} ${daysLeft <= 3 ? styles.expiryTagSoon : ''}`}>
                    {daysLeft <= 0 ? 'Expires today' : `${daysLeft}d left`}
                  </span>
                </div>
                <p className={styles.meta}>
                  {s.uploadedByName} · {formatDate(s.createdAt)}
                </p>
                <div className={styles.actions}>
                  {isOwner && (
                    <button
                      type="button"
                      className={styles.approveBtn}
                      disabled={busyId === s.id}
                      onClick={() => handleApprove(s)}
                    >
                      <Symbol name="check" size={16} /> Approve
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.discardBtn}
                    disabled={busyId === s.id}
                    onClick={() => setConfirmDiscard(s)}
                  >
                    <Symbol name="close" size={16} /> Discard
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {isOwner && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Saved for Outreach {saved.length > 0 && `(${saved.length})`}</h3>
          {isLoaded && saved.length === 0 ? (
            <p className={styles.hint}>
              Approve a photo above to build your outreach gallery for {styleName}.
            </p>
          ) : (
            <div className={styles.photoGrid}>
              {saved.map((s) => (
                <div key={s.id} className={styles.photoCard}>
                  <div className={styles.photoWrap}>
                    <img src={s.photoUrl} alt="" />
                  </div>
                  <p className={styles.meta}>Approved {formatDate(s.savedAt || s.createdAt)}</p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.discardBtn}
                      disabled={busyId === s.id}
                      onClick={() => setConfirmDiscard(s)}
                    >
                      <Symbol name="close" size={16} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={!!confirmDiscard}
        onClose={() => setConfirmDiscard(null)}
        onConfirm={handleDiscard}
        title={confirmDiscard?.status === 'saved' ? 'Remove this photo?' : 'Discard this photo?'}
        description="This can't be undone."
        confirmLabel={confirmDiscard?.status === 'saved' ? 'Remove' : 'Discard'}
      />
    </PageLayout>
  );
}
