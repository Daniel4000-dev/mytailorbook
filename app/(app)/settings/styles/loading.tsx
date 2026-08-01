import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function CustomStylesLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={140} />
        ))}
      </div>
    </div>
  );
}
