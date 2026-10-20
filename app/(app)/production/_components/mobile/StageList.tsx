import Link from 'next/link';
import { ORDER_STATUSES, STATUS_CONFIG } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { Order, OrderStatus, Role, User } from '@/lib/types';
import StageBanner from './StageBanner';
import OrderListCard from '../OrderListCard';
import styles from '../ProductionBoard.module.css';

export const ALL_FILTER = 'All' as const;
export type StageFilter = typeof ALL_FILTER | OrderStatus;

interface StageListProps {
  stageFilter: StageFilter;
  setStageFilter: (filter: StageFilter) => void;
  visibleStages: OrderStatus[];
  hasAnyVisible: boolean;
  searchQuery: string;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  stageVisibleCounts: Partial<Record<OrderStatus, number>>;
  stagePageSize: number;
  onShowMore: (status: OrderStatus) => void;
  userRole: Role;
  staffMembers: User[];
  onOpen: (orderId: string) => void;
  onAdvance: (orderId: string) => void;
  onRevert: (orderId: string) => void;
  onReassign: (orderId: string, staffUid: string, staffName: string) => void;
  onBatchClick?: (batchId: string) => void;
  onViewCuttingSlip?: (order: Order) => void;
  onWhatsApp?: (order: Order) => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
  onPreviewSample?: () => void;
}

/** Stage filter pills, then vertical stage-by-stage sections of compact
 *  cards — the mobile production view. Each card carries its own Move
 *  Back/Move to X footer buttons in place of desktop's drag-and-drop. */
export default function StageList({
  stageFilter,
  setStageFilter,
  visibleStages,
  hasAnyVisible,
  searchQuery,
  getOrdersByStatus,
  stageVisibleCounts,
  stagePageSize,
  onShowMore,
  userRole,
  staffMembers,
  onOpen,
  onAdvance,
  onRevert,
  onReassign,
  onBatchClick,
  onViewCuttingSlip,
  onWhatsApp,
  onResetFilters,
  isFiltered,
  onPreviewSample,
}: StageListProps) {
  return (
    <>
      <div className={`${styles.pillRow} ${styles.stagePills}`}>
        <FilterPill
          label="All"
          active={stageFilter === ALL_FILTER}
          onClick={() => setStageFilter(ALL_FILTER)}
        />
        {ORDER_STATUSES.map((status) => (
          <FilterPill
            key={status}
            label={STATUS_CONFIG[status].label}
            count={getOrdersByStatus(status).length}
            active={stageFilter === status}
            onClick={() => setStageFilter(stageFilter === status ? ALL_FILTER : status)}
          />
        ))}
      </div>

      {!hasAnyVisible ? (
        <div className={styles.atelierEmptyContainer}>
          <div className={styles.atelierCrest}>
            <div className={styles.atelierCrestHalo} />
            <div className={styles.crestShears}>
              <Symbol name="content_cut" size={26} />
            </div>
            <div className={styles.crestNeedle}>
              <Symbol name="needle" size={22} />
            </div>
          </div>
          <h3 className={styles.atelierEmptyTitle}>
            {searchQuery || isFiltered ? 'No garments match filter' : 'Atelier floor is clear'}
          </h3>
          <p className={styles.atelierEmptyDesc}>
            {searchQuery
              ? `No active orders found matching "${searchQuery}". Reset filters to see all production orders.`
              : isFiltered
              ? 'No orders found for the selected stage or criteria. Try clearing filters to view other orders in production.'
              : 'Every stitch and cut is accounted for. New garment orders and batch commissions will appear here as they enter production.'}
          </p>
          {isFiltered && onResetFilters ? (
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={onResetFilters}
            >
              <Symbol name="close" size={13} />
              <span>Reset Search & Filters</span>
            </button>
          ) : (
            <div className={styles.atelierActionRow}>
              <Link href={ROUTES.orderNew} className={styles.atelierNewOrderBtn}>
                <Symbol name="add" size={16} />
                <span>New Garment Order</span>
              </Link>
              {onPreviewSample && (
                <button
                  type="button"
                  className={styles.atelierDemoBtn}
                  onClick={onPreviewSample}
                >
                  <Symbol name="visibility" size={14} />
                  <span>Preview Sample Orders</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        visibleStages.map((status) => {
          const stageOrders = getOrdersByStatus(status);
          if (stageOrders.length === 0) return null;
          const visibleCount = stageVisibleCounts[status] ?? stagePageSize;
          const shown = stageOrders.slice(0, visibleCount);
          return (
            <section key={status} className={styles.stageSection}>
              <StageBanner status={status} count={stageOrders.length} />
              <div className={styles.cardList}>
                {shown.map((order, i) => (
                  <OrderListCard
                    key={order.id}
                    order={order}
                    userRole={userRole}
                    index={i}
                    onOpen={() => onOpen(order.id)}
                    onAdvance={() => onAdvance(order.id)}
                    onRevert={() => onRevert(order.id)}
                    staffMembers={staffMembers}
                    onReassign={onReassign}
                    onBatchClick={onBatchClick}
                    onViewCuttingSlip={onViewCuttingSlip}
                    onWhatsApp={onWhatsApp}
                  />
                ))}
              </div>
              {stageOrders.length > visibleCount && (
                <button
                  type="button"
                  className={styles.showMoreBtn}
                  onClick={() => onShowMore(status)}
                >
                  Show {Math.min(stagePageSize, stageOrders.length - visibleCount)} more (
                  {stageOrders.length - visibleCount} remaining)
                </button>
              )}
            </section>
          );
        })
      )}
      {/* Reserves clearance below the last card for the floating create FAB
          (mobile only — the FAB doesn't exist on desktop), so it never sits
          on top of a card's own "Move to X" action. */}
      {hasAnyVisible && <div className={styles.fabClearance} />}
    </>
  );
}
