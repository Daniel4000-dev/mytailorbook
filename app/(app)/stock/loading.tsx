import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function StockLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />

      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width="100%" height={44} borderRadius={12} />
        <Skeleton width={96} height={44} borderRadius={12} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={140} borderRadius={14} />
        ))}
      </div>
    </div>
  );
}

