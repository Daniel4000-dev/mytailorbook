import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function NotificationsLoading() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--sf-bg-surface-elevated, #F8FAFC)' }}>
      {/* TopBar placeholder */}
      <div style={{ height: 56, background: 'var(--sf-bg-surface, #FFFFFF)', borderBottom: '1px solid var(--sf-border-light, #E2E8F0)', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width={32} height={32} borderRadius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Skeleton width={110} height={18} borderRadius={4} />
            <Skeleton width={70} height={12} borderRadius={4} />
          </div>
        </div>
        <Skeleton width={32} height={32} borderRadius="50%" />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px 80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Bar placeholder */}
        <Skeleton width="100%" height={42} borderRadius={12} />

        {/* Filter Pills placeholder */}
        <div style={{ display: 'flex', gap: '8px', overflow: 'hidden', padding: '4px 0 8px' }}>
          <Skeleton width={50} height={32} borderRadius={9999} />
          <Skeleton width={90} height={32} borderRadius={9999} />
          <Skeleton width={130} height={32} borderRadius={9999} />
          <Skeleton width={80} height={32} borderRadius={9999} />
        </div>

        {/* Skeleton cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginBottom: '4px' }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--sf-bg-surface, #FFFFFF)',
                border: '1px solid var(--sf-border-light, #E2E8F0)',
                borderRadius: '14px',
              }}
            >
              <Skeleton width={42} height={42} borderRadius={12} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width={`${50 + (i * 9) % 35}%`} height={15} borderRadius={4} />
                <Skeleton width={`${70 + (i * 7) % 25}%`} height={13} borderRadius={4} />
                <Skeleton width={75} height={11} borderRadius={4} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
