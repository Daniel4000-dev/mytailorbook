'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './BottomNav.module.css';

/** NAV_ITEMS icon keys → Material Symbols names (new design icon set). */
const SYMBOL_MAP: Record<string, string> = {
  FaHouse: 'dashboard',
  FaTableColumns: 'precision_manufacturing',
  FaUsers: 'group',
  FaGear: 'settings',
};

/** Must be a descendant of <Link> — useLinkStatus only reports the pending
 *  state of whichever Link it's nested inside. Highlighting on `pending`
 *  (not just the matched pathname) makes the tap feel instant instead of
 *  waiting for the route to actually finish committing. */
function NavItemContent({ icon, label, isActive }: { icon: string; label: string; isActive: boolean }) {
  const { pending } = useLinkStatus();
  const active = isActive || pending;
  return (
    <div className={`${styles.item} ${active ? styles.active : ''}`}>
      <Symbol name={icon} fill={active} size={24} className={styles.icon} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { isOwner } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => (!item.ownerOnly || isOwner) && item.href !== '/settings');

  return (
    <nav className={styles.nav}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className={styles.linkReset}>
            <NavItemContent icon={SYMBOL_MAP[item.icon] || 'circle'} label={item.label} isActive={isActive} />
          </Link>
        );
      })}
    </nav>
  );
}
