'use client';

import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import DesktopDashboardSkeleton from './desktop/DashboardSkeleton';
import MobileDashboardSkeleton from './mobile/DashboardSkeleton';

export default function DashboardSkeleton() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopDashboardSkeleton /> : <MobileDashboardSkeleton />;
}
