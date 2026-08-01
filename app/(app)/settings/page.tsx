'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import AppearanceToggle from '@/components/ui/AppearanceToggle/AppearanceToggle';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ExportDataButton, AccountDangerZone } from '@/components/settings/AccountDangerZone';
import PushNotificationToggle from './_components/PushNotificationToggle';
import { addBranchAction } from '@/app/actions';
import { initializeSubscription, confirmSubscriptionPayment } from '@/app/actions/payments';
import { openPaystackPopup, preloadPaystackScript } from '@/lib/paystack';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_MONTHLY_PRICE_NGN, PREMIUM_YEARLY_PRICE_NGN } from '@/lib/subscription';
import { compressImage } from '@/lib/compressImage';
import SettingsSkeleton from './_components/SettingsSkeleton';
import styles from './page.module.css';
import billingRowStyles from '@/components/ui/SettingsRow/SettingsRow.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isOwner, loading: authLoading, updateAvatar } = useAuth();
  const { currentShop, staffMembers, updateShop, shops, refreshBranches, refreshShop, isLoaded } = useData();
  const { showToast } = useToast();

  const [openSheet, setOpenSheet] = useState<'account' | 'studio' | 'logo' | 'note' | 'addBranch' | 'plans' | null>(null);

  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [savingShop, setSavingShop] = useState(false);

  const [branchName, setBranchName] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);

  const [noteTemplate, setNoteTemplate] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Read once via lazy init rather than inline in render — Date.now() is an
  // impure call the React Compiler flags if invoked directly during render.
  const [nowMs] = useState(() => Date.now());
  const graceDaysLeft = currentShop?.graceExpiresAt
    ? Math.max(1, Math.ceil((new Date(currentShop.graceExpiresAt).getTime() - nowMs) / (24 * 60 * 60 * 1000)))
    : null;

  // Warms Paystack's inline-checkout script as soon as the plan picker is
  // open — loading it cold on the actual "Upgrade" click left a visible gap
  // between closing this sheet and the popup appearing (the script fetch),
  // which read as the button doing nothing on the first try. By the second
  // click the script was already cached, which is why it "worked the
  // second time."
  useEffect(() => {
    if (openSheet === 'plans') preloadPaystackScript();
  }, [openSheet]);

  const handleUpgrade = async (interval: 'monthly' | 'yearly' = 'monthly') => {
    setUpgrading(true);
    try {
      const { accessCode, reference } = await initializeSubscription(interval);
      // Close our own sheet before opening Paystack's popup. Paystack's
      // inline.js appends its checkout iframe directly to document.body —
      // it isn't inside this sheet's Radix-managed content, so while the
      // sheet stays open Radix keeps document.body { pointer-events: none }
      // locked for anything outside its own allow-listed content, and the
      // Paystack iframe inherits that lock and becomes fully unclickable.
      setOpenSheet(null);
      await openPaystackPopup(accessCode, {
        onSuccess: async () => {
          showToast('Payment successful — activating your plan…', 'success');
          setUpgrading(false);
          try {
            // Re-verifies server-to-server with Paystack and flips the
            // shop to active directly — the webhook (app/api/webhooks/
            // paystack) is still the real source of truth and will fire
            // too, but it can lag several seconds behind this callback (and
            // never reaches a localhost dev server at all), which is why
            // the plan card kept showing "Upgrade" after a real successful
            // charge. This closes that gap instead of just hoping the
            // webhook + realtime subscription land before the user looks.
            await confirmSubscriptionPayment(reference);
          } catch (err) {
            console.error('confirmSubscriptionPayment failed, relying on webhook:', err);
          }
          refreshShop();
        },
        onCancel: () => {
          setUpgrading(false);
        },
        onError: (error) => {
          showToast(error.message || 'Payment failed', 'error');
          setUpgrading(false);
        },
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upgrade failed', 'error');
      setUpgrading(false);
    }
  };

  // authLoading starts true on every mount/auth-state event and only flips
  // once the profile (and its role) has actually resolved — checking
  // isOwner before that resolves is checking a value that hasn't been
  // determined yet, not a real "not the owner" answer, and previously
  // flashed this denial screen during that window (most visible right
  // after a Server Action, since a fresh onAuthStateChange tick can land
  // around the same time).
  if (authLoading) {
    return (
      <PageLayout width="narrow">
        <SettingsSkeleton />
      </PageLayout>
    );
  }

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

  const handleAddBranch = async () => {
    if (!branchName.trim()) return;
    setAddingBranch(true);
    try {
      const { error } = await addBranchAction(branchName, branchPhone || undefined, branchAddress || undefined);
      if (error) {
        showToast(error, 'error');
        return;
      }
      refreshBranches();
      setOpenSheet(null);
      setBranchName('');
      setBranchPhone('');
      setBranchAddress('');
      showToast('Branch added', 'success');
    } finally {
      setAddingBranch(false);
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
        <Avatar name={user?.name || 'Owner'} imageUrl={user?.avatarUrl} size="lg" />
        <div className={styles.identityText}>
          <span className={styles.identityName}>{user?.name}</span>
          <span className={styles.identityRole}>{user?.role} Account</span>
        </div>
        <Symbol name="chevron_right" size={18} className={styles.identityChevron} />
      </button>

      <div className={styles.groups}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Preferences</span>
          <div className={styles.groupCard}>
            <AppearanceToggle />
          </div>
        </div>

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
                  <Image src={currentShop.logoUrl} alt="" width={200} height={200} className={styles.logoThumb} />
                ) : undefined
              }
              onClick={() => setOpenSheet('logo')}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Billing & Subscription</span>
          <div className={styles.groupCard}>
            {/* Not a SettingsRow here on purpose — SettingsRow's root is
                itself a <button>, and this row needs its own independently
                clickable "Upgrade" button nested inside it. Nesting a
                <button> inside another <button> is invalid HTML (breaks
                hydration and click targeting), so this is built as a plain,
                non-interactive row instead. */}
            <div className={billingRowStyles.row}>
              <Symbol name="workspace_premium" size={20} className={billingRowStyles.icon} />
              <span className={billingRowStyles.textCol}>
                <span className={billingRowStyles.label}>MyStitchBook Pro</span>
                <span className={billingRowStyles.subtitle}>
                  {currentShop?.subscriptionStatus === 'active' && 'Active Subscription'}
                  {currentShop?.subscriptionStatus === 'past_due' && 'Payment failed'}
                  {(!currentShop?.subscriptionStatus || currentShop.subscriptionStatus === 'free' || currentShop.subscriptionStatus === 'canceled') && 'Free Tier'}
                </span>
              </span>
              {currentShop?.subscriptionStatus === 'active' ? (
                <span className={styles.proMemberBadge}>Pro Member</span>
              ) : (
                <Button variant="primary" onClick={() => setOpenSheet('plans')} size="sm">
                  {currentShop?.subscriptionStatus === 'past_due' ? 'Fix Payment' : 'Upgrade'}
                </Button>
              )}
            </div>
            {currentShop?.subscriptionStatus === 'past_due' && graceDaysLeft !== null && (
              <div className={styles.graceBanner}>
                <Symbol name="warning" size={16} />
                <span>
                  {graceDaysLeft} day(s) left to update payment before you&apos;re moved to the Free plan. Your data stays safe either way.
                </span>
              </div>
            )}
          </div>
        </div>

        {FEATURE_FLAGS.orgBranchMultiTenancy && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Your Organization</span>
            <div className={styles.groupCard}>
              {shops.map((branch) => (
                <SettingsRow
                  key={branch.id}
                  icon="storefront"
                  label={branch.name}
                  subtitle={
                    branch.isPrimary
                      ? (branch.address || 'Primary branch')
                      : (branch.address || 'Branch')
                  }
                  meta={branch.isPrimary ? <span className={styles.primaryBadge}>Primary</span> : undefined}
                  onClick={() => {}}
                />
              ))}
              <SettingsRow
                icon="add"
                label="Add Branch"
                subtitle="Add another physical location"
                onClick={() => setOpenSheet('addBranch')}
              />
            </div>
          </div>
        )}

        <div className={styles.group}>
          <span className={styles.groupLabel}>Your Team</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="group"
              label="Staff"
              subtitle={`${activeStaffCount} active`}
              meta={currentShop?.subscriptionStatus !== 'active' ? <span className={styles.premiumBadge}>Premium</span> : undefined}
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

        {FEATURE_FLAGS.financialReporting && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Financials</span>
            <div className={styles.groupCard}>
              <SettingsRow
                icon="bar_chart"
                label="Reports"
                subtitle="Revenue, outstanding balance, and margin"
                onClick={() => router.push('/settings/reports')}
              />
            </div>
          </div>
        )}

        {FEATURE_FLAGS.auditLog && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>Security</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="history"
              label="Activity Log"
              subtitle="See who did what, and when"
              onClick={() => router.push('/settings/activity')}
            />
          </div>
        </div>
        )}
      </div>

      <BottomSheet isOpen={openSheet === 'account'} onClose={() => setOpenSheet(null)} title="Your Account">
        <div className={styles.sheetBody}>
          <div className={styles.identityStrip} style={{ pointerEvents: 'none' }}>
            <Avatar name={user?.name || 'Owner'} imageUrl={user?.avatarUrl} size="lg" />
            <div className={styles.identityText}>
              <span className={styles.identityName}>{user?.name}</span>
              <span className={styles.identityRole}>{user?.role} Account</span>
            </div>
          </div>
          <p className={styles.readonlyEmail}>{user?.email}</p>
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
          <AccountDangerZone isOwner={isOwner} onClosingProfile={() => setOpenSheet(null)} />
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

      <BottomSheet isOpen={openSheet === 'plans'} onClose={() => setOpenSheet(null)} title="Choose Your Plan">
        <div className={styles.sheetBody}>
          <div className={styles.intervalToggle} role="tablist" aria-label="Billing interval">
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === 'monthly'}
              className={`${styles.intervalOption} ${billingInterval === 'monthly' ? styles.intervalOptionActive : ''}`}
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === 'yearly'}
              className={`${styles.intervalOption} ${billingInterval === 'yearly' ? styles.intervalOptionActive : ''}`}
              onClick={() => setBillingInterval('yearly')}
            >
              Yearly
              <span className={styles.savingsBadge}>Save 2 months</span>
            </button>
          </div>

          <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
            <div className={styles.planCardHeader}>
              <span className={styles.planName}>Premium</span>
              <span className={styles.planBadge}>Recommended</span>
            </div>

            {billingInterval === 'monthly' ? (
              <span className={styles.planPrice}>
                ₦{PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}
                <span className={styles.planPriceUnit}>/month</span>
              </span>
            ) : (
              <span className={styles.planPrice}>
                ₦{PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}
                <span className={styles.planPriceUnit}>/year</span>
              </span>
            )}
            {billingInterval === 'yearly' && (
              <span className={styles.priceSubtext}>
                Pay for 10 months, get 12 — vs. ₦{(PREMIUM_MONTHLY_PRICE_NGN * 12).toLocaleString()}/year billed monthly.
              </span>
            )}

            <ul className={styles.planFeatures}>
              <li>Everything in Free</li>
              <li><strong>Unlimited orders</strong></li>
              <li><strong>Staff accounts</strong></li>
              <li><strong>Analytics &amp; insights</strong></li>
              <li>Badge removed from your public pages</li>
              <li>Priority support</li>
            </ul>
            <Button variant="primary" loading={upgrading} onClick={() => handleUpgrade(billingInterval)} fullWidth>
              {billingInterval === 'monthly'
                ? `Upgrade — ₦${PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}/month`
                : `Upgrade — ₦${PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}/year`}
            </Button>
          </div>

          <div className={styles.planCard}>
            <div className={styles.planCardHeader}>
              <span className={styles.planName}>Free</span>
              <span className={styles.planPrice}>₦0</span>
            </div>
            <ul className={styles.planFeatures}>
              <li>Unlimited customers</li>
              <li>Unlimited custom styles</li>
              <li>15 orders / month</li>
              <li>Receipts &amp; invoices</li>
              <li>WhatsApp button, tracking link &amp; portfolio</li>
              <li className={styles.planFeatureMuted}>&quot;Powered by MyStitchBook&quot; badge shown</li>
              <li className={styles.planFeatureMuted}>No staff accounts</li>
              <li className={styles.planFeatureMuted}>No analytics</li>
            </ul>
          </div>

          <p className={styles.hintText}>
            Cancel anytime. If a renewal payment fails, you keep Premium features for a 3-day grace period with reminders before reverting to Free — your data is never locked either way.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={openSheet === 'addBranch'} onClose={() => setOpenSheet(null)} title="Add Branch">
        <div className={styles.sheetBody}>
          <Input label="Branch Name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          <Input label="Phone" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} placeholder="08012345678" />
          <Input label="Address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="Branch address" />
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setOpenSheet(null)}>Cancel</Button>
            <Button variant="primary" loading={addingBranch} onClick={handleAddBranch}>Add Branch</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={openSheet === 'logo'} onClose={() => setOpenSheet(null)} title="Shop Logo">
        <div className={styles.sheetBody}>
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
