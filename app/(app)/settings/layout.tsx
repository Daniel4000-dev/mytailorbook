'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { useData } from '@/contexts/DataContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

const NAV_ITEMS: { href: string; icon: string; label: string; rtwOnly?: boolean }[] = [
  { href: '/settings/account', icon: 'person', label: 'Account' },
  { href: '/settings/studio', icon: 'storefront', label: 'Your Studio' },
  { href: '/settings/billing', icon: 'workspace_premium', label: 'Billing & Subscription' },
  { href: '/settings/staff', icon: 'group', label: 'Your Team' },
  { href: '/settings/styles', icon: 'checkroom', label: 'Garment Styles' },
  { href: '/settings/size-charts', icon: 'straighten', label: 'Size Charts', rtwOnly: true },
  { href: '/settings/messages', icon: 'forum', label: 'Messages & Templates' },
  { href: '/settings/portfolio', icon: 'photo_library', label: 'Public Portfolio' },
  ...(FEATURE_FLAGS.financialReporting ? [{ href: '/settings/reports', icon: 'bar_chart', label: 'Financials' }] : []),
  ...(FEATURE_FLAGS.auditLog ? [{ href: '/settings/activity', icon: 'history', label: 'Security' }] : []),
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const { currentShop } = useData();

  if (!isDesktop) {
    return <>{children}</>;
  }

  const mode = currentShop?.businessMode || 'bespoke';
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.rtwOnly && mode === 'bespoke') return false;
    return true;
  });

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <span className={styles.navTitle}>Settings</span>
        {visibleItems.map((item) => {
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
