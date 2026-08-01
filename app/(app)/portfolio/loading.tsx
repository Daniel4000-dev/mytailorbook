import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function OwnPortfolioLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero */}
      <Skeleton width="100%" height={220} />

      {/* Bio block */}
      <Skeleton width="60%" height={20} />
      <Skeleton width="100%" height={14} />

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={160} />
        ))}
      </div>
    </div>
  );
}
