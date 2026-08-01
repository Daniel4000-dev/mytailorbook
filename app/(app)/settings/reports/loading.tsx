import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function ReportsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <Skeleton width="100%" height={90} />
        <Skeleton width="100%" height={90} />
      </div>
      <Skeleton width="100%" height={200} />
    </div>
  );
}
