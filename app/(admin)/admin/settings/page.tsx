import { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getPlatformSettings } from '@/lib/admin/platformSettings';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Platform Settings | Admin Dashboard',
  description: 'Manage platform feature switches, message templates, announcement banner, and shop tiers.',
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getPlatformSettings();

  return <SettingsClient initialSettings={settings} />;
}
