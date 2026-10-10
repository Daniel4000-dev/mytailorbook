'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './SidebarMenu.module.css';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { NAV_ITEMS } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { ExportDataButton, AccountDangerZone } from '@/components/settings/AccountDangerZone';
import OnlineIndicator from '@/components/ui/OnlineIndicator/OnlineIndicator';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';

export default function SidebarMenu() {
  const { isMenuOpen, setMenuOpen, isCollapsed, toggleCollapse } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { isOwner } = useAuth();
  const { currentShop, profile, shops, activeBranchId, setActiveBranchId } = useData();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.bespokeOnly && currentShop?.businessMode === 'rtw') return false;
    if (item.rtwOnly && currentShop?.businessMode === 'bespoke') return false;
    return true;
  });

  const shopName = currentShop?.name || 'Studio';

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) {
      console.error('Error logging out', e);
    }
  }

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderNavGroup = (title: string, items: typeof visibleNavItems, additionalLinks?: React.ReactNode) => {
    if (items.length === 0 && !additionalLinks) return null;
    return (
      <div className={styles.navSection}>
        <div className={styles.navSectionTitle}>{title}</div>
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              href={item.href}
              key={item.href}
              className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
              onClick={() => setMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
              data-tour-id={item.tourId}
            >
              <Symbol name={item.icon} className={styles.menuIcon} />
              <span className={styles.menuText}>{item.label}</span>
            </Link>
          );
        })}
        {additionalLinks}
      </div>
    );
  };

  const mainGroup = visibleNavItems.filter(i => ['/dashboard', '/calendar', '/production', '/stock'].includes(i.href));
  const workspaceGroup = visibleNavItems.filter(i => ['/customers', '/fabrics'].includes(i.href));
  const marketingGroup = visibleNavItems.filter(i => ['/catalogues'].includes(i.href));
  const financeGroup = visibleNavItems.filter(i => ['/collections', '/reconciliation'].includes(i.href));

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
          {!isCollapsed && (
            <div style={{ marginTop: '8px' }}>
              <OnlineIndicator />
            </div>
          )}
        </div>
      </div>

      {FEATURE_FLAGS.orgBranchMultiTenancy && isOwner && shops && shops.length > 1 && (
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

      {/* Mobile-only Nav (Flattened for bottom sheet style) */}
      <div className={styles.mobileOnlyNav}>
        <Link href={ROUTES.calendar} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
          <Symbol name="calendar_month" className={styles.menuIcon} />
          <span className={styles.menuText}>Calendar</span>
        </Link>
        <Link href={ROUTES.portfolio} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
          <Symbol name="favorite" className={styles.menuIcon} />
          <span className={styles.menuText}>My Portfolio</span>
        </Link>
        <Link href={ROUTES.styles} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
          <Symbol name="photo_library" className={styles.menuIcon} />
          <span className={styles.menuText}>Style Gallery</span>
        </Link>
        {isOwner && (
          <Link href={ROUTES.collections} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
            <Symbol name="account_balance_wallet" className={styles.menuIcon} />
            <span className={styles.menuText}>Collections</span>
          </Link>
        )}
        {isOwner && (
          <Link href={ROUTES.reconciliation} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
            <Symbol name="point_of_sale" className={styles.menuIcon} />
            <span className={styles.menuText}>Reconciliation</span>
          </Link>
        )}
        {isOwner && (
          <Link href={ROUTES.settings} className={styles.menuItem} onClick={() => setMenuOpen(false)}>
            <Symbol name="settings" className={styles.menuIcon} />
            <span className={styles.menuText}>Settings</span>
          </Link>
        )}
      </div>

      {/* Desktop Grouped Navigation */}
      <nav className={styles.mainNav}>
        {renderNavGroup('Main', mainGroup)}
        {renderNavGroup('Workspace', workspaceGroup)}
        {renderNavGroup('Storefront', marketingGroup, (
          currentShop ? (
            <>
              <Link href={ROUTES.portfolio} className={styles.menuItem} title={isCollapsed ? 'My Portfolio' : undefined} onClick={() => setMenuOpen(false)}>
                <Symbol name="favorite" className={styles.menuIcon} />
                <span className={styles.menuText}>My Portfolio</span>
              </Link>
              <Link href={ROUTES.styles} className={styles.menuItem} title={isCollapsed ? 'Style Gallery' : undefined} onClick={() => setMenuOpen(false)}>
                <Symbol name="photo_library" className={styles.menuIcon} />
                <span className={styles.menuText}>Style Gallery</span>
              </Link>
            </>
          ) : null
        ))}
        {renderNavGroup('Finance', financeGroup)}
      </nav>

      {/* Mobile Footer */}
      <div className={styles.mobileFooter}>
        <OnlineIndicator className={styles.mobileOnlineIndicator} />
        <button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
        >
          <Symbol name="logout" className={styles.logoutIcon} />
          <span className={styles.logoutText}>Logout</span>
        </button>
      </div>

      {/* Desktop Footer */}
      <div className={styles.desktopFooter} ref={profileMenuRef}>
        <OnlineIndicator className={styles.mobileOnlineIndicator} />

        {/* Profile Card / User Menu */}
        <button 
          className={styles.profileCard} 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title={isCollapsed ? "User Menu" : undefined}
        >
          <div className={styles.profileAvatar}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{profile?.full_name || 'Staff User'}</span>
            <span className={styles.profileRole}>{isOwner ? 'Owner' : 'Tailor'}</span>
          </div>
        </button>

        {showProfileMenu && (
          <div className={styles.profileMenu}>
            {isOwner && (
              <Link 
                href={ROUTES.settings} 
                className={styles.profileMenuItem}
                onClick={() => { setShowProfileMenu(false); setMenuOpen(false); }}
              >
                <Symbol name="settings" />
                Settings
              </Link>
            )}
            <button 
              className={styles.profileMenuItem} 
              onClick={() => { setShowProfileMenu(false); setShowProfile(true); }}
            >
              <Symbol name="person" />
              Your Profile
            </button>
            <div className={styles.profileMenuDivider} />
            <button 
              className={`${styles.profileMenuItem} ${styles.danger}`} 
              onClick={() => { setShowProfileMenu(false); handleLogout(); }}
            >
              <Symbol name="logout" />
              Log Out
            </button>
          </div>
        )}

        <button 
          className={styles.collapseToggle}
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Symbol name={isCollapsed ? "chevron_right" : "chevron_left"} className={styles.logoutIcon} />
          <span className={styles.logoutText}>Collapse</span>
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
