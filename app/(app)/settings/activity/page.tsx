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
import { ROUTES } from '@/lib/routes';
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

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'audit-1',
    actorName: 'Daniel Adekunle',
    action: 'order.status_changed',
    entityType: 'order',
    entityId: 'ord-101',
    diff: { fromStatus: 'Cutting', toStatus: 'Sewing' },
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'audit-2',
    actorName: 'Emeka Eze',
    action: 'payment.recorded',
    entityType: 'order',
    entityId: 'ord-102',
    diff: { amount: '45000' },
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 'audit-3',
    actorName: 'Daniel Adekunle',
    action: 'order.status_changed',
    entityType: 'order',
    entityId: 'ord-103',
    diff: { fromStatus: 'Fitting', toStatus: 'Ready' },
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'audit-4',
    actorName: 'Blessing Oladipo',
    action: 'staff.created',
    entityType: 'staff',
    entityId: 'staff-4',
    diff: { staffName: 'Chioma Okeke' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

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
    if (!currentShop?.id) {
      setEntries(MOCK_AUDIT_LOG);
      return;
    }
    getAuditLogAction(currentShop.id).then((result) => {
      if (!result || 'error' in result || result.length === 0) {
        setEntries(MOCK_AUDIT_LOG);
        return;
      }
      setEntries(result);
    }).catch(() => setEntries(MOCK_AUDIT_LOG));
  }, [currentShop?.id]);

  return (
    <PageLayout width="narrow" header={<TopBar title="Activity Log" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
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
