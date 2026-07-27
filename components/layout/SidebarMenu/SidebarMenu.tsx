'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useToast } from '@/contexts/ToastContext';
import { APP_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { deleteOwnShopAction, deleteOwnStaffAccountAction } from '@/app/actions';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import {
  FaRegUser,
  FaRegHeart,
  FaImages,
  FaPlus,
  FaArrowRightFromBracket,
  FaHouse,
  FaTableColumns,
  FaUsers,
  FaGear,
  FaChevronLeft,
  FaChevronRight,
  FaTriangleExclamation
} from 'react-icons/fa6';
import { NAV_ITEMS } from '@/lib/constants';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import styles from './SidebarMenu.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  FaHouse: <FaHouse className={styles.menuIcon} />,
  FaTableColumns: <FaTableColumns className={styles.menuIcon} />,
  FaUsers: <FaUsers className={styles.menuIcon} />,
  FaGear: <FaGear className={styles.menuIcon} />,
};

export default function SidebarMenu() {
  const { logout, isOwner, loading: authLoading } = useAuth();
  const { currentShop, isLoaded } = useData();
  const shopName = currentShop?.name || APP_CONFIG.name;
  const { isMenuOpen, setMenuOpen, isCollapsed, toggleCollapse, openCreateMenu } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/login');
  };

  // Both the real shop name and the Portfolio/Style Gallery links depend on
  // currentShop/role resolving — rendering before then shows a generic
  // wordmark and a shorter nav that visibly grows/renames itself a beat
  // later. Same tradeoff BottomNav already makes: waiting an extra beat for
  // a stable, correct-on-first-paint sidebar reads far better than content
  // jumping under the user's cursor.
  if (authLoading || !isLoaded) return null;

  return (
    <div className={`${styles.sidebar} ${isMenuOpen ? styles.open : ''} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Top Bar / Branding Container */}
      <div className={styles.topRow}>
        {/* Mobile Top Row (Profile Avatar and Close Button) */}
        <div className={styles.mobileTopRow}>
          <CircleIconButton 
            icon={<FaRegUser className={styles.iconUser} />} 
            onClick={() => setShowProfile(true)} 
            ariaLabel="Profile Settings"
          />
          <img
            src="/images/logo-mark.png"
            alt={shopName}
            className={styles.mobileLogo}
          />
        </div>

        {/* Desktop Branding (Logo & Shop Name) */}
        <div className={styles.desktopBranding}>
          <img
            src="/images/logo-mark.png"
            alt={shopName}
            className={styles.desktopLogo}
          />
          <span className={styles.desktopTitle} title={shopName}>{shopName.toUpperCase()}</span>
        </div>
      </div>

      {/* Desktop's equivalent of the mobile FAB — a floating "+" belongs to
          a bottom-nav app, not a persistent sidebar shell, so desktop gets
          the same New Order/New Customer sheet from a button in the rail
          instead (see SidebarContext's isCreateMenuOpen). */}
      <button
        type="button"
        className={styles.newBtn}
        onClick={openCreateMenu}
        title={isCollapsed ? 'New' : undefined}
      >
        <FaPlus className={styles.newIcon} />
        <span className={styles.menuText}>New</span>
      </button>

      {/* Collapse Toggle Button for Desktop */}
      <button 
        className={styles.collapseToggle}
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>

      {/* Mobile-only Portfolio/Style Gallery links — Settings moved to the
          bottom nav's 4th tab, so it no longer needs a separate entry here.
          Style Gallery isn't in NAV_ITEMS (which also feeds the bottom nav)
          since it's a secondary, occasional destination, not a daily tab. */}
      {currentShop && (
        <div className={styles.mobileOnlyNav}>
          <Link
            href="/portfolio"
            className={styles.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            <FaRegHeart className={styles.menuIcon} />
            <span className={styles.menuText}>My Portfolio</span>
          </Link>
          <Link
            href="/styles"
            className={styles.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            <FaImages className={styles.menuIcon} />
            <span className={styles.menuText}>Style Gallery</span>
          </Link>
        </div>
      )}

      {/* Primary Main Navigation (Desktop only, hidden on mobile sidebar) */}
      <nav className={styles.mainNav}>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link 
              href={item.href}
              key={item.href} 
              className={`${styles.menuItem} ${isActive ? styles.active : ''}`} 
              onClick={() => setMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
            >
              {ICON_MAP[item.icon]}
              <span className={styles.menuText}>{item.label}</span>
            </Link>
          );
        })}
        {/* Opens in-app (same tab) — the Share button on the page itself
            hands out the actual public /studio/[shopId] link to visitors. */}
        {currentShop && (
          <Link
            href="/portfolio"
            className={styles.menuItem}
            title={isCollapsed ? 'My Portfolio' : undefined}
          >
            <FaRegHeart className={styles.menuIcon} />
            <span className={styles.menuText}>My Portfolio</span>
          </Link>
        )}
        {currentShop && (
          <Link
            href="/styles"
            className={styles.menuItem}
            title={isCollapsed ? 'Style Gallery' : undefined}
          >
            <FaImages className={styles.menuIcon} />
            <span className={styles.menuText}>Style Gallery</span>
          </Link>
        )}
      </nav>

      {/* Footer Navigation (Logout only) */}
      <div className={styles.footer}>
        <button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <FaArrowRightFromBracket className={styles.logoutIcon} />
          <span className={styles.logoutText}>Logout</span>
        </button>
      </div>

      <BottomSheet isOpen={showProfile} onClose={() => setShowProfile(false)}>
        <div style={{ padding: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-md)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--sf-text-lg)', fontWeight: 'var(--sf-weight-semibold)', color: 'var(--sf-text-primary)' }}>
              Profile
            </h3>
            <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)', marginTop: 'var(--sf-space-xs)' }}>
              {isOwner ? 'Owner Account' : 'Staff Account'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowProfile(false);
              handleLogout();
            }}
            style={{
              padding: 'var(--sf-space-sm) var(--sf-space-md)',
              borderRadius: 'var(--sf-radius-md)',
              border: 'none',
              background: 'var(--sf-error-bg)',
              color: 'var(--sf-error)',
              fontWeight: 'var(--sf-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--sf-space-sm)',
              cursor: 'pointer'
            }}
          >
            <FaArrowRightFromBracket />
            Logout
          </button>

          <DangerZone isOwner={isOwner} onClosingProfile={() => setShowProfile(false)} />
        </div>
      </BottomSheet>
    </div>
  );
}

function DangerZone({ isOwner, onClosingProfile }: { isOwner: boolean; onClosingProfile: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmStaffDelete, setConfirmStaffDelete] = useState(false);

  const handleDeleteShop = async () => {
    setDeleting(true);
    const { error } = await deleteOwnShopAction();
    if (error) {
      showToast(error, 'error');
      setDeleting(false);
      return;
    }
    onClosingProfile();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  const handleDeleteStaffAccount = async () => {
    setDeleting(true);
    const { error } = await deleteOwnStaffAccountAction();
    if (error) {
      showToast(error, 'error');
      setDeleting(false);
      return;
    }
    onClosingProfile();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  return (
    <div style={{ borderTop: '1px solid var(--sf-border-light)', paddingTop: 'var(--sf-space-md)', marginTop: 'var(--sf-space-xs)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sf-space-sm)',
          background: 'none',
          border: 'none',
          color: 'var(--sf-text-secondary)',
          fontSize: 'var(--sf-text-sm)',
          fontWeight: 'var(--sf-weight-medium)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <FaTriangleExclamation style={{ color: 'var(--sf-error)' }} />
        Danger Zone
      </button>

      {expanded && (
        <div style={{ marginTop: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-sm)' }}>
          {isOwner ? (
            <>
              <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>
                This permanently deletes your entire shop — every order, customer, staff account, and photo. This cannot be undone.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                style={{
                  padding: 'var(--sf-space-sm)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: '1px solid var(--sf-border-light)',
                  fontSize: 'var(--sf-text-sm)',
                }}
              />
              <button
                onClick={handleDeleteShop}
                disabled={confirmText !== 'DELETE' || deleting}
                style={{
                  padding: 'var(--sf-space-sm) var(--sf-space-md)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: 'none',
                  background: confirmText === 'DELETE' ? 'var(--sf-error)' : 'var(--sf-error-bg)',
                  color: confirmText === 'DELETE' ? '#fff' : 'var(--sf-error)',
                  fontWeight: 'var(--sf-weight-medium)',
                  cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Permanently Delete My Shop'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>
                This permanently deletes your own staff account. Orders assigned to you will become unassigned, not deleted.
              </p>
              <button
                onClick={() => setConfirmStaffDelete(true)}
                style={{
                  padding: 'var(--sf-space-sm) var(--sf-space-md)',
                  borderRadius: 'var(--sf-radius-md)',
                  border: 'none',
                  background: 'var(--sf-error)',
                  color: '#fff',
                  fontWeight: 'var(--sf-weight-medium)',
                  cursor: 'pointer',
                }}
              >
                Delete My Account
              </button>
              <ConfirmDialog
                isOpen={confirmStaffDelete}
                onClose={() => setConfirmStaffDelete(false)}
                onConfirm={handleDeleteStaffAccount}
                title="Delete your account?"
                description="This permanently deletes your staff account and cannot be undone."
                confirmLabel={deleting ? 'Deleting…' : 'Delete My Account'}
                loading={deleting}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
