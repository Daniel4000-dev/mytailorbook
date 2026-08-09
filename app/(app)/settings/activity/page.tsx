'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { getAuditLogAction } from '@/app/actions';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { AuditLogEntry } from '@/lib/types';
import styles from './page.module.css';

const ACTION_LABELS: Record<string, string> = {
  'order.status_changed': 'moved an order',
  'order.updated': 'edited an order',
  'order.deleted': 'deleted an order',
  'payment.recorded': 'recorded a payment',
  'customer.deleted': 'deleted a customer',
  'staff.created': 'added a staff member',
  'staff.deleted': 'deleted their staff account',
  'staff.password_reset': "reset a staff member's password",
  'shop.deleted': 'deleted the shop',
};

function describeEntry(entry: AuditLogEntry): string {
  const label = ACTION_LABELS[entry.action] || entry.action;
  const diff = entry.diff || {};
  if (entry.action === 'order.status_changed') return `moved an order from ${diff.fromStatus} to ${diff.toStatus}`;
  if (entry.action === 'payment.recorded' && diff.amount) return `recorded a payment of ₦${diff.amount}`;
  if (entry.action === 'order.deleted' && diff.customerName) return `deleted ${diff.customerName}'s order`;
  if (entry.action === 'customer.deleted' && diff.customerName) return `deleted customer ${diff.customerName}`;
  if (entry.action === 'staff.created' && diff.staffName) return `added staff member ${diff.staffName}`;
  if (entry.action === 'staff.deleted' && diff.staffName) return `deleted staff account ${diff.staffName}`;
  if (entry.action === 'staff.password_reset' && diff.staffName) return `reset ${diff.staffName}'s password`;
  if (entry.action === 'shop.deleted' && diff.shopName) return `deleted the shop "${diff.shopName}"`;
  return label;
}

export default function ActivityLogPage() {
  const router = useRouter();
  const { currentShop } = useData();
  const isDesktop = useIsDesktop();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    if (!currentShop?.id) return;
    getAuditLogAction(currentShop.id).then(setEntries).catch(() => setEntries([]));
  }, [currentShop?.id]);

  return (
    <PageLayout width="narrow" header={<TopBar title="Activity Log" showBack={!isDesktop} onBack={() => router.push("/settings")} />}>
      <p className={styles.intro}>Recent account activity — who did what, and when.</p>

      {entries === null ? (
        <p className={styles.intro}>Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Symbol name="history" size={40} />} title="No activity yet" description="Actions taken on your shop will show up here." />
      ) : (
        <div className={styles.card}>
          {entries.map((entry) => (
            <div key={entry.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.actorName}>{entry.actorName}</span>{' '}
                <span className={styles.description}>{describeEntry(entry)}</span>
              </div>
              <span className={styles.timestamp}>{new Date(entry.createdAt).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
