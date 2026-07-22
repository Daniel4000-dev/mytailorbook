'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { APP_CONFIG } from '@/lib/config';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import {
  FaRegUser,
  FaRegHeart,
  FaArrowRightFromBracket,
  FaHouse,
  FaTableColumns,
  FaUsers,
  FaGear,
  FaChevronLeft,
  FaChevronRight
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
  const { logout, isOwner } = useAuth();
  const { currentShop } = useData();
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

      {/* Collapse Toggle Button for Desktop */}
      <button 
        className={styles.collapseToggle}
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>

      {/* Mobile-only Portfolio link — Settings moved to the bottom nav's
          4th tab, so it no longer needs a separate entry here. */}
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
        </div>
      </BottomSheet>
    </div>
  );
}
