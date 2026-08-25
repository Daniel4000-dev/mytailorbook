import { STATUS_CONFIG } from '@/lib/constants';
import type { OrderStatus } from '@/lib/types';
import styles from './StageBanner.module.css';

interface StageBannerProps {
  status: OrderStatus;
  count: number;
}

/** Section header above each stage's order list: serif stage title and
 *  an order-count chip on the right. */
export default function StageBanner({ status, count }: StageBannerProps) {
  return (
    <div className={styles.banner}>
      <h3 className={styles.title}>{status === 'Delivered' ? 'Delivered' : `${STATUS_CONFIG[status].label} Phase`}</h3>
      <span className={styles.countChip}>
        {count} {count === 1 ? 'Order' : 'Orders'} Total
      </span>
    </div>
  );
}
