'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './SidebarEdgeHandle.module.css';

/** A half-circle tab peeking in from the left edge — mobile only, since
 *  desktop already shows a permanent sidebar. Replaces the old inline
 *  hamburger button that every page's TopBar used to render individually;
 *  this is the one shared trigger for all of them. Closing the sidebar is
 *  handled elsewhere (tapping the shrunk main content — see
 *  app/(app)/layout.tsx), so this only ever needs to open it. */
export default function SidebarEdgeHandle() {
  const { toggleMenu } = useSidebar();

  return (
    <button
      type="button"
      className={styles.handle}
      onClick={toggleMenu}
      aria-label="Open menu"
    >
      <Symbol name="chevron_right" size={20} />
    </button>
  );
}
