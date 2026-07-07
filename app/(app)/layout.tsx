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
import OrderForm from '@/components/forms/OrderForm/OrderForm';
import CustomerForm from '@/components/forms/CustomerForm/CustomerForm';
import SidebarMenu from '@/components/layout/SidebarMenu/SidebarMenu';
import LogoutOverlay from '@/components/layout/LogoutOverlay/LogoutOverlay';
import InstallPrompt from '@/components/pwa/InstallPrompt/InstallPrompt';
import styles from './layout.module.css';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const { isMenuOpen, setMenuOpen, isCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { needsOnboarding, loading: authLoading, isLoggingOut } = useAuth();
  // The FAB creates orders/customers — not a relevant action on Settings,
  // where it would otherwise float over the Register Employee form.
  const showFab = !pathname.startsWith('/settings');

  // First-time Google sign-in: a real Supabase session exists but no shop/
  // profile yet (OAuth gave no chance to ask for a shop name up front).
  useEffect(() => {
    if (!authLoading && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [authLoading, needsOnboarding, router]);

  useEffect(() => {
    const color = isMenuOpen ? '#FAF2E8' : '#FFFFFF';
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
      {!isMenuOpen && <BottomNav />}
      {!isMenuOpen && <InstallPrompt />}

      {/* Create Action Menu */}
      <BottomSheet
        isOpen={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        title="Create New"
      >
        <div className={styles.actionMenu}>
          <button
            className={styles.actionMenuItem}
            onClick={() => { setShowActionMenu(false); setShowOrderForm(true); }}
          >
            New Order
          </button>
          <button
            className={styles.actionMenuItem}
            onClick={() => { setShowActionMenu(false); setShowCustomerForm(true); }}
          >
            New Customer
          </button>
        </div>
      </BottomSheet>

      {/* Forms */}
      <BottomSheet
        isOpen={showOrderForm}
        onClose={() => setShowOrderForm(false)}
        title="New Order"
      >
        <OrderForm onClose={() => setShowOrderForm(false)} />
      </BottomSheet>

      <BottomSheet
        isOpen={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        title="New Customer"
      >
        <CustomerForm onClose={() => setShowCustomerForm(false)} />
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
