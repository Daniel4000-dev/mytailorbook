'use client';

import { Suspense, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import InviteColleaguesModal from '@/components/ui/InviteColleaguesModal/InviteColleaguesModal';
import styles from './layout.module.css';

const NAV_ITEMS: { href: string; icon: string; label: string; rtwOnly?: boolean }[] = [
  { href: '/settings/studio', icon: 'storefront', label: 'Your Studio' },
  { href: '/settings/styles', icon: 'checkroom', label: 'Garment Styles' },
  { href: '/settings/messages', icon: 'forum', label: 'Messages & Templates' },
  { href: '/settings/portfolio', icon: 'photo_library', label: 'Public Portfolio' },
  { href: '/settings/size-charts', icon: 'straighten', label: 'Size Charts', rtwOnly: true },
  { href: '/settings/staff', icon: 'group', label: 'Your Team' },
  { href: '/settings/billing', icon: 'workspace_premium', label: 'Billing & Subscription' },
  { href: '/settings/account', icon: 'person', label: 'Account & Login' },
  ...(FEATURE_FLAGS.financialReporting ? [{ href: '/settings/reports', icon: 'bar_chart', label: 'Financials' }] : []),
  ...(FEATURE_FLAGS.auditLog ? [{ href: '/settings/activity', icon: 'history', label: 'Security' }] : []),
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const { currentShop } = useData();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  if (!isDesktop) {
    return <Suspense fallback={null}>{children}</Suspense>;
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
        <div className={styles.navFooter}>
          <button
            type="button"
            className={styles.inviteBtn}
            onClick={() => setInviteModalOpen(true)}
          >
            <Symbol name="group_add" size={20} className={styles.inviteIcon} />
            <span>Invite Colleagues</span>
          </button>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => setShowLogoutConfirm(true)}
          >
            <Symbol name="logout" size={20} className={styles.logoutIcon} />
            <span>Log Out</span>
          </button>
        </div>
      </nav>
      <div className={styles.content}>
        <Suspense fallback={null}>{children}</Suspense>
      </div>

      <InviteColleaguesModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        referralCode={currentShop?.referralCode}
        shopName={currentShop?.name}
        shopSlug={currentShop?.slug}
      />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Log out of MyStitchBook?"
        description="You will need to sign in again to access your workshop and records."
        confirmLabel="Log Out"
        destructive
      />
    </div>
  );
}
