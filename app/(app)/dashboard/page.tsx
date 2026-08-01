'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import DashboardSkeleton from './_components/DashboardSkeleton';
import OwnerDashboard from './_components/OwnerDashboard';
import StaffDashboard from './_components/StaffDashboard';

import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { orders, staffMembers, isLoaded } = useData();

  const firstName = user?.name?.split(' ')[0] || '';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const topBar = (
    <TopBar
      profileMode={{
        greeting: timeGreeting,
        name: firstName,
      }}
    />
  );

  if (!isLoaded) {
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
