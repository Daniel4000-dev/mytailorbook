import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function SettingsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Section cards */}
      <Skeleton width="100%" height={140} />
      <Skeleton width="100%" height={200} />
    </div>
  );
}
