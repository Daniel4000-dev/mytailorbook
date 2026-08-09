'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { APP_CONFIG } from '@/lib/config';
import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import { useRouter, usePathname } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { ExportDataButton, AccountDangerZone } from '@/components/settings/AccountDangerZone';
import { NAV_ITEMS } from '@/lib/constants';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import styles from './SidebarMenu.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import OnlineIndicator from '@/components/ui/OnlineIndicator/OnlineIndicator';

export default function SidebarMenu() {
  const { logout, isOwner, loading: authLoading } = useAuth();
  const { currentShop, shops, activeBranchId, setActiveBranchId, isLoaded } = useData();
  const shopName = currentShop?.name || APP_CONFIG.name;
  const { isMenuOpen, setMenuOpen, isCollapsed, toggleCollapse } = useSidebar();
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
            icon={<Symbol name="person" className={styles.iconUser} />} 
            onClick={() => setShowProfile(true)} 
            ariaLabel="Profile Settings"
          />
          <BrandIcon alt={shopName} className={styles.mobileLogo} />
        </div>

        {/* Desktop Branding (Logo & Shop Name) */}
        <div className={styles.desktopBranding}>
          <BrandIcon alt={shopName} className={styles.desktopLogo} />
          <span className={styles.desktopTitle} title={shopName}>{shopName.toUpperCase()}</span>
          {!isCollapsed && <OnlineIndicator />}
        </div>
      </div>

      {/* Only shown once an org actually has a second branch — every org
          today has exactly one, so this stays hidden for all of them. */}
      {FEATURE_FLAGS.orgBranchMultiTenancy && isOwner && shops.length > 1 && (
        <select
          className={styles.branchSwitcher}
          value={activeBranchId ?? ''}
          onChange={(e) => setActiveBranchId(e.target.value)}
          aria-label="Switch branch"
        >
          {shops.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}{branch.isPrimary ? ' (Primary)' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Collapse Toggle Button for Desktop */}
      <button 
        className={styles.collapseToggle}
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <Symbol name={isCollapsed ? "chevron_right" : "chevron_left"} />
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
            <Symbol name="favorite" className={styles.menuIcon} />
            <span className={styles.menuText}>My Portfolio</span>
          </Link>
          <Link
            href="/styles"
            className={styles.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            <Symbol name="photo_library" className={styles.menuIcon} />
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
              <Symbol name={item.icon} className={styles.menuIcon} />
              <span className={styles.menuText}>{item.label}</span>
            </Link>
          );
        })}
        {/* Opens in-app (same tab) — the Share button on the page itself
            hands out the actual public /studio/[slug] link to visitors. */}
        {currentShop && (
          <Link
            href="/portfolio"
            className={styles.menuItem}
            title={isCollapsed ? 'My Portfolio' : undefined}
          >
            <Symbol name="favorite" className={styles.menuIcon} />
            <span className={styles.menuText}>My Portfolio</span>
          </Link>
        )}
        {currentShop && (
          <Link
            href="/styles"
            className={styles.menuItem}
            title={isCollapsed ? 'Style Gallery' : undefined}
          >
            <Symbol name="photo_library" className={styles.menuIcon} />
            <span className={styles.menuText}>Style Gallery</span>
          </Link>
        )}
      </nav>

      {/* Footer Navigation (Logout + connection indicator) */}
      <div className={styles.footer}>
        {/* Show inline on mobile; desktop shows it under the shop name in the
            branding area (hidden when collapsed). */}
        <OnlineIndicator className={styles.mobileOnlineIndicator} />
        <button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <Symbol name="logout" className={styles.logoutIcon} />
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
            <Symbol name="logout" />
            Logout
          </button>

          {FEATURE_FLAGS.dataExport && isOwner && <ExportDataButton shopName={shopName} />}

          <AccountDangerZone isOwner={isOwner} onClosingProfile={() => setShowProfile(false)} />
        </div>
      </BottomSheet>
    </div>
  );
}

