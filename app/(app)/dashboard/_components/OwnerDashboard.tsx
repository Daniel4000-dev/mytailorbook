'use client';

import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import DesktopOwnerDashboard from './desktop/OwnerDashboard';
import MobileOwnerDashboard from './mobile/OwnerDashboard';

export default function OwnerDashboard(props: {
  orders: Order[];
  staffMembers: ReturnType<typeof useData>['staffMembers'];
  onNavigate: (href: string) => void;
}) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopOwnerDashboard {...props} /> : <MobileOwnerDashboard {...props} />;
}
