import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function InventoryLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Search and add button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Skeleton width="100%" height={44} borderRadius={12} />
        <Skeleton width={100} height={44} borderRadius={12} />
      </div>

      {/* Inventory item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={76} borderRadius={14} />
        ))}
      </div>
    </div>
  );
}

