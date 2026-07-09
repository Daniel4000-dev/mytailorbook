import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { PRODUCTION_STATUSES } from '@/lib/constants';
import boardStyles from './KanbanBoard.module.css';
import columnStyles from '@/components/kanban/KanbanColumn/KanbanColumn.module.css';
import cardStyles from '@/components/kanban/OrderCard/OrderCard.module.css';

// Mirrors the real board: search bar, one column per production status, a
// couple of card-shaped placeholders per column — same CSS classes as the
// real KanbanColumn/OrderCard so widths/paddings match exactly.
export default function KanbanBoardSkeleton() {
  return (
    <>
      <div className={boardStyles.searchBar}>
        <Skeleton width="100%" height={20} />
      </div>

      <div className={boardStyles.board}>
        {PRODUCTION_STATUSES.map((status) => (
          <div key={status} className={columnStyles.column}>
            <div className={columnStyles.header}>
              <Skeleton width={80} height={14} />
              <Skeleton width={20} height={14} borderRadius={10} />
            </div>
            <div className={columnStyles.list}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={cardStyles.card}>
                  <div className={cardStyles.body}>
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="90%" height={12} />
                    <Skeleton width="50%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
