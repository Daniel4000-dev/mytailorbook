import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CataloguesLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Header action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={140} height={24} />
        <Skeleton width={110} height={36} borderRadius={100} />
      </div>

      {/* Grid of albums */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width="100%" height={160} borderRadius={12} />
            <Skeleton width="70%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

