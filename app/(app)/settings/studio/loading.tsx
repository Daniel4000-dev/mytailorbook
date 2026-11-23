import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function StudioSettingsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton width="100%" height={56} borderRadius={0} />
      <Skeleton width={160} height={24} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={52} borderRadius={12} />
      </div>
    </div>
  );
}

