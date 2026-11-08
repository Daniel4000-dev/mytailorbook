import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function SizeChartsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={140} height={24} />
        <Skeleton width={80} height={36} borderRadius={100} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={74} borderRadius={12} />
        ))}
      </div>
    </div>
  );
}

