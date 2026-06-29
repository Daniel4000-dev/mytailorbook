'use client';

import { useState } from 'react';
import { FaUser, FaCalendarDays, FaClock, FaRegCommentDots, FaLink, FaWhatsapp, FaCreditCard, FaTimeline, FaCircleCheck } from 'react-icons/fa6';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import ActivityTimeline from '@/components/kanban/ActivityTimeline/ActivityTimeline';
import { formatCurrency, formatDate, getWhatsAppLink } from '@/lib/formatters';
import { getBalanceOwed, isOverdue } from '@/lib/types';
import type { Order, Role, Customer } from '@/lib/types';
import styles from './OrderDetailSheet.module.css';

interface OrderDetailSheetProps {
  order: Order;
  customer: Customer | null;
  userRole: Role;
  onUpdatePayment: (orderId: string, amount: number) => Promise<void>;
}

export default function OrderDetailSheet({ order, customer, userRole, onUpdatePayment }: OrderDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/track/${order.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const balanceOwed = getBalanceOwed(order);

  const handleMarkAsPaid = async () => {
    setMarkingPaid(true);
    try {
      await onUpdatePayment(order.id, order.totalBill);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className={styles.orderDetail}>
      {/* Overview Card */}
      <div className={styles.premiumCard}>
        <div className={styles.customerRow}>
          <div className={styles.avatarLarge}>
            {order.customerName ? order.customerName[0].toUpperCase() : <FaUser />}
          </div>
          <div className={styles.customerInfo}>
            <h3 className={styles.customerHeaderName}>{order.customerName}</h3>
            <div className={styles.detailFlex}>
              <Badge variant={order.status.toLowerCase() as any}>
                {order.status}
              </Badge>
              {isOverdue(order) && (
                <Badge variant="default">⚠ Overdue</Badge>
              )}
            </div>
          </div>
        </div>

        <div className={styles.metaGrid}>
          {order.assignedToName && (
            <div className={styles.metaItem}>
              <FaUser className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <span className={styles.metaLabel}>Assigned To</span>
                <span className={styles.metaValue}>{order.assignedToName}</span>
              </div>
            </div>
          )}
          
          {order.dueDate && (
            <div className={styles.metaItem}>
              <FaCalendarDays className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <span className={styles.metaLabel}>Due Date</span>
                <span className={`${styles.metaValue} ${isOverdue(order) ? styles.overdueText : ''}`}>
                  {new Date(order.dueDate).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          <div className={styles.metaItem}>
            <FaClock className={styles.metaIcon} />
            <div className={styles.metaContent}>
              <span className={styles.metaLabel}>Created</span>
              <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className={styles.premiumCard}>
        <span className={styles.cardSectionTitle}>
          <FaRegCommentDots /> Order Details & Notes
        </span>
        <p className={styles.premiumDetailText}>{order.orderDetails}</p>
      </div>

      {/* Financial Summary Card (Owner Only) */}
      {userRole === 'Owner' && (
        <div className={`${styles.premiumCard} ${styles.financialCard}`}>
          <span className={styles.cardSectionTitle}>
            <FaCreditCard /> Payment Summary
          </span>
          <div className={styles.financialGrid}>
            <div className={styles.finCol}>
              <span className={styles.finLabel}>Total Bill</span>
              <span className={styles.finValue}>{formatCurrency(order.totalBill)}</span>
            </div>
            <div className={styles.finCol}>
              <span className={styles.finLabel}>Deposit Paid</span>
              <span className={styles.finValue}>{formatCurrency(order.depositPaid)}</span>
            </div>
            <div className={`${styles.finCol} ${styles.balanceCol}`}>
              <span className={styles.finLabel}>Balance Owed</span>
              <span className={styles.finGoldValue}>{formatCurrency(balanceOwed)}</span>
            </div>
          </div>
          
          {balanceOwed > 0 && (
            <div className={styles.markPaidBtn}>
              <Button 
                variant="primary" 
                fullWidth 
                loading={markingPaid}
                onClick={handleMarkAsPaid}
                icon={<FaCircleCheck />}
              >
                Mark as Paid in Full
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Communication Card */}
      <div className={styles.premiumCard}>
        <span className={styles.cardSectionTitle}>Share & Communicate</span>
        
        {customer && (
          <div className={styles.actionRow}>
            <span className={styles.actionRowLabel}>Customer Updates</span>
            <div className={styles.contactActions}>
              <a
                href={getWhatsAppLink(customer.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.premiumContactLink}
              >
                <FaWhatsapp /> Chat on WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <span className={styles.actionRowLabel}>Tracking Link</span>
          <div className={styles.linkActions}>
            <div className={styles.linkInputContainer}>
              <FaLink className={styles.linkIcon} />
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/track/${order.id}`}
                className={styles.premiumLinkInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {order.statusHistory.length > 0 && (
        <div className={styles.premiumTimelineSection}>
          <span className={styles.cardSectionTitle}>
            <FaTimeline /> Activity Timeline
          </span>
          <div className={styles.timelineContainer}>
            <ActivityTimeline history={order.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}
