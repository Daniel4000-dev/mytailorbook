'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

interface AdminNavLinkProps {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
}

export default function AdminNavLink({ href, label, icon, badge }: AdminNavLinkProps) {
  const pathname = usePathname();
  const active = href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}>
      <Symbol name={icon} size={18} className={styles.navIcon} />
      <span className={styles.navLabel}>{label}</span>
      {badge !== undefined && <span className={styles.navBadge}>{badge}</span>}
    </Link>
  );
}

