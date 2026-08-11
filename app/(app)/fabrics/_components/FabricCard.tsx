'use client';

import Image from 'next/image';
import type { Order } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './FabricCard.module.css';

const STATUS_LABELS: Record<string, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Completed: 'Completed',
};

function isOverdue(order: Order): boolean {
  if (!order.dueDate || order.status === 'Completed') return false;
  return new Date(order.dueDate) < new Date();
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface FabricCardProps {
  order: Order;
  onClick: () => void;
}

export default function FabricCard({ order, onClick }: FabricCardProps) {
  // First image from order (intake / earliest stage photo)
  const photo = order.images?.[0]?.url ?? null;
  const overdue = isOverdue(order);

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`View fabric for ${order.customerName}`}
    >
      {/* Photo area */}
      <div className={styles.photoWrap}>
        {photo ? (
          <Image
            src={photo}
            alt={`Fabric for ${order.customerName}`}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className={styles.photo}
            unoptimized
          />
        ) : (
          <div className={styles.noPhoto}>
            <Symbol name="texture" size={32} className={styles.noPhotoIcon} />
          </div>
        )}

        {/* Priority badge — top-left */}
        {(order.priority === 'urgent' || order.priority === 'rush') && (
          <span className={`${styles.priorityBadge} ${order.priority === 'rush' ? styles.rush : styles.urgent}`}>
            {order.priority === 'rush' ? '🔥 Rush' : '⚡ Urgent'}
          </span>
        )}
      </div>

      {/* Info footer */}
      <div className={styles.info}>
        <span className={styles.customerName}>{order.customerName}</span>

        <div className={styles.meta}>
          <span className={`${styles.statusPill} ${styles[`status_${order.status}`]}`}>
            {STATUS_LABELS[order.status]}
          </span>

          {order.dueDate && (
            <span className={`${styles.dueDateChip} ${overdue ? styles.overdue : ''}`}>
              <Symbol name={overdue ? 'warning' : 'schedule'} size={11} />
              {formatDueDate(order.dueDate)}
            </span>
          )}
        </div>

        {order.styleName && (
          <span className={styles.styleName}>{order.styleName}</span>
        )}
      </div>
    </button>
  );
}
