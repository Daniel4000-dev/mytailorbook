import Skeleton from '@/components/ui/Skeleton/Skeleton';

export default function NewCustomerLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TopBar placeholder */}
      <Skeleton width="100%" height={56} borderRadius={0} />

      {/* Step progress */}
      <Skeleton width="100%" height={4} borderRadius={2} />

      {/* Form fields */}
      <Skeleton width="100%" height={52} />
      <Skeleton width="100%" height={52} />
      <Skeleton width="100%" height={52} />
    </div>
  );
}
