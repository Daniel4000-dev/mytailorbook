import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function BillingSettingsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <Skeleton width="100%" height={140} borderRadius={16} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton width={140} height={20} />
        <Skeleton width="100%" height={64} borderRadius={12} />
        <Skeleton width="100%" height={64} borderRadius={12} />
      </div>
    </div>
  );
}

