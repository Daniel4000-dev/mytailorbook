import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function PortfolioSettingsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <Skeleton width="100%" height={140} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width="100%" height={100} />
        ))}
      </div>
    </div>
  );
}
