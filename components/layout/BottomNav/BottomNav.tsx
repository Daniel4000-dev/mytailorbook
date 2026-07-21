'use client';

import Link from 'next/link';
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

export default function BottomNav() {
  const pathname = usePathname();
  const { isOwner } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => (!item.ownerOnly || isOwner) && item.href !== '/settings');

  return (
    <nav className={styles.nav}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
          >
            <Symbol name={SYMBOL_MAP[item.icon] || 'circle'} fill={isActive} size={24} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
