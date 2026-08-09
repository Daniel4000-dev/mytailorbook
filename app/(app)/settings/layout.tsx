'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

const NAV_ITEMS: { href: string; icon: string; label: string }[] = [
  { href: '/settings/account', icon: 'person', label: 'Account' },
  { href: '/settings/studio', icon: 'storefront', label: 'Your Studio' },
  { href: '/settings/billing', icon: 'workspace_premium', label: 'Billing & Subscription' },
  { href: '/settings/staff', icon: 'group', label: 'Your Team' },
  { href: '/settings/styles', icon: 'checkroom', label: 'Garment Styles' },
  { href: '/settings/messages', icon: 'forum', label: 'Messages & Templates' },
  { href: '/settings/portfolio', icon: 'photo_library', label: 'Public Portfolio' },
  ...(FEATURE_FLAGS.financialReporting ? [{ href: '/settings/reports', icon: 'bar_chart', label: 'Financials' }] : []),
  ...(FEATURE_FLAGS.auditLog ? [{ href: '/settings/activity', icon: 'history', label: 'Security' }] : []),
];

/** Desktop only: a persistent left-hand category list beside whichever
 *  settings page is active, so switching sections doesn't mean losing your
 *  place and re-navigating from the overview list every time — the same
 *  two-pane pattern a real desktop settings window uses (macOS System
 *  Settings, or the "Customer Profile" admin-dashboard reference this
 *  redesign has followed throughout). Mobile gets none of this — {children}
 *  renders alone, exactly as if this layout didn't exist, so the existing
 *  drill-down list + full-page sections on mobile are completely
 *  unaffected. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <span className={styles.navTitle}>Settings</span>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Symbol name={item.icon} size={20} className={styles.navIcon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
