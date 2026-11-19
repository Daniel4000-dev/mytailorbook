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
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import AppearanceToggle from '@/components/ui/AppearanceToggle/AppearanceToggle';
import Symbol from '@/components/ui/Symbol/Symbol';
import { addBranchAction } from '@/app/actions';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import { APP_CONFIG } from '@/lib/config';
import SettingsSkeleton from './_components/SettingsSkeleton';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isOwner, loading: authLoading, logout } = useAuth();
  const { currentShop, staffMembers, shops, refreshBranches, isLoaded } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    if (isDesktop) router.replace(ROUTES.settingsStudio);
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
  const handleShareStorefront = () => {
    const slug = currentShop?.slug || 'savile-row';
    const shopName = currentShop?.name || 'our shop';
    const url = `${window.location.origin}/studio/${slug}`;
    const text = `Greetings from ${shopName}! View our designs and catalog here:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const topBar = (
    <TopBar
      title="Settings"
      rightAction={
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerActionBtn}
            onClick={handleShareStorefront}
            title="Share Studio Storefront"
            aria-label="Share Studio Storefront"
          >
            <Symbol name="share" size={18} />
          </button>
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
      {/* ── Executive Workshop Profile Hero ── */}
      <div className={styles.heroCardContainer}>
        <button
          type="button"
          className={styles.heroProfileCard}
          onClick={() => router.push(ROUTES.settingsStudio)}
          aria-label="Manage Workshop Profile and Identity"
        >
          <div className={styles.heroCardHeader}>
            {/* Logo / Crest with verified seal */}
            <div className={styles.heroAvatarWrap}>
              {currentShop?.logoUrl ? (
                <Image
                  src={currentShop.logoUrl}
                  alt={currentShop.name}
                  width={64}
                  height={64}
                  className={styles.heroLogoImg}
                />
              ) : (
                <div className={styles.heroLogoPlaceholder}>
                  <span className={styles.monogramInitial}>
                    {(currentShop?.name || 'S').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className={styles.avatarVerifiedBadge} title="Verified Workshop">
                <Symbol name="verified" size={15} fill />
              </div>
            </div>

            {/* Shop Details */}
            <div className={styles.heroMainInfo}>
              <div className={styles.heroTitleRow}>
                <h2 className={styles.heroStudioName}>{currentShop?.name || 'Your Shop'}</h2>
              </div>

              {/* Status pill with pulsing dot */}
              <div className={styles.heroStatusCapsule}>
                <span className={currentShop?.vacationMode ? styles.statusDotPaused : styles.statusDotActive} />
                <span className={styles.statusCapsuleText}>
                  {currentShop?.vacationMode
                    ? 'Vacation Mode Paused'
                    : currentShop?.businessMode === 'rtw'
                      ? 'Ready-to-Wear Active'
                      : currentShop?.businessMode === 'hybrid'
                        ? 'Custom & RTW Active'
                        : 'Custom Orders Active'}
                </span>
              </div>

              <p className={styles.heroMetaLine}>
                {currentShop?.address || currentShop?.phone
                  ? [currentShop?.address, currentShop?.phone].filter(Boolean).join(' · ')
                  : 'Tap to configure workshop details'}
              </p>
            </div>

            {/* Chevron affordance */}
            <div className={styles.heroChevronBox}>
              <Symbol name="chevron_right" size={20} className={styles.chevron} />
            </div>
          </div>

          {/* Quick Stats / Meta Strip */}
          <div className={styles.heroChipsStrip}>
            <span className={styles.heroChip}>
              <Symbol name="payments" size={13} />
              <span>{currentShop?.currency || 'NGN'}</span>
            </span>
            <span className={styles.heroChip}>
              <Symbol name="storefront" size={13} />
              <span>
                {currentShop?.businessMode === 'rtw'
                  ? 'Ready-to-Wear'
                  : currentShop?.businessMode === 'hybrid'
                    ? 'Custom & RTW'
                    : 'Bespoke Tailoring'}
              </span>
            </span>
            <span className={styles.heroChipHighlight}>
              <Symbol name="workspace_premium" size={13} />
              <span>
                {currentShop?.subscriptionStatus === 'active'
                  ? 'Pro Plan'
                  : currentShop?.subscriptionStatus === 'trialing'
                    ? 'Free Trial'
                    : 'Free Tier'}
              </span>
            </span>
          </div>
        </button>
      </div>

      <div className={styles.groups}>
        {/* ── Group 1: Storefront & Designs ── */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Storefront &amp; Styles</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="checkroom"
              label="Garment Styles &amp; Base Prices"
              subtitle={customStylesCount > 0 ? `${customStylesCount} signature styles configured` : 'Standard silhouettes & base prices'}
              onClick={() => router.push(ROUTES.settingsStyles)}
            />
            <SettingsRow
              icon="photo_library"
              label="Public Portfolio &amp; Lookbook"
              subtitle={`${APP_CONFIG.domain}/studio/${currentShop?.slug || ''}`}
              meta={<Symbol name="open_in_new" size={15} />}
              onClick={() => router.push(ROUTES.settingsPortfolio)}
            />
            <SettingsRow
              icon="forum"
              label="WhatsApp Client Messages"
              subtitle="Order status updates &amp; live tracking links"
              onClick={() => router.push(ROUTES.settingsMessages)}
            />
            {(currentShop?.businessMode === 'rtw' || currentShop?.businessMode === 'hybrid') && (
              <SettingsRow
                icon="straighten"
                label="Size Charts"
                subtitle="Standard measurements for production batches"
                onClick={() => router.push('/settings/size-charts')}
              />
            )}
          </div>
        </div>

        {/* ── Group 2: Workshop & Team Operations ── */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Workshop Operations</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="group"
              label="Staff &amp; Master Cutters"
              subtitle={`${activeStaffCount} active workshop members`}
              meta={!currentShop || !PREMIUM_STATUSES.includes(currentShop.subscriptionStatus) ? <span className={styles.premiumBadge}>Premium</span> : undefined}
              onClick={() => router.push(ROUTES.settingsStaff)}
            />
            <SettingsRow
              icon="verified_user"
              label="Production Streak &amp; Vacation Shield"
              subtitle={currentShop?.vacationMode ? 'Vacation Mode Paused' : `${currentShop?.streakFreezes || 0} Streak Freezes · Active`}
              onClick={() => router.push(ROUTES.settingsStudio)}
            />
            {FEATURE_FLAGS.orgBranchMultiTenancy && (
              <>
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
                    onClick={() => { }}
                  />
                ))}
                <SettingsRow
                  icon="add"
                  label="Add Branch"
                  subtitle="Add another physical location"
                  onClick={() => setAddBranchOpen(true)}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Group 3: Subscription & Plan ── */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Subscription</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="workspace_premium"
              label={`${APP_CONFIG.name} Pro`}
              subtitle={
                currentShop?.subscriptionStatus === 'active'
                  ? 'Active Subscription · Full Feature Access'
                  : currentShop?.subscriptionStatus === 'trialing'
                    ? 'Free Trial · Full Feature Access'
                    : currentShop?.subscriptionStatus === 'past_due'
                      ? 'Payment Failed · Update Payment Method'
                      : 'Free Tier · Tap to Upgrade'
              }
              meta={
                currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing' ? (
                  <span className={styles.proActiveBadge}>Pro Active</span>
                ) : (
                  <span className={styles.upgradeBadge}>Upgrade</span>
                )
              }
              onClick={() => router.push(ROUTES.settingsBilling)}
            />
          </div>
        </div>

        {/* ── Group 4: Preferences & Security ── */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Preferences &amp; Security</span>
          <div className={styles.groupCard}>
            <AppearanceToggle />
            <SettingsRow
              icon="person"
              label="Account &amp; Login Credentials"
              subtitle={`${user?.name || 'Owner'} · ${user?.email || 'Manage login'}`}
              onClick={() => router.push(ROUTES.settingsAccount)}
            />
            {FEATURE_FLAGS.auditLog && (
              <SettingsRow
                icon="history"
                label="Security &amp; Activity Log"
                subtitle="See who did what, and when"
                onClick={() => router.push(ROUTES.settingsActivity)}
              />
            )}
          </div>
        </div>

        {/* ── Group 5: Session & Sign Out ── */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Account Session</span>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="logout"
              label="Log Out"
              subtitle={user?.email ? `Signed in as ${user.email}` : 'Sign out of your workshop account'}
              destructive
              onClick={() => setShowLogoutConfirm(true)}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Log out of MyStitchBook?"
        description="You will need to sign in again to access your workshop and records."
        confirmLabel="Log Out"
        destructive
      />

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
