import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CollectionsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={130} height={24} />
        <Skeleton width={100} height={36} borderRadius={100} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={160} borderRadius={14} />
        ))}
      </div>
    </div>
  );
}

