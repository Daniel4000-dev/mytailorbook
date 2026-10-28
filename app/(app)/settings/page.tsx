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
    const shopName = currentShop?.name || 'our atelier';
    const url = `${window.location.origin}/studio/${slug}`;
    const text = `Greetings from ${shopName}! Explore our signature bespoke collections and storefront:\n\n${url}`;
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
          <button
            type="button"
            className={styles.headerActionBtn}
            onClick={() => router.push(ROUTES.settingsStudio)}
            title="Edit Studio Profile"
            aria-label="Edit Studio Profile"
          >
            <Symbol name="edit" size={18} />
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
      {/* ── WhatsApp 'You' Tab Style Atelier Executive Hero ── */}
      <button
        type="button"
        className={styles.heroProfileCard}
        onClick={() => router.push(ROUTES.settingsStudio)}
        aria-label="Manage Studio Profile and Identity"
      >
        {/* Thought Bubble - Live Atelier Heartbeat */}
        <div className={styles.heroBubble}>
          <span className={styles.heroBubbleDot} />
          <span className={styles.heroBubbleText}>
            {currentShop?.vacationMode
              ? 'Vacation Mode Paused'
              : currentShop?.businessMode === 'rtw'
              ? 'Ready-to-Wear Rack Active'
              : currentShop?.businessMode === 'hybrid'
              ? 'Hybrid Atelier Operating'
              : 'Bespoke Cutting Table Active'}
          </span>
        </div>

        {/* Studio Logo / Crest */}
        <div className={styles.heroAvatarWrap}>
          {currentShop?.logoUrl ? (
            <Image
              src={currentShop.logoUrl}
              alt={currentShop.name}
              width={86}
              height={86}
              className={styles.heroLogoImg}
            />
          ) : (
            <div className={styles.heroLogoPlaceholder}>
              <Symbol name="storefront" size={40} />
            </div>
          )}
        </div>

        {/* Studio Name & Identity Info */}
        <div className={styles.heroNameGroup}>
          <div className={styles.heroTitleRow}>
            <h2 className={styles.heroStudioName}>{currentShop?.name || 'Your Studio'}</h2>
            <Symbol name="verified" size={17} className={styles.verifiedIcon} />
          </div>

          <div className={styles.heroBadgeRow}>
            <span className={styles.heroModeBadge}>
              {currentShop?.businessMode === 'rtw'
                ? 'Ready-to-Wear Studio'
                : currentShop?.businessMode === 'hybrid'
                ? 'Hybrid Fashion House'
                : 'Bespoke Atelier'}
            </span>
            {currentShop?.currency && (
              <span className={styles.heroCurrencyBadge}>{currentShop.currency}</span>
            )}
          </div>

          <p className={styles.heroMetaLine}>
            {currentShop?.address || 'Lagos, Nigeria'}
            {currentShop?.phone ? ` · ${currentShop.phone}` : ''}
          </p>
        </div>
      </button>

      <div className={styles.groups}>
        {/* ── Group 1: Atelier Commerce & Styling ── */}
        <div className={styles.group}>
          <div className={styles.groupCard}>
            <SettingsRow
              icon="checkroom"
              label="Garment Styles &amp; Base Prices"
              subtitle={customStylesCount > 0 ? `${customStylesCount} signature cuts configured` : 'Standard silhouettes & base prices'}
              onClick={() => router.push(ROUTES.settingsStyles)}
            />
            <SettingsRow
              icon="forum"
              label="WhatsApp Client Messages"
              subtitle="Per-stage update wording &amp; tracking links"
              onClick={() => router.push(ROUTES.settingsMessages)}
            />
            <SettingsRow
              icon="photo_library"
              label="Public Portfolio &amp; Lookbook"
              subtitle={`mytailorbook.com/studio/${currentShop?.slug || ''}`}
              meta={<Symbol name="open_in_new" size={15} />}
              onClick={() => router.push(ROUTES.settingsPortfolio)}
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
          <div className={styles.groupCard}>
            <SettingsRow
              icon="group"
              label="Staff &amp; Master Cutters"
              subtitle={`${activeStaffCount} active staff members`}
              meta={!currentShop || !PREMIUM_STATUSES.includes(currentShop.subscriptionStatus) ? <span className={styles.premiumBadge}>Premium</span> : undefined}
              onClick={() => router.push(ROUTES.settingsStaff)}
            />
            <SettingsRow
              icon="verified_user"
              label="Daily Streak &amp; Vacation Shield"
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
                    onClick={() => {}}
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

        {/* ── Group 3: Atelier Plan & Subscription ── */}
        <div className={styles.group}>
          <div className={styles.groupCard}>
            <div className={billingRowStyles.row}>
              <div className={billingRowStyles.iconWrap}>
                <Symbol name="workspace_premium" size={21} className={billingRowStyles.iconGlyph} />
              </div>
              <span className={billingRowStyles.textCol}>
                <span className={billingRowStyles.label}>MyTailorBook Pro</span>
                <span className={billingRowStyles.subtitle}>
                  {currentShop?.subscriptionStatus === 'active' && 'Active Subscription'}
                  {currentShop?.subscriptionStatus === 'trialing' && 'Free Trial'}
                  {currentShop?.subscriptionStatus === 'past_due' && 'Payment failed'}
                  {(!currentShop?.subscriptionStatus || currentShop.subscriptionStatus === 'free' || currentShop.subscriptionStatus === 'canceled') && 'Free Tier'}
                </span>
              </span>
              {currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing' ? (
                <button type="button" className={styles.proMemberBadge} onClick={() => router.push(ROUTES.settingsBilling)}>
                  Pro Member
                </button>
              ) : (
                <Button variant="primary" onClick={() => router.push(ROUTES.settingsBilling)} size="sm">
                  {currentShop?.subscriptionStatus === 'past_due' ? 'Fix Payment' : 'Try free for 30 days'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Group 4: Preferences & Security ── */}
        <div className={styles.group}>
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
