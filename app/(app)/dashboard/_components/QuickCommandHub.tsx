'use client';

import Symbol from '@/components/ui/Symbol/Symbol';
import { ROUTES } from '@/lib/routes';
import styles from './QuickCommandHub.module.css';

interface QuickCommandHubProps {
  onNavigate: (href: string) => void;
  uncutFabricsCount?: number;
  debtorsCount?: number;
}

export default function QuickCommandHub({
  onNavigate,
  uncutFabricsCount = 0,
  debtorsCount = 0,
}: QuickCommandHubProps) {
  const actions = [
    {
      id: 'new-order',
      label: 'New Order',
      href: ROUTES.orderNew,
      icon: 'add',
      badge: 0,
      badgeAlert: false,
    },
    {
      id: 'new-client',
      label: 'New Client',
      href: '/customers/new',
      icon: 'person_add',
      badge: 0,
      badgeAlert: false,
    },
    {
      id: 'quick-quote',
      label: 'Quick Quote',
      href: '/quotes',
      icon: 'calculate',
      badge: 0,
      badgeAlert: false,
    },
    {
      id: 'fabric-board',
      label: 'Fabrics',
      href: '/fabrics',
      icon: 'texture',
      badge: uncutFabricsCount,
      badgeAlert: uncutFabricsCount > 0,
    },
    {
      id: 'reconciliation',
      label: 'Cash Drawer',
      href: '/reconciliation',
      icon: 'point_of_sale',
      badge: 0,
      badgeAlert: false,
    },
    {
      id: 'collections',
      label: 'Collections',
      href: '/collections',
      icon: 'account_balance_wallet',
      badge: debtorsCount,
      badgeAlert: debtorsCount > 0,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Atelier Command</span>
      </div>

      <div className={styles.grid}>
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className={styles.tile}
            onClick={() => onNavigate(act.href)}
            aria-label={act.label}
          >
            {act.badge > 0 && (
              <span className={`${styles.badge} ${act.badgeAlert ? styles.badgeAlert : ''}`}>
                {act.badge}
              </span>
            )}
            <div className={styles.iconWrap}>
              <Symbol name={act.icon} size={20} />
            </div>
            <span className={styles.tileLabel}>{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
