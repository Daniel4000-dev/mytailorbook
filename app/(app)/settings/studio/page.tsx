'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import Symbol from '@/components/ui/Symbol/Symbol';
import { compressImage } from '@/lib/compressImage';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';
import SettingsSkeleton from '../_components/SettingsSkeleton';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

export default function StudioSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop, isLoaded } = useData();
  const { showToast } = useToast();
  // Desktop's persistent left nav (see settings/layout.tsx) already
  // provides navigation — a "back" arrow that returns to the redirecting
  // overview page is redundant there, so it only shows on mobile.
  const isDesktop = useIsDesktop();

  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCurrency, setShopCurrency] = useState('NGN');
  const [savingShop, setSavingShop] = useState(false);

  // currentShop resolves asynchronously — sync the form once it actually
  // changes (first load, or switching shops) rather than only at first
  // mount, when it's often still undefined. Adjusted during render
  // (React's own guidance for deriving state from a changed prop) rather
  // than in an effect — same pattern used elsewhere in this codebase
  // (e.g. ProductionBoard's prevUserRole).
  const [syncedShopId, setSyncedShopId] = useState<string | undefined>(undefined);
  if (currentShop && currentShop.id !== syncedShopId) {
    setSyncedShopId(currentShop.id);
    setShopName(currentShop.name || '');
    setShopPhone(currentShop.phone || '');
    setShopAddress(currentShop.address || '');
    setShopCurrency(currentShop.currency || 'NGN');
  }

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);

  const handleSaveShop = async () => {
    setSavingShop(true);
    try {
      await updateShop({ name: shopName, phone: shopPhone || undefined, address: shopAddress || undefined, currency: shopCurrency });
      showToast('Studio profile updated', 'success');
    } finally {
      setSavingShop(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !currentShop?.id) return;
    setUploadingLogo(true);
    try {
      const file = await compressImage(rawFile, { maxDimension: 800 });
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/branding/logo-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const logoUrl = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;
      await updateShop({ logoUrl });
      showToast('Logo updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setConfirmRemoveLogo(false);
    await updateShop({ logoUrl: '' });
    showToast('Logo removed', 'success');
  };

  if (!isLoaded) {
    return (
      <PageLayout width="narrow" header={<TopBar title="Your Studio" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
        <SettingsSkeleton />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="narrow" header={<TopBar title="Your Studio" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Studio Profile</h3>
        <div className={styles.card}>
          <Input label="Shop / Studio Name" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
          <Select
            label="Shop Currency"
            value={shopCurrency}
            onChange={(e) => setShopCurrency(e.target.value)}
            options={SUPPORTED_CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
          />
          <Input label="Phone (shown on receipts)" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="08012345678" />
          <Input label="Address" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Shop address" />
          <div className={styles.actions}>
            <Button variant="primary" loading={savingShop} onClick={handleSaveShop}>Save</Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shop Logo</h3>
        <div className={styles.card}>
          <div className={styles.logoPreviewWrap}>
            {currentShop?.logoUrl ? (
              <Image src={currentShop.logoUrl} alt="" width={200} height={200} className={styles.logoPreview} />
            ) : (
              <div className={styles.logoPreviewEmpty}>
                <Symbol name="storefront" size={36} />
              </div>
            )}
          </div>
          <p className={styles.hintText}>Shown on receipts and your public portfolio page.</p>
          <label className={styles.uploadBtn}>
            <input type="file" accept="image/*" hidden onChange={handleUploadLogo} />
            <Symbol name={uploadingLogo ? 'progress_activity' : 'upload'} size={18} />
            {uploadingLogo ? 'Uploading…' : 'Upload Photo'}
          </label>
          {currentShop?.logoUrl && (
            <Button variant="danger" onClick={() => setConfirmRemoveLogo(true)}>Remove Logo</Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmRemoveLogo}
        onClose={() => setConfirmRemoveLogo(false)}
        onConfirm={handleRemoveLogo}
        title="Remove your shop logo?"
        description="Receipts and your public portfolio will show your studio name instead."
        confirmLabel="Remove"
      />
    </PageLayout>
  );
}
