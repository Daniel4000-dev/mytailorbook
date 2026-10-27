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
  Delivered: 'Delivered',
};

function isOverdue(order: Order): boolean {
  if (!order.dueDate || order.status === 'Delivered') return false;
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
  const isRush = order.priority === 'rush';
  const isUrgent = order.priority === 'urgent';
  const hasPriority = isRush || isUrgent;
  const isClientFabric = order.materialSuppliedBy === 'customer';
  const isShopFabric = order.materialSuppliedBy === 'shop';

  // Extract yardage from orderDetails if mentioned (e.g. "4.0 yds", "7.0 yards")
  const yardageMatch = order.orderDetails?.match(/(\d+(?:\.\d+)?)\s*(?:yds?|yards?)/i);
  const yardage = yardageMatch ? `${yardageMatch[1]} yds` : null;

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`View fabric for ${order.customerName || 'order'}`}
    >
      {/* Photo area */}
      <div className={styles.photoWrap}>
        {photo ? (
          <Image
            src={photo}
            alt={`Fabric for ${order.customerName || 'order'}`}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className={styles.photo}
            unoptimized
          />
        ) : (
          <div className={styles.noPhoto}>
            <Symbol name="texture" size={32} className={styles.noPhotoIcon} />
            <span className={styles.noPhotoText}>No photo</span>
          </div>
        )}

        {/* Priority badge — top-left with native vector icon */}
        {hasPriority && (
          <span className={`${styles.priorityBadge} ${isRush ? styles.rush : styles.urgent}`}>
            <Symbol name={isRush ? 'local_fire_department' : 'bolt'} size={11} />
            <span>{isRush ? 'Rush' : 'Urgent'}</span>
          </span>
        )}

        {/* Material Provenance badge — top-right with native vector icon */}
        {isClientFabric && (
          <span className={`${styles.provenanceBadge} ${styles.clientMaterial}`}>
            <Symbol name="person" size={11} />
            <span>Client Sourced</span>
          </span>
        )}
        {isShopFabric && (
          <span className={`${styles.provenanceBadge} ${styles.shopMaterial}`}>
            <Symbol name="storefront" size={11} />
            <span>Atelier Stock</span>
          </span>
        )}

        {/* Yardage tag — bottom-right */}
        {yardage && (
          <span className={styles.yardageBadge}>
            <Symbol name="straighten" size={11} />
            <span>{yardage}</span>
          </span>
        )}
      </div>

      {/* Info footer */}
      <div className={styles.info}>
        <span className={styles.customerName}>{order.customerName || 'Walk-in Client'}</span>

        <div className={styles.meta}>
          <span className={`${styles.statusPill} ${styles[`status_${order.status}`]}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>

          {order.dueDate && (
            <span className={`${styles.dueDateChip} ${overdue ? styles.overdue : ''}`}>
              <Symbol name={overdue ? 'warning' : 'schedule'} size={11} />
              <span>{formatDueDate(order.dueDate)}</span>
            </span>
          )}
        </div>

        {order.styleName && (
          <span className={styles.styleName}>
            <Symbol name="checkroom" size={11} />
            <span>{order.styleName}</span>
          </span>
        )}
      </div>
    </button>
  );
}
