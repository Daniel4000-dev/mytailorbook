import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CustomerDetailSkeleton from './_components/CustomerDetailSkeleton';
import styles from './page.module.css';

/** Route-level fallback — shown the instant navigation starts, before the
 *  page component itself is even ready, so a tap gets visible feedback
 *  right away instead of the old page just sitting frozen. */
export default function CustomerDetailLoading() {
  return (
    <PageLayout className={styles.page} header={<TopBar title="Client Profile" showBack />}>
      <CustomerDetailSkeleton />
    </PageLayout>
  );
}
