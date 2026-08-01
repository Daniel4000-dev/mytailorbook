import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function StyleGalleryLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Gender filter pills */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton width={60} height={32} borderRadius={999} />
        <Skeleton width={60} height={32} borderRadius={999} />
        <Skeleton width={70} height={32} borderRadius={999} />
      </div>

      {/* Style grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width="100%" height={160} />
        ))}
      </div>
    </div>
  );
}
