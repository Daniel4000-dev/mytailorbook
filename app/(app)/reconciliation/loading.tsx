import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function ReconciliationLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Skeleton width="100%" height={88} borderRadius={14} />
        <Skeleton width="100%" height={88} borderRadius={14} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton width="100%" height={120} borderRadius={16} />
        <Skeleton width="100%" height={120} borderRadius={16} />
      </div>
    </div>
  );
}

