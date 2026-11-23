import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getRecentBroadcastsAction } from './actions';
import BroadcastsClient from './BroadcastsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminBroadcastsPage() {
  await requireAdmin();
  const recentHistory = await getRecentBroadcastsAction(20);

  return <BroadcastsClient initialHistory={recentHistory} />;
}

