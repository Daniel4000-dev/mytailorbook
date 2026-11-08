import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CatalogueDetailLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Album header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton width={180} height={28} />
          <Skeleton width={100} height={16} style={{ marginTop: '6px' }} />
        </div>
        <Skeleton width={100} height={36} borderRadius={100} />
      </div>

      {/* Photo masonry grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={180} borderRadius={10} />
        ))}
      </div>
    </div>
  );
}

