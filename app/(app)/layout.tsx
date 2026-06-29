'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { DataProvider } from '@/contexts/DataContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import BottomNav from '@/components/layout/BottomNav/BottomNav';
import FAB from '@/components/ui/FAB/FAB';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import OrderForm from '@/components/forms/OrderForm/OrderForm';
import CustomerForm from '@/components/forms/CustomerForm/CustomerForm';
import SidebarMenu from '@/components/layout/SidebarMenu/SidebarMenu';
import styles from './layout.module.css';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const { isMenuOpen, setMenuOpen, isCollapsed } = useSidebar();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isMenuOpen ? '#FAF2E8' : '#FFFFFF');
    }
  }, [isMenuOpen]);

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
        <main className={styles.main}>{children}</main>
        <FAB
          onClick={() => setShowActionMenu(true)}
          icon={<FaPlus />}
          label="Create action"
        />
        <BottomNav />
        
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
