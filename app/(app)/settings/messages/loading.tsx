import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function MessagesLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <Skeleton width="100%" height={60} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="100%" height={52} />
        ))}
      </div>
    </div>
  );
}
