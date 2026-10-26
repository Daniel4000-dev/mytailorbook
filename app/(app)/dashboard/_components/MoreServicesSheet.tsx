'use client';

import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatCurrency } from '@/lib/formatters';
import { useData } from '@/contexts/DataContext';
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
      title: 'Debt Recovery & Collections',
      sub: 'Follow up unpaid balances on WhatsApp',
      icon: 'account_balance_wallet',
      href: '/collections',
      iconClass: styles.iconDebt,
      badge: debtTotal > 0 ? formatCurrency(debtTotal, currentShop?.currency) : null,
    },
    {
      title: 'Stock & Material Inventory',
      sub: 'Threads, linings, zippers & accessories',
      icon: 'inventory_2',
      href: '/inventory',
      iconClass: styles.iconInventory,
      badge: null,
    },
    {
      title: 'Studio Showcase & Lookbook',
      sub: 'Public digital portfolio & client inquiries',
      icon: 'storefront',
      href: '/portfolio',
      iconClass: styles.iconPortfolio,
      badge: null,
    },
    {
      title: 'Artisan Bench & Team',
      sub: 'Assign garments to cutters and apprentices',
      icon: 'group_add',
      href: '/settings',
      iconClass: styles.iconTeam,
      badge: null,
    },
    {
      title: 'Studio Settings & Receipts',
      sub: 'Shop profile, currency, invoice branding',
      icon: 'settings',
      href: '/settings',
      iconClass: styles.iconSettings,
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
