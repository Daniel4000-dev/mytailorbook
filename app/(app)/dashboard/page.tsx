'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import DashboardSkeleton from './_components/DashboardSkeleton';
import OwnerDashboard from './_components/OwnerDashboard';
import StaffDashboard from './_components/StaffDashboard';
import { ROUTES } from '@/lib/routes';

import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isOwner, loading } = useAuth();
  const { orders, staffMembers, isLoaded } = useData();

  // Idle prefetching: prefetch all core destinations so page transitions happen at 0ms
  useEffect(() => {
    // Primary immediate routes
    router.prefetch(ROUTES.production);
    router.prefetch(ROUTES.customers);
    router.prefetch(ROUTES.orderNew);
    router.prefetch(ROUTES.calendar);

    // Staggered secondary routes on idle callback to prevent network contention
    const prefetchSecondary = () => {
      router.prefetch(ROUTES.catalogues);
      router.prefetch(ROUTES.portfolio);
      router.prefetch(ROUTES.fabrics);
      router.prefetch(ROUTES.reconciliation);
      router.prefetch(ROUTES.notes);
      router.prefetch(ROUTES.quotes);
      router.prefetch(ROUTES.stock);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(prefetchSecondary, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(prefetchSecondary, 1500);
      return () => clearTimeout(timer);
    }
  }, [router]);

  const topBar = (
    <TopBar
      brandMode={true}
    />
  );

  if (loading || !isLoaded) {
    return (
      <PageLayout className={styles.pageGrid} header={topBar}>
        <DashboardSkeleton />
      </PageLayout>
    );
  }

  {/* Accountant gets the same financial-figures-heavy view as OrgAdmin/
      BranchManager (read-only in practice — there's nothing to mutate on
      this page itself), rather than Staff's task-assignment-focused view,
      which has nothing relevant to show an Accountant. */}
  if (isOwner || user?.role === 'Accountant') {
    return (
      <PageLayout className={styles.pageGrid} header={topBar}>
        <OwnerDashboard orders={orders} staffMembers={staffMembers} onNavigate={router.push} />
      </PageLayout>
    );
  }

  return (
    <PageLayout className={styles.pageGrid} header={topBar}>
      <StaffDashboard orders={orders} userUid={user?.uid} onNavigate={router.push} />
    </PageLayout>
  );
}
