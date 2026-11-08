import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function NotesLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />

      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width="100%" height={40} borderRadius={10} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={80} borderRadius={12} />
        ))}
      </div>
    </div>
  );
}

