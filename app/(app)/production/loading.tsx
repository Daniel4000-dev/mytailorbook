import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function ProductionLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Tab bar placeholder */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width={90} height={36} borderRadius={100} />
        <Skeleton width={90} height={36} borderRadius={100} />
        <Skeleton width={90} height={36} borderRadius={100} />
        <Skeleton width={90} height={36} borderRadius={100} />
      </div>

      {/* Card placeholders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton width="100%" height={100} />
        <Skeleton width="100%" height={100} />
        <Skeleton width="100%" height={100} />
      </div>
    </div>
  );
}
