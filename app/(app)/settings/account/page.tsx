'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import Button from '@/components/ui/Button/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import AppearanceToggle from '@/components/ui/AppearanceToggle/AppearanceToggle';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ExportDataButton, AccountDangerZone } from '@/components/settings/AccountDangerZone';
import PushNotificationToggle from '../_components/PushNotificationToggle';
import { compressImage } from '@/lib/compressImage';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import styles from './page.module.css';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isOwner, updateAvatar } = useAuth();
  const { currentShop } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !user?.uid) return;
    setUploadingAvatar(true);
    try {
      const file = await compressImage(rawFile, { maxDimension: 512 });
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.uid}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await updateAvatar(avatarUrl);
      showToast('Profile picture updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setConfirmRemoveAvatar(false);
    await updateAvatar('');
    showToast('Profile picture removed', 'success');
  };

  return (
    <PageLayout width="narrow" header={<TopBar title="Your Account" showBack={!isDesktop} onBack={() => router.push("/settings")} />}>
      <div className={styles.identityStrip}>
        <Avatar name={user?.name || 'Owner'} imageUrl={user?.avatarUrl} size="lg" />
        <div className={styles.identityText}>
          <span className={styles.identityName}>{user?.name}</span>
          <span className={styles.identityRole}>{user?.role} Account</span>
        </div>
      </div>
      <p className={styles.readonlyEmail}>{user?.email}</p>

      <div className={styles.groupCard}>
        <AppearanceToggle />
      </div>

      <div className={styles.card}>
        {FEATURE_FLAGS.profilePictures && (
          <>
            <label className={styles.uploadBtn}>
              <input type="file" accept="image/*" hidden onChange={handleUploadAvatar} />
              <Symbol name={uploadingAvatar ? 'progress_activity' : 'upload'} size={18} />
              {uploadingAvatar ? 'Uploading…' : user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </label>
            {user?.avatarUrl && (
              <Button variant="danger" onClick={() => setConfirmRemoveAvatar(true)}>Remove Photo</Button>
            )}
          </>
        )}
        <PushNotificationToggle />
        {FEATURE_FLAGS.dataExport && <ExportDataButton shopName={currentShop?.name || 'shop'} />}
      </div>

      <AccountDangerZone isOwner={isOwner} onClosingProfile={() => router.push('/settings')} />

      <ConfirmDialog
        isOpen={confirmRemoveAvatar}
        onClose={() => setConfirmRemoveAvatar(false)}
        onConfirm={handleRemoveAvatar}
        title="Remove your profile picture?"
        description="Your initials will be shown instead."
        confirmLabel="Remove"
      />
    </PageLayout>
  );
}
