'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import InviteColleaguesModal from '@/components/ui/InviteColleaguesModal/InviteColleaguesModal';
import Symbol from '@/components/ui/Symbol/Symbol';
import InstagramIcon from '@/components/ui/InstagramIcon/InstagramIcon';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import TiktokIcon from '@/components/ui/TiktokIcon/TiktokIcon';
import { addBranchAction } from '@/app/actions';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PREMIUM_STATUSES } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import { APP_CONFIG } from '@/lib/config';
import { getShopCurrency } from '@/lib/formatters';
import SettingsSkeleton from './_components/SettingsSkeleton';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isOwner, loading: authLoading, logout } = useAuth();
  const { currentShop, staffMembers, shops, refreshBranches, isLoaded } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get('sheet') === 'plans') {
      router.replace(ROUTES.settingsBilling);
    }
  }, [searchParams, router]);

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

  const handleInviteFriend = () => {
    const refCode = currentShop?.referralCode || currentShop?.slug || '';
    const url = `${window.location.origin}/signup${refCode ? `?ref=${refCode}` : ''}`;
    const text = `Join me on MyStitchBook — the modern management app for fashion designers and tailoring houses:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const topBar = (
    <TopBar
      leftAction={
        <button
          type="button"
          className={styles.headerRoundBtn}
          onClick={() => router.push(ROUTES.styles)}
          title="Search Garments & Styles"
          aria-label="Search Garments & Styles"
        >
          <Symbol name="search" size={20} />
        </button>
      }
      title="Settings"
      rightAction={
        <div className={styles.headerRightWrap}>
          <div className={styles.headerCapsule}>
            <button
              type="button"
              className={styles.headerCapsuleBtn}
              onClick={handleShareStorefront}
              title="Shop QR Code & Share"
              aria-label="Shop QR Code & Share"
            >
              <Symbol name="qr_code_2" size={20} />
            </button>
            <div className={styles.headerCapsuleDivider} />
            <button
              type="button"
              className={styles.headerCapsuleBtn}
              onClick={() => router.push(ROUTES.settingsStudio)}
              title="Edit Workshop Details"
              aria-label="Edit Workshop Details"
            >
              <Symbol name="edit" size={18} />
            </button>
          </div>
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
      {/* ── WhatsApp 'You' Tab Style Executive Hero ── */}
      <section className={styles.heroSection}>
        {/* Thought Bubble - Live Workshop Heartbeat */}
        <div className={styles.heroBubble}>
          <Symbol name="music_note" size={13} className={styles.heroBubbleIcon} />
          <span className={styles.heroBubbleText}>
            {currentShop?.vacationMode
              ? 'Vacation Mode Paused'
              : 'Custom Orders Active'}
          </span>
        </div>

        {/* Centered Avatar */}
        <button
          type="button"
          className={styles.heroAvatarBtn}
          onClick={() => router.push(ROUTES.settingsStudio)}
          aria-label="Manage Workshop Profile"
        >
          <div className={styles.heroAvatarWrap}>
            {currentShop?.logoUrl ? (
              <Image
                src={currentShop.logoUrl}
                alt={currentShop.name}
                width={84}
                height={84}
                className={styles.heroLogoImg}
              />
            ) : (
              <div className={styles.heroLogoPlaceholder}>
                <span className={styles.monogramInitial}>
                  {(currentShop?.name || 'S').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Studio Name + Green Plus/Verified Seal */}
        <div className={styles.heroNameBlock}>
          <div className={styles.heroNameRow}>
            <h1 className={styles.heroShopName}>{currentShop?.name || 'Your Shop'}</h1>
            <button
              type="button"
              className={styles.heroGreenBadge}
              onClick={() => router.push(ROUTES.settingsStudio)}
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Symbol name="add" size={14} className={styles.greenBadgeGlyph} />
            </button>
          </div>
          <div className={styles.heroHandleRow}>
            <span className={styles.heroHandlePill}>
              <span className={styles.heroHandleAt}>@</span>
              <span className={styles.heroHandleText}>
                {currentShop?.slug || (currentShop?.name ? currentShop.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'studio')}
              </span>
            </span>
            <span className={styles.heroHandleDot}>·</span>
            <span className={styles.heroCurrencyPill}>{getShopCurrency(currentShop)}</span>
          </div>
        </div>
      </section>

      <div className={styles.groups}>
        {/* ── Group 1: Subscriptions, Styles, Messages, Lookbook ── */}
        <div className={styles.groupCard}>
          <SettingsRow
            icon="workspace_premium"
            label="Subscriptions"
            subtitle={
              currentShop?.subscriptionStatus === 'active'
                ? 'Pro Member · Active Plan'
                : currentShop?.subscriptionStatus === 'trialing'
                  ? 'Free Trial Active'
                  : currentShop?.subscriptionStatus === 'past_due'
                    ? 'Payment Failed · Update Card'
                    : 'Free Tier · Tap to Upgrade'
            }
            external
            onClick={() => router.push(ROUTES.settingsBilling)}
          />
          <SettingsRow
            icon="checkroom"
            label="Garment Styles &amp; Base Prices"
            subtitle={customStylesCount > 0 ? `${customStylesCount} signature styles configured` : 'Standard silhouettes & base prices'}
            onClick={() => router.push(ROUTES.settingsStyles)}
          />
          <SettingsRow
            icon="campaign"
            label="Broadcast &amp; Client Messages"
            subtitle="Per-stage update wording &amp; live tracking links"
            onClick={() => router.push(ROUTES.settingsMessages)}
          />
          <SettingsRow
            icon="photo_library"
            label="Public Portfolio &amp; Lookbook"
            subtitle={`${APP_CONFIG.domain}/studio/${currentShop?.slug || ''}`}
            external
            onClick={() => router.push(ROUTES.settingsPortfolio)}
          />
          {/* {(currentShop?.businessMode === 'rtw' || currentShop?.businessMode === 'hybrid') && (
            <SettingsRow
              icon="straighten"
              label="Size Charts"
              subtitle="Standard measurements for production batches"
              onClick={() => router.push('/settings/size-charts')}
            />
          )} */}
        </div>

        {/* ── Group 2: Workshop Operations, Appearance & Notifications ── */}
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
          <AppearanceToggle />
          <SettingsRow
            icon="notifications"
            label="Notifications"
            subtitle="Push alerts and customer status pings"
            onClick={() => router.push('/notifications')}
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

        {/* ── Group 3: Help & Referrals ── */}
        <div className={styles.groupCard}>
          <SettingsRow
            icon="help_outline"
            label="Help and feedback"
            subtitle={`Guides, tutorials & WhatsApp support (+234 816 375 2061)`}
            onClick={() =>
              window.open(
                `https://wa.me/${APP_CONFIG.supportWhatsApp}?text=${encodeURIComponent('Hello MyStitchBook Support, I need assistance with my tailoring shop.')}`,
                '_blank'
              )
            }
          />
          <SettingsRow
            icon="group_add"
            label="Invite Colleagues"
            subtitle="Share your personal invite link & code"
            onClick={() => setInviteModalOpen(true)}
          />
        </div>

        {/* ── Group 4: WhatsApp-Style Standalone Accounts Centre Card ── */}
        <div
          className={styles.accountsCentreCard}
          onClick={() => router.push(ROUTES.settingsAccount)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(ROUTES.settingsAccount);
            }
          }}
          aria-label="Open Accounts Centre"
        >
          <div className={styles.accountsCentreLeft}>
            <div className={styles.accountsCentreIconWrap}>
              <Symbol name="all_inclusive" size={24} className={styles.accountsCentreIcon} />
            </div>
            <div className={styles.accountsCentreText}>
              <span className={styles.accountsCentreTitle}>Accounts Centre</span>
              <p className={styles.accountsCentreDesc}>
                Control your profile, login credentials, privacy, and workshop devices across MyStitchBook.
              </p>
            </div>
          </div>
          <div className={styles.accountsCentreRight}>
            <Symbol name="chevron_right" size={20} className={styles.accountsCentreChevron} />
          </div>
        </div>

        {/* ── Group 5: Workshop Social Hub (WhatsApp 'Also from Meta' Style) ── */}
        <div className={styles.alsoFromSection}>
          <div className={styles.alsoFromHeader}>
            <span className={styles.alsoFromTitle}>Also from StitchBook</span>
            <button
              type="button"
              className={styles.alsoFromEditLink}
              onClick={() => router.push(ROUTES.settingsStudio)}
            >
              Edit handles
            </button>
          </div>
          <div className={styles.alsoFromCard}>
            <button
              type="button"
              className={`${styles.socialIconItem} ${currentShop?.socialLinks?.instagram ? styles.socialIconActive : ''}`}
              onClick={() => {
                if (currentShop?.socialLinks?.instagram) {
                  const handle = currentShop.socialLinks.instagram
                    .replace(/^@/, '')
                    .replace(/.*instagram\.com\//, '')
                    .replace(/\/$/, '');
                  window.open(`https://instagram.com/${handle}`, '_blank');
                } else {
                  router.push(ROUTES.settingsStudio);
                }
              }}
              title={currentShop?.socialLinks?.instagram ? `Open ${currentShop.socialLinks.instagram}` : 'Connect Instagram'}
            >
              <div className={styles.socialCircle}>
                <InstagramIcon size={22} />
              </div>
              <span className={styles.socialLabel}>Instagram</span>
            </button>

            <button
              type="button"
              className={`${styles.socialIconItem} ${currentShop?.socialLinks?.tiktok ? styles.socialIconActive : ''}`}
              onClick={() => {
                if (currentShop?.socialLinks?.tiktok) {
                  const handle = currentShop.socialLinks.tiktok
                    .replace(/^@/, '')
                    .replace(/.*tiktok\.com\/@?/, '')
                    .replace(/\/$/, '');
                  window.open(`https://tiktok.com/@${handle}`, '_blank');
                } else {
                  router.push(ROUTES.settingsStudio);
                }
              }}
              title={currentShop?.socialLinks?.tiktok ? `Open ${currentShop.socialLinks.tiktok}` : 'Connect TikTok'}
            >
              <div className={styles.socialCircle}>
                <TiktokIcon size={20} />
              </div>
              <span className={styles.socialLabel}>TikTok</span>
            </button>

            <button
              type="button"
              className={`${styles.socialIconItem} ${currentShop?.socialLinks?.website ? styles.socialIconActive : ''}`}
              onClick={() => {
                if (currentShop?.socialLinks?.website) {
                  const raw = currentShop.socialLinks.website.startsWith('http')
                    ? currentShop.socialLinks.website
                    : `https://${currentShop.socialLinks.website}`;
                  window.open(raw, '_blank');
                } else {
                  router.push(ROUTES.settingsStudio);
                }
              }}
              title={currentShop?.socialLinks?.website ? `Open ${currentShop.socialLinks.website}` : 'Connect Website'}
            >
              <div className={styles.socialCircle}>
                <Symbol name="language" size={22} />
              </div>
              <span className={styles.socialLabel}>Website</span>
            </button>

            <button
              type="button"
              className={styles.socialIconItem}
              onClick={() =>
                window.open(
                  `https://wa.me/${APP_CONFIG.supportWhatsApp}?text=${encodeURIComponent('Hello MyStitchBook Support')}`,
                  '_blank'
                )
              }
              title="Official WhatsApp Support (+234 816 375 2061)"
            >
              <div className={`${styles.socialCircle} ${styles.whatsappCircle}`}>
                <WhatsappIcon size={22} />
              </div>
              <span className={styles.socialLabel}>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* ── Group 6: Session & Sign Out ── */}
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

      <InviteColleaguesModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        referralCode={currentShop?.referralCode}
        shopName={currentShop?.name}
        shopSlug={currentShop?.slug}
      />
    </PageLayout>
  );
}
