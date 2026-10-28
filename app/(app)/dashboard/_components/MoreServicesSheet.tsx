'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency } from '@/lib/formatters';
import { useData } from '@/contexts/DataContext';
import { ROUTES } from '@/lib/routes';
import styles from './MoreServicesSheet.module.css';

interface MoreServicesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  debtTotal?: number;
}

export default function MoreServicesSheet({
  isOpen,
  onClose,
  onNavigate,
  debtTotal = 0,
}: MoreServicesSheetProps) {
  const { currentShop } = useData();

  const handleSelect = (href: string) => {
    onClose();
    onNavigate(href);
  };

  const services = [
    {
      title: 'Financial Intelligence & Margins',
      sub: 'Revenue, margin, customer debt & expense telemetry',
      icon: 'bar_chart',
      href: ROUTES.reports,
      iconClass: styles.iconDebt,
      badge: null,
    },
    {
      title: 'Ready-to-Wear Stock / POS',
      sub: 'Off-the-rack garments & walk-in sales',
      icon: 'storefront',
      href: '/stock',
      iconClass: styles.iconPortfolio,
      badge: null,
    },
    {
      title: 'Artisan Bench & Staff',
      sub: 'Assign garments to cutters, apprentices & tailors',
      icon: 'group_add',
      href: '/settings/staff',
      iconClass: styles.iconTeam,
      badge: null,
    },
    {
      title: 'Studio Settings & Receipts',
      sub: 'Shop profile, currency, invoice branding',
      icon: 'tune',
      href: '/settings',
      iconClass: styles.iconSettings,
      badge: null,
    },
    {
      title: 'Live Atelier Notifications',
      sub: 'Activity feed & customer order status alerts',
      icon: 'notifications',
      href: '/notifications',
      iconClass: styles.iconDebt,
      badge: null,
    },
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Atelier Tools & Management"
      noPadding
    >
      <div className={styles.container}>
        {services.map((s) => (
          <button
            key={s.title}
            type="button"
            className={styles.item}
            onClick={() => handleSelect(s.href)}
          >
            <div className={styles.itemLeft}>
              <div className={`${styles.iconWrap} ${s.iconClass}`}>
                <Symbol name={s.icon} size={22} />
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{s.title}</span>
                <span className={styles.itemSub}>{s.sub}</span>
              </div>
            </div>

            <div className={styles.itemRight}>
              {s.badge && <span className={styles.badge}>{s.badge}</span>}
              <Symbol name="chevron_right" size={18} className={styles.chevron} />
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
