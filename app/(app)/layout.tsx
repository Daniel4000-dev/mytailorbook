'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaPlus } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import BottomNav from '@/components/layout/BottomNav/BottomNav';
import FAB from '@/components/ui/FAB/FAB';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import SidebarMenu from '@/components/layout/SidebarMenu/SidebarMenu';
import LogoutOverlay from '@/components/layout/LogoutOverlay/LogoutOverlay';
import InstallPrompt from '@/components/pwa/InstallPrompt/InstallPrompt';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const { isMenuOpen, setMenuOpen, isCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { needsOnboarding, loading: authLoading, isLoggingOut } = useAuth();
  // The new-client wizard is a focused, transactional flow — global nav
  // and the create-FAB get out of its way (it brings its own action bar).
  const isTransactional = pathname === '/customers/new' || pathname === '/orders/new';
  // The FAB creates orders/customers — not a relevant action on Settings
  // (it would float over the Register Employee form) or on an order's own
  // page, which has its floating WhatsApp shortcut in the same spot.
  const showFab = !pathname.startsWith('/settings') && !/^\/production\/./.test(pathname) && !isTransactional;

  // First-time Google sign-in: a real Supabase session exists but no shop/
  // profile yet (OAuth gave no chance to ask for a shop name up front).
  useEffect(() => {
    if (!authLoading && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [authLoading, needsOnboarding, router]);

  useEffect(() => {
    const color = isMenuOpen ? '#ECECFB' : '#F8F8FE';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
  }, [isMenuOpen]);

  if (isLoggingOut) {
    return <LogoutOverlay />;
  }

  return (
    <div className={`${styles.outerWrapper} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* 1. Fixed sidebar menu sitting behind the appShell */}
      <SidebarMenu />

      {/* 2. Middle offset card to give layered 3D depth */}
      <div className={`${styles.depthLayer} ${isMenuOpen ? styles.menuOpen : ''}`} />

      {/* 3. Main app Shell (scales down and pushes right when menu is open) */}
      <div
        className={`${styles.appShell} ${isMenuOpen ? styles.menuOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}
        onClick={isMenuOpen ? () => setMenuOpen(false) : undefined}
      >
        <main className={styles.main}>
          <div key={pathname} className={styles.pageEnter}>
            {children}
          </div>
        </main>
      </div>

      {/* Fixed UI lives outside .appShell on purpose — .appShell gets a real
          `transform` whenever the sidebar opens (the scale/translate "depth
          card" effect), and once a `position: fixed` element has ever sat
          inside a transformed ancestor, some mobile browsers permanently
          mis-associate its containing block — it can stop tracking the
          real viewport during scroll until something forces a reflow
          (e.g. reopening the sidebar), which is exactly the "bottom nav
          disappears until I open the sidebar again" bug this fixes. */}
      {!isMenuOpen && showFab && (
        <FAB
          onClick={() => setShowActionMenu(true)}
          icon={<FaPlus />}
          label="Create action"
        />
      )}
      {!isMenuOpen && !isTransactional && <BottomNav />}
      {!isMenuOpen && <InstallPrompt />}

      {/* Create Action Menu */}
      <BottomSheet
        isOpen={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        title="New Order"
      >
        <div className={styles.actionMenu}>
          <p className={styles.actionMenuHint}>Select the client profile to begin.</p>
          <button
            className={styles.actionOption}
            onClick={() => { setShowActionMenu(false); router.push('/orders/new'); }}
          >
            <span className={styles.actionOptionIcon}>
              <Symbol name="group" fill size={24} />
            </span>
            <span className={styles.actionOptionText}>
              <span className={styles.actionOptionTitle}>Existing Customer</span>
              <span className={styles.actionOptionDesc}>Select from your client roster</span>
            </span>
            <Symbol name="arrow_forward_ios" size={16} className={styles.actionOptionChevron} />
          </button>
          <button
            className={styles.actionOption}
            onClick={() => { setShowActionMenu(false); router.push('/customers/new'); }}
          >
            <span className={styles.actionOptionIcon}>
              <Symbol name="person_add" fill size={24} />
            </span>
            <span className={styles.actionOptionText}>
              <span className={styles.actionOptionTitle}>Walk-in / New Customer</span>
              <span className={styles.actionOptionDesc}>Create a new measurement profile</span>
            </span>
            <Symbol name="arrow_forward_ios" size={16} className={styles.actionOptionChevron} />
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </DataProvider>
  );
}
