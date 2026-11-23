import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CalendarLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* View controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={140} height={28} borderRadius={8} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width={36} height={36} borderRadius={8} />
          <Skeleton width={36} height={36} borderRadius={8} />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'hidden' }}>
        <Skeleton width={64} height={32} borderRadius={100} />
        <Skeleton width={88} height={32} borderRadius={100} />
        <Skeleton width={96} height={32} borderRadius={100} />
        <Skeleton width={72} height={32} borderRadius={100} />
      </div>

      {/* Calendar Grid Placeholder */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={48} borderRadius={8} />
        ))}
      </div>

      {/* Event List Placeholder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        <Skeleton width={120} height={18} />
        <Skeleton width="100%" height={72} borderRadius={12} />
        <Skeleton width="100%" height={72} borderRadius={12} />
      </div>
    </div>
  );
}

