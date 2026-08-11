import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function FabricsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Search bar placeholder */}
      <Skeleton width="100%" height={44} borderRadius={12} />

      {/* Filter pills placeholder */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width={50} height={34} borderRadius={100} />
        <Skeleton width={70} height={34} borderRadius={100} />
        <Skeleton width={60} height={34} borderRadius={100} />
        <Skeleton width={65} height={34} borderRadius={100} />
      </div>

      {/* Grid skeleton — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="100%" height={180} borderRadius={12} />
            <Skeleton width="70%" height={14} borderRadius={4} />
            <Skeleton width="50%" height={12} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
