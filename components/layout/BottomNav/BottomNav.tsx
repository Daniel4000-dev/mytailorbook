'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHouse, FaTableColumns, FaUsers, FaGear } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';
import styles from './BottomNav.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  FaHouse: <FaHouse />,
  FaTableColumns: <FaTableColumns />,
  FaUsers: <FaUsers />,
  FaGear: <FaGear />,
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
            <span className={styles.icon}>{ICON_MAP[item.icon]}</span>
            <span className={styles.label}>{item.label}</span>
            {isActive && <span className={styles.indicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
