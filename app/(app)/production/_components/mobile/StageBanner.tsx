import { STATUS_CONFIG } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { OrderStatus } from '@/lib/types';
import styles from './StageBanner.module.css';

interface StageBannerProps {
  status: OrderStatus;
  count: number;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getStageCraftIcon(status: OrderStatus) {
  switch (status) {
    case 'Documented':
      return 'description';
    case 'Cutting':
      return 'content_cut';
    case 'Sewing':
      return 'needle';
    case 'Ready':
      return 'checkroom';
    case 'Delivered':
      return 'inventory_2';
    default:
      return 'checkroom';
  }
}

export default function StageBanner({
  status,
  count,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: StageBannerProps) {
  const content = (
    <>
      <div className={styles.bannerLeft}>
        <div className={styles.stageIconWrap} data-stage={status}>
          <Symbol name={getStageCraftIcon(status)} size={16} />
        </div>
        <h3 className={styles.title}>{status === 'Delivered' ? 'Delivered' : `${STATUS_CONFIG[status].label} Phase`}</h3>
      </div>
      <div className={styles.bannerRight}>
        <span className={styles.countChip}>
          {count} {count === 1 ? 'Garment' : 'Garments'}
        </span>
        {isCollapsible && (
          <Symbol
            name={isCollapsed ? 'expand_more' : 'expand_less'}
            size={18}
            className={styles.collapseChevron}
          />
        )}
      </div>
    </>
  );

  if (isCollapsible) {
    return (
      <button
        type="button"
        className={`${styles.banner} ${styles.bannerClickable}`}
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
      >
        {content}
      </button>
    );
  }

  return <div className={styles.banner}>{content}</div>;
}
