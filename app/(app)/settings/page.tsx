'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Avatar from '@/components/ui/Avatar/Avatar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import SettingsRow from '@/components/ui/SettingsRow/SettingsRow';
import AppearanceToggle from '@/components/ui/AppearanceToggle/AppearanceToggle';
import Symbol from '@/components/ui/Symbol/Symbol';
import { addBranchAction } from '@/app/actions';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import SettingsSkeleton from './_components/SettingsSkeleton';
import styles from './page.module.css';
import billingRowStyles from '@/components/ui/SettingsRow/SettingsRow.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isOwner, loading: authLoading } = useAuth();
  const { currentShop, staffMembers, shops, refreshBranches, isLoaded } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  // Desktop's persistent left nav (see settings/layout.tsx) already lists
  // every category — landing on the bare overview page would just show
  // the exact same list again in the right pane. Redirect straight to a
  // sensible default section instead; mobile keeps this page as its real
  // drill-down list (no redirect there).
  //
  // The effect alone isn't enough: effects run after paint, so without the
  // early return below, this page's full mobile-style list would flash on
  // screen for a frame before the redirect kicks in — most visible when a
  // sub-page's back button lands here (e.g. Account → back). Skipping the
  // render entirely on desktop, not just redirecting afterward, is what
  // actually prevents that flash.
  useEffect(() => {
    if (isDesktop) router.replace(ROUTES.settingsAccount);
  }, [isDesktop, router]);

  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  // Every hook above must run unconditionally on every render (Rules of
  // Hooks) — this early return has to come after all of them, not before.
  if (isDesktop) {
    return null;
  }

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
      rightAction={
        <div className={styles.headerActions}>
          <NotificationBell />
        </div>
      }
    />
  );

  if (!isLoaded) {
    return (
      <PageLayout width="narrow" className={styles.pageGrid} header={topBar}>
        <SettingsSkeleton />
      </PageLayout>
    );
  }

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
      setAddBranchOpen(false);
      setBranchName('');
      setBranchPhone('');
      setBranchAddress('');
      showToast('Branch added', 'success');
    } finally {
      setAddingBranch(false);
    }
  };

  const activeStaffCount = staffMembers.filter((s) => s.active !== false).length;
  const customStylesCount = currentShop?.customStyles?.length || 0;

  return (
    <PageLayout width="narrow" className={styles.pageGrid} header={topBar}>
      <button type="button" className={styles.identityStrip} onClick={() => router.push(ROUTES.settingsAccount)}>
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
              onClick={() => router.push(ROUTES.settingsStudio)}
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
              onClick={() => router.push(ROUTES.settingsStudio)}
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
                <button type="button" className={styles.proMemberBadge} onClick={() => router.push(ROUTES.settingsBilling)}>
                  Pro Member
                </button>
              ) : (
                <Button variant="primary" onClick={() => router.push(ROUTES.settingsBilling)} size="sm">
                  {currentShop?.subscriptionStatus === 'past_due' ? 'Fix Payment' : 'Upgrade'}
                </Button>
              )}
            </div>
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
                onClick={() => setAddBranchOpen(true)}
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
              meta={!currentShop || !PREMIUM_STATUSES.includes(currentShop.subscriptionStatus) ? <span className={styles.premiumBadge}>Premium</span> : undefined}
              onClick={() => router.push(ROUTES.settingsStaff)}
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
              onClick={() => router.push(ROUTES.settingsStyles)}
            />
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Messages &amp; Templates</span>
          <div className={styles.groupCard}>
            {/* Reach-Out Note Template and Order Update Messages both live
               on the same /settings/messages page now — one row here,
               not two that land in the same place. */}
            <SettingsRow
              icon="forum"
              label="Messages &amp; Templates"
              subtitle="Reach-out note and per-stage WhatsApp wording"
              onClick={() => router.push(ROUTES.settingsMessages)}
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
              onClick={() => router.push(ROUTES.settingsPortfolio)}
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
                onClick={() => router.push(ROUTES.settingsReports)}
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
              onClick={() => router.push(ROUTES.settingsActivity)}
            />
          </div>
        </div>
        )}
      </div>

      <BottomSheet isOpen={addBranchOpen} onClose={() => setAddBranchOpen(false)} title="Add Branch">
        <div className={styles.sheetBody}>
          <Input label="Branch Name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          <Input label="Phone" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} placeholder="08012345678" />
          <Input label="Address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="Branch address" />
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setAddBranchOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={addingBranch} onClick={handleAddBranch}>Add Branch</Button>
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
