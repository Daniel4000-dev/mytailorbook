'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  setMenuOpen: (open: boolean) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  /** The "New Order / New Customer" action sheet — triggered by the mobile
   *  FAB and, on desktop (where a floating FAB doesn't belong in a
   *  sidebar-shell app), a button inside SidebarMenu itself. Lives here so
   *  both triggers and the one sheet that owns the state can share it. */
  isCreateMenuOpen: boolean;
  openCreateMenu: () => void;
  closeCreateMenu: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const setMenuOpen = (open: boolean) => setIsMenuOpen(open);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const setCollapsed = (collapsed: boolean) => setIsCollapsed(collapsed);
  const openCreateMenu = () => setIsCreateMenuOpen(true);
  const closeCreateMenu = () => setIsCreateMenuOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        isMenuOpen,
        toggleMenu,
        setMenuOpen,
        isCollapsed,
        toggleCollapse,
        setCollapsed,
        isCreateMenuOpen,
        openCreateMenu,
        closeCreateMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
