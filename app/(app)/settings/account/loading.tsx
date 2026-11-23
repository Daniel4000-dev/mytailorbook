import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function AccountSettingsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Skeleton width={64} height={64} borderRadius={100} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width={140} height={20} />
          <Skeleton width={180} height={14} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={52} borderRadius={12} />
      </div>
    </div>
  );
}

