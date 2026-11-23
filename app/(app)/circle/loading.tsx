import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CircleLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Header Banner */}
      <Skeleton width="100%" height={120} borderRadius={16} />

      {/* Buddy Co-op card */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton width="100%" height={88} borderRadius={16} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width={80} height={36} borderRadius={100} />
        <Skeleton width={100} height={36} borderRadius={100} />
        <Skeleton width={90} height={36} borderRadius={100} />
      </div>

      {/* Circle Activity Feed items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton width="100%" height={110} borderRadius={14} />
        <Skeleton width="100%" height={110} borderRadius={14} />
        <Skeleton width="100%" height={110} borderRadius={14} />
      </div>
    </div>
  );
}

