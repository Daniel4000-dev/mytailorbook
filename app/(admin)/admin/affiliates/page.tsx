import { getAffiliatePerformance } from '@/lib/admin/queries';
import { APP_CONFIG } from '@/lib/config';
import AffiliatesClient from './AffiliatesClient';

export default async function AffiliatesPage() {
  const affiliates = await getAffiliatePerformance();

  return <AffiliatesClient initialAffiliates={affiliates} domain={APP_CONFIG.domain} />;
}
