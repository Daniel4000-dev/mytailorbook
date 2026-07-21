import Skeleton from '@/components/ui/Skeleton/Skeleton';
import boardStyles from './KanbanBoard.module.css';
import cardStyles from '@/components/production/OrderListCard/OrderListCard.module.css';

// Mirrors the real board: search bar, filter pill row, stage banner, and a
// few card-shaped placeholders — same CSS classes as the real
// OrderListCard so widths/paddings match exactly.
export default function KanbanBoardSkeleton() {
  return (
    <>
      <div className={boardStyles.searchBar}>
        <Skeleton width="100%" height={44} borderRadius={22} />
      </div>

      <div className={boardStyles.pillRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? 64 : 110} height={40} borderRadius={20} />
        ))}
      </div>

      <div className={boardStyles.stageSection}>
        <div style={{ padding: '16px 0', marginBottom: 16 }}>
          <Skeleton width={180} height={28} />
        </div>
        <div className={boardStyles.cardList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cardStyles.card}>
              <Skeleton width="100%" height={176} borderRadius={0} />
              <div className={cardStyles.content}>
                <Skeleton width="60%" height={18} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton width="40%" height={13} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <Skeleton width="55%" height={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
