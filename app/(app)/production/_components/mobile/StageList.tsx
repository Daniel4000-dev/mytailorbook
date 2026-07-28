import { ORDER_STATUSES, STATUS_CONFIG } from '@/lib/constants';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
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
        <EmptyState
          icon={<Symbol name="checkroom" size={40} />}
          title="Nothing here yet"
          description={searchQuery ? 'No orders match your search.' : 'Orders in this stage will appear here.'}
        />
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
