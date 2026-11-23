import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function NewOrderLoading() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 14px 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* TopBar placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px', marginBottom: '8px' }}>
        <Skeleton width="40px" height="40px" borderRadius={20} />
        <Skeleton width="120px" height="24px" borderRadius={8} />
        <div style={{ width: '40px' }} />
      </div>

      {/* Card 1: Client Card */}
      <div style={{ padding: '16px 14px', borderRadius: '16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton width="80px" height="12px" borderRadius={4} />
            <Skeleton width="140px" height="20px" borderRadius={6} style={{ marginTop: 6 }} />
          </div>
          <Skeleton width="90px" height="28px" borderRadius={14} />
        </div>
        <Skeleton width="100%" height="44px" borderRadius={12} />
      </div>

      {/* Card 2: Style Selection Card */}
      <div style={{ padding: '16px 14px', borderRadius: '16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <Skeleton width="100px" height="12px" borderRadius={4} />
          <Skeleton width="160px" height="20px" borderRadius={6} style={{ marginTop: 6 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <Skeleton width="100%" height="130px" borderRadius={12} />
          <Skeleton width="100%" height="130px" borderRadius={12} />
          <Skeleton width="100%" height="130px" borderRadius={12} />
        </div>
      </div>

      {/* Card 3: Fit Ledger Card */}
      <div style={{ padding: '16px 14px', borderRadius: '16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <Skeleton width="90px" height="12px" borderRadius={4} />
          <Skeleton width="150px" height="20px" borderRadius={6} style={{ marginTop: 6 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <Skeleton width="100%" height="42px" borderRadius={8} />
          <Skeleton width="100%" height="42px" borderRadius={8} />
          <Skeleton width="100%" height="42px" borderRadius={8} />
          <Skeleton width="100%" height="42px" borderRadius={8} />
        </div>
      </div>

      {/* Card 4: Pricing & Schedule */}
      <div style={{ padding: '16px 14px', borderRadius: '16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <Skeleton width="110px" height="12px" borderRadius={4} />
          <Skeleton width="140px" height="20px" borderRadius={6} style={{ marginTop: 6 }} />
        </div>
        <Skeleton width="100%" height="42px" borderRadius={8} />
        <Skeleton width="100%" height="42px" borderRadius={8} />
      </div>

      {/* Sticky Bottom Dock */}
      <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="100px" height="28px" borderRadius={6} />
        <Skeleton width="140px" height="40px" borderRadius={12} />
      </div>
    </div>
  );
}
