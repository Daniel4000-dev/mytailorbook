import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { ROUTES } from '@/lib/routes';
import AdminNavLink from './AdminNavLink';
import styles from './layout.module.css';

// Root layout already defaults every page to noindex — this is just
// explicit belt-and-suspenders for a route that must never be crawlable,
// on top of the SEARCH_DISALLOW entry in lib/routes.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: ROUTES.admin, label: 'Overview' },
  { href: `${ROUTES.admin}/organizations`, label: 'Organizations' },
  { href: `${ROUTES.admin}/affiliates`, label: 'Affiliates' },
  { href: `${ROUTES.admin}/activity`, label: 'Activity' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>MyStitchBook — Internal</span>
        <span className={styles.adminName}>{admin.name || admin.email}</span>
      </header>
      <div className={styles.body}>
        <nav className={styles.sidebar}>
          {NAV_ITEMS.map((item) => (
            <AdminNavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
