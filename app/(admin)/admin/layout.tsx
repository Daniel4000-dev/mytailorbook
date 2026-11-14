import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { ROUTES } from '@/lib/routes';
import Symbol from '@/components/ui/Symbol/Symbol';
import AdminNavLink from './AdminNavLink';
import styles from './layout.module.css';

// Root layout already defaults every page to noindex — this is just
// explicit belt-and-suspenders for a route that must never be crawlable,
// on top of the SEARCH_DISALLOW entry in lib/routes.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: ROUTES.admin, label: 'Overview', icon: 'dashboard' },
  { href: `${ROUTES.admin}/active-users`, label: 'Live Engagement', icon: 'monitoring' },
  { href: `${ROUTES.admin}/organizations`, label: 'Ateliers & Orgs', icon: 'store' },
  { href: `${ROUTES.admin}/affiliates`, label: 'Affiliates', icon: 'group' },
  { href: `${ROUTES.admin}/activity`, label: 'Audit Trail', icon: 'history' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className={styles.shell}>
      {/* Top Navigation Bar with Frosted Glass & Quick Actions */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={ROUTES.admin} className={styles.brandLink}>
            <div className={styles.brandBadge}>
              <Symbol name="verified" size={16} />
            </div>
            <div className={styles.brandTextGroup}>
              <span className={styles.brandTitle}>MyStitchBook</span>
              <span className={styles.brandSubtitle}>Control Tower</span>
            </div>
          </Link>
          <span className={styles.envTag}>DEV / STAGING</span>
        </div>

        <div className={styles.headerRight}>
          <Link href={ROUTES.dashboard} className={styles.viewAtelierBtn}>
            <Symbol name="arrow_back" size={14} />
            <span>Switch to Atelier App</span>
          </Link>
          <div className={styles.adminProfile}>
            <div className={styles.adminAvatar}>
              {(admin.name || admin.email || 'A')[0].toUpperCase()}
            </div>
            <div className={styles.adminMeta}>
              <span className={styles.adminName}>{admin.name || 'Platform Admin'}</span>
              <span className={styles.adminEmail}>{admin.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        {/* Modern Sidebar with category grouping */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarSectionLabel}>Management</span>
            <div className={styles.navStack}>
              {NAV_ITEMS.map((item) => (
                <AdminNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.versionPill}>
              <Symbol name="bolt" size={13} />
              <span>Engine v2.4 · Ready</span>
            </div>
          </div>
        </nav>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

