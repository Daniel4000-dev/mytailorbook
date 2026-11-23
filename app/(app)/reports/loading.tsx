import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function ReportsLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Skeleton width="100%" height={160} borderRadius={24} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        <Skeleton width="100%" height={110} borderRadius={20} />
        <Skeleton width="100%" height={110} borderRadius={20} />
        <Skeleton width="100%" height={110} borderRadius={20} />
        <Skeleton width="100%" height={110} borderRadius={20} />
      </div>
      <Skeleton width="100%" height={310} borderRadius={22} />
      <Skeleton width="100%" height={240} borderRadius={22} />
    </div>
  );
}
