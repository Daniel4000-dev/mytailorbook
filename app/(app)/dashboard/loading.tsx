import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function DashboardLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <Skeleton width={160} height={18} />
      </div>

      {/* Finance cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Skeleton width="100%" height={90} />
        <Skeleton width="100%" height={90} />
        <Skeleton width="100%" height={90} />
        <Skeleton width="100%" height={90} />
      </div>
    </div>
  );
}
