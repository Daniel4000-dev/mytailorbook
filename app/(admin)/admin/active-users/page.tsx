import { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getLiveEngagementTelemetry } from '@/lib/admin/engagementQueries';
import EngagementClient from './EngagementClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Live Tailor Engagement & Health | Admin Dashboard',
  description: 'Real-time telemetry, active craft actions stream, at-risk workshops, and tailor streak monitors.',
};

export default async function ActiveUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const initialMode = params?.mode || 'all';
  const telemetry = await getLiveEngagementTelemetry(initialMode);

  return <EngagementClient initialData={telemetry} />;
}
