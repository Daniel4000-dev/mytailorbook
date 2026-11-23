'use client';

import Image from 'next/image';
import type { Order } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './FabricCard.module.css';

const STATUS_LABELS: Record<string, string> = {
  Documented: 'Waiting to Cut',
  Cutting: 'Currently Cutting',
  Sewing: 'In Sewing',
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
  onOpenSlip?: (order: Order) => void;
}

export default function FabricCard({ order, onClick, onOpenSlip }: FabricCardProps) {
  // First image from order (intake / earliest stage photo)
  const photo = order.images?.[0]?.url ?? null;
  const overdue = isOverdue(order);
  const isRush = order.priority === 'rush';
  const isUrgent = order.priority === 'urgent';
  const hasPriority = isRush || isUrgent;
  const isClientFabric = order.materialSuppliedBy === 'customer';
  const orderTag = `#${order.id.slice(0, 4).toUpperCase()}`;

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
      {/* 1. Photo Area */}
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
            <Symbol name="photo_camera" size={24} className={styles.noPhotoIcon} />
            <span className={styles.noPhotoText}>Swatch Pending</span>
          </div>
        )}

        {/* Minimalist Atelier Chalk Reference Tag — Top-Left */}
        <div className={styles.chalkTag}>
          <span className={styles.chalkTagId}>{orderTag}</span>
          {hasPriority && (
            <span
              className={`${styles.rushDot} ${isRush ? styles.rushFlame : styles.rushBolt}`}
              title={isRush ? 'Rush order' : 'Urgent order'}
            />
          )}
        </div>

        {/* Client Fabric Indicator — Top-Right */}
        {isClientFabric && (
          <span className={styles.clientClothTag}>
            Client Cloth
          </span>
        )}
      </div>

      {/* 2. Atelier Information Card */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.customerName}>{order.customerName || 'Walk-in Client'}</span>
          {onOpenSlip && (
            <button
              type="button"
              className={styles.quickSlipBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenSlip(order);
              }}
              title="Open workshop cutting slip"
              aria-label="Open workshop cutting slip"
            >
              <Symbol name="straighten" size={12} />
              <span>Slip</span>
            </button>
          )}
        </div>

        {/* Style & Yardage Subtitle */}
        <div className={styles.subtext}>
          {order.styleName && <span>{order.styleName}</span>}
          {order.styleName && yardage && <span className={styles.dotSeparator}>·</span>}
          {yardage && <span>{yardage}</span>}
          {!order.styleName && !yardage && <span className={styles.dimText}>Bespoke Garment</span>}
        </div>

        {/* Clean Status Dot & Due Date */}
        <div className={styles.statusFooter}>
          <div className={styles.statusGroup}>
            <span className={`${styles.statusDot} ${styles[`dot_${order.status}`] || ''}`} />
            <span className={styles.statusLabel}>{STATUS_LABELS[order.status] || order.status}</span>
          </div>

          {order.dueDate && (
            <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
              {formatDueDate(order.dueDate)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
