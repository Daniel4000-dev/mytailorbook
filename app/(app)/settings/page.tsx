'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Avatar from '@/components/ui/Avatar/Avatar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import SettingsRow from '@/components/ui/SettingsRow/SettingsRow';
import Symbol from '@/components/ui/Symbol/Symbol';
import SettingsSkeleton from './SettingsSkeleton';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { currentShop, staffMembers, updateShop, isLoaded } = useData();
  const { showToast } = useToast();

  const [openSheet, setOpenSheet] = useState<'account' | 'studio' | 'logo' | 'note' | null>(null);

  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [savingShop, setSavingShop] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);

  const [noteTemplate, setNoteTemplate] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  if (!isOwner) {
    return (
      <PageLayout width="narrow">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sf-text-secondary)' }}>
          <h2>Access Denied</h2>
          <p>Only the studio owner has access to Settings.</p>
        </div>
      </PageLayout>
    );
  }

  {/* Plain title, not profileMode — the identity strip just below the
      header already shows name/role/avatar; profileMode here would just
      repeat the same thing twice on one screen. */}
  const topBar = (
    <TopBar
      title="Settings"
    />
  );

  if (!isLoaded) {
    return (
      <PageLayout width="narrow" className={styles.pageGrid} header={topBar}>
        <SettingsSkeleton />
      </PageLayout>
    );
  }

  const openStudioSheet = () => {
    setShopName(currentShop?.name || '');
    setShopPhone(currentShop?.phone || '');
    setShopAddress(currentShop?.address || '');
    setOpenSheet('studio');
  };

  const handleSaveShop = async () => {
    setSavingShop(true);
    try {
      await updateShop({ name: shopName, phone: shopPhone || undefined, address: shopAddress || undefined });
      setOpenSheet(null);
      showToast('Studio profile updated', 'success');
    } finally {
      setSavingShop(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentShop?.id) return;
    setUploadingLogo(true);
    try {
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

  const openNoteSheet = () => {
    setNoteTemplate(currentShop?.outreachTemplate || `Hi {name}, thought you'd love this style!`);
    setOpenSheet('note');
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await updateShop({ outreachTemplate: noteTemplate });
      setOpenSheet(null);
      showToast('Message template saved', 'success');
    } finally {
      setSavingNote(false);
    }
  };

  const activeStaffCount = staffMembers.filter((s) => s.active !== false).length;
  const customStylesCount = currentShop?.customStyles?.length || 0;

  return (
    <PageLayout width="narrow" className={styles.pageGrid} header={topBar}>
      <button type="button" className={styles.identityStrip} onClick={() => setOpenSheet('account')}>
        <Avatar name={user?.name || 'Owner'} size="lg" />
        <div className={styles.identityText}>
          <span className={styles.identityName}>{user?.name}</span>
          <span className={styles.identityRole}>{user?.role} Account</span>
        </div>
        <Symbol name="chevron_right" size={18} className={styles.identityChevron} />
      </button>

      <div className={styles.groups}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Your Studio</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="storefront"
              label="Studio Profile"
              subtitle={currentShop?.name || 'Unnamed Studio'}
              onClick={openStudioSheet}
            />
            <SettingsRow
              icon="image"
              label="Shop Logo"
              subtitle={currentShop?.logoUrl ? 'Set' : 'Not set'}
              meta={
                currentShop?.logoUrl ? (
                  <img src={currentShop.logoUrl} alt="" className={styles.logoThumb} />
                ) : undefined
              }
              onClick={() => setOpenSheet('logo')}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Your Team</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="group"
              label="Staff"
              subtitle={`${activeStaffCount} active`}
              onClick={() => router.push('/settings/staff')}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Garment Styles</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="checkroom"
              label="Custom Styles"
              subtitle={customStylesCount > 0 ? `${customStylesCount} added` : 'None yet'}
              onClick={() => router.push('/settings/styles')}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Messages &amp; Templates</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="forum"
              label="Reach-Out Note Template"
              subtitle={currentShop?.outreachTemplate ? currentShop.outreachTemplate.slice(0, 40) : 'Using default'}
              onClick={openNoteSheet}
            />
            <SettingsRow
              icon="chat"
              label="Order Update Messages"
              subtitle="Customize per-stage WhatsApp wording"
              onClick={() => router.push('/settings/messages')}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Public Portfolio</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="photo_library"
              label="Manage Portfolio Photos"
              subtitle="Choose what customers see"
              onClick={() => router.push('/settings/portfolio')}
            />
          </div>
        </div>
      </div>

      <BottomSheet isOpen={openSheet === 'account'} onClose={() => setOpenSheet(null)} title="Your Account">
        <div className={styles.sheetBody}>
          <div className={styles.identityStrip} style={{ pointerEvents: 'none' }}>
            <Avatar name={user?.name || 'Owner'} size="lg" />
            <div className={styles.identityText}>
              <span className={styles.identityName}>{user?.name}</span>
              <span className={styles.identityRole}>{user?.role} Account</span>
            </div>
          </div>
          <p className={styles.readonlyEmail}>{user?.email}</p>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={openSheet === 'studio'} onClose={() => setOpenSheet(null)} title="Studio Profile">
        <div className={styles.sheetBody}>
          <Input label="Shop / Studio Name" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
          <Input label="Phone (shown on receipts)" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="08012345678" />
          <Input label="Address" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Shop address" />
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setOpenSheet(null)}>Cancel</Button>
            <Button variant="primary" loading={savingShop} onClick={handleSaveShop}>Save</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={openSheet === 'logo'} onClose={() => setOpenSheet(null)} title="Shop Logo">
        <div className={styles.sheetBody}>
          <div className={styles.logoPreviewWrap}>
            {currentShop?.logoUrl ? (
              <img src={currentShop.logoUrl} alt="" className={styles.logoPreview} />
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
      </BottomSheet>

      <BottomSheet isOpen={openSheet === 'note'} onClose={() => setOpenSheet(null)} title="Reach-Out Message">
        <div className={styles.sheetBody}>
          <textarea
            className={styles.noteTextarea}
            value={noteTemplate}
            onChange={(e) => setNoteTemplate(e.target.value)}
            rows={3}
          />
          <p className={styles.hintText}>Use {'{name}'} and it&apos;ll be replaced with the customer&apos;s name.</p>
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setOpenSheet(null)}>Cancel</Button>
            <Button variant="primary" loading={savingNote} onClick={handleSaveNote}>Save Template</Button>
          </div>
        </div>
      </BottomSheet>

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
