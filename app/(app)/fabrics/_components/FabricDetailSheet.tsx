'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Order } from '@/lib/types';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './FabricDetailSheet.module.css';

const STATUS_LABELS: Record<string, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Completed: 'Completed',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isOverdue(order: Order): boolean {
  if (!order.dueDate || order.status === 'Completed') return false;
  return new Date(order.dueDate) < new Date();
}

interface FabricDetailSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FabricDetailSheet({ order, isOpen, onClose }: FabricDetailSheetProps) {
  const router = useRouter();

  if (!order) return null;

  const photo = order.images?.[0]?.url ?? null;
  const overdue = isOverdue(order);

  const handleOpenOrder = () => {
    onClose();
    router.push(`/production/${order.id}`);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      noPadding
    >
      {/* Hero photo */}
      <div className={styles.heroWrap}>
        {photo ? (
          <Image
            src={photo}
            alt={`Fabric for ${order.customerName}`}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className={styles.heroPhoto}
            unoptimized
          />
        ) : (
          <div className={styles.heroNoPhoto}>
            <Symbol name="texture" size={48} className={styles.heroNoPhotoIcon} />
            <span className={styles.heroNoPhotoLabel}>No fabric photo yet</span>
          </div>
        )}

        {/* Status badge overlaid on photo */}
        <span className={`${styles.statusBadge} ${styles[`status_${order.status}`]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Customer */}
        <div className={styles.section}>
          <div className={styles.row}>
            <Symbol name="person" size={16} className={styles.rowIcon} />
            <div className={styles.rowContent}>
              <span className={styles.rowLabel}>Customer</span>
              <span className={styles.rowValue}>{order.customerName}</span>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Order details */}
        <div className={styles.section}>
          {order.styleName && (
            <div className={styles.row}>
              <Symbol name="checkroom" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Style</span>
                <span className={styles.rowValue}>{order.styleName}</span>
              </div>
            </div>
          )}

          {order.orderDetails && (
            <div className={styles.row}>
              <Symbol name="notes" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Details</span>
                <span className={styles.rowValue}>{order.orderDetails}</span>
              </div>
            </div>
          )}

          {order.assignedToName && (
            <div className={styles.row}>
              <Symbol name="engineering" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Assigned to</span>
                <span className={styles.rowValue}>{order.assignedToName}</span>
              </div>
            </div>
          )}

          {order.dueDate && (
            <div className={styles.row}>
              <Symbol name={overdue ? 'warning' : 'event'} size={16} className={`${styles.rowIcon} ${overdue ? styles.overdueIcon : ''}`} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Due date</span>
                <span className={`${styles.rowValue} ${overdue ? styles.overdueText : ''}`}>
                  {formatDate(order.dueDate)}{overdue ? ' · Overdue' : ''}
                </span>
              </div>
            </div>
          )}

          {(order.priority === 'urgent' || order.priority === 'rush') && (
            <div className={styles.row}>
              <Symbol name="local_fire_department" size={16} className={styles.rowIcon} />
              <div className={styles.rowContent}>
                <span className={styles.rowLabel}>Priority</span>
                <span className={`${styles.rowValue} ${styles.priorityValue}`}>
                  {order.priority === 'rush' ? '🔥 Rush' : '⚡ Urgent'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          className={styles.openOrderBtn}
          onClick={handleOpenOrder}
        >
          <Symbol name="open_in_new" size={18} />
          Open full order
        </button>
      </div>
    </BottomSheet>
  );
}
