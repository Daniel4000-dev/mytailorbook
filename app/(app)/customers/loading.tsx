import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CustomersLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Search bar */}
      <Skeleton width="100%" height={44} />

      {/* Customer list items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton width={44} height={44} borderRadius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
