import { getAdminAuditLog } from '@/lib/admin/queries';
import ActivityClient from './ActivityClient';

export default async function AdminActivityPage() {
  const entries = await getAdminAuditLog(150);

  return <ActivityClient initialEntries={entries} />;
}
