import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatPhone } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import type { Customer } from '@/lib/types';
import styles from '../page.module.css';

interface CustomerStepProps {
  customerQuery: string;
  onQueryChange: (query: string) => void;
  filteredCustomers: Customer[];
  isLoaded: boolean;
  onSelect: (customer: Customer) => void;
}

export default function CustomerStep({ customerQuery, onQueryChange, filteredCustomers, isLoaded, onSelect }: CustomerStepProps) {
  return (
    <div className={styles.col}>
      <div className={styles.searchWrap}>
        <Symbol name="search" size={20} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search name or phone…"
          value={customerQuery}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className={styles.customerList}>
        {filteredCustomers.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.customerRow}
            onClick={() => onSelect(c)}
          >
            <span className={styles.customerAvatar}>
              {c.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span className={styles.customerInfo}>
              <span className={styles.customerName}>{c.fullName}</span>
              <span className={styles.customerPhone}>{formatPhone(c.whatsappNumber)}</span>
            </span>
            <Symbol name="arrow_forward_ios" size={14} className={styles.rowChevron} />
          </button>
        ))}
        {!isLoaded && (
          <p className={styles.emptyNote}>Loading your clients…</p>
        )}
        {isLoaded && filteredCustomers.length === 0 && (
          <p className={styles.emptyNote}>No client matches “{customerQuery}”.</p>
        )}
      </div>
      <Link href={ROUTES.customerNew} className={styles.newClientLink}>
        <Symbol name="person_add" size={20} /> Walk-in? Register a new client
      </Link>
    </div>
  );
}
