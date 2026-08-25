'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

export default function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}>
      {label}
    </Link>
  );
}
