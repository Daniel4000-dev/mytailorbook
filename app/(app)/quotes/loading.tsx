import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function QuotesLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={140} height={24} />
        <Skeleton width={110} height={40} borderRadius={100} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={92} borderRadius={14} />
        ))}
      </div>
    </div>
  );
}

