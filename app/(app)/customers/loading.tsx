import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CustomersLoading() {
  return (
    <div style={{ padding: '16px 14px', maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* TopBar placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
        <Skeleton width="130px" height="24px" borderRadius={6} />
        <Skeleton width="36px" height="36px" borderRadius={18} />
      </div>

      {/* Search bar */}
      <Skeleton width="100%" height={44} borderRadius={12} />

      {/* Customer list items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              background: 'var(--sf-bg-surface)',
              borderRadius: '14px',
              border: '1px solid var(--sf-border-light)',
            }}
          >
            <Skeleton width={44} height={44} borderRadius={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="55%" height={15} borderRadius={4} />
              <Skeleton width="35%" height={12} borderRadius={3} />
            </div>
            <Skeleton width={16} height={16} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
