import React from 'react';
import Image from 'next/image';
import { FaScissors, FaGears, FaBagShopping, FaCircleCheck, FaClipboardList, FaClock, FaLock } from 'react-icons/fa6';
import { getDatabase } from '@/app/actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { OrderStatus } from '@/lib/types';
import styles from './page.module.css';

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Completed'];

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  Documented: <FaClipboardList />,
  Cutting: <FaScissors />,
  Sewing: <FaGears />,
  Ready: <FaBagShopping />,
  Completed: <FaCircleCheck />,
};

const STATUS_ILLUSTRATIONS: Record<OrderStatus, string> = {
  Documented: '/images/stages/documented.png',
  Cutting: '/images/stages/cutting.png',
  Sewing: '/images/stages/sewing.png',
  Ready: '/images/stages/ready.png',
  Completed: '/images/stages/completed.png',
};

const STATUS_HEADLINES: Record<OrderStatus, string> = {
  Documented: 'Order Received',
  Cutting: 'Fabric Cutting',
  Sewing: 'Expert Stitching',
  Ready: 'Ready for You',
  Completed: 'Delivered!',
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  Documented: 'Your order has been carefully logged. Our team is reviewing your specifications and preparing to begin.',
  Cutting: 'Our craftsmen are precision-cutting your fabric to your exact measurements. Every detail matters.',
  Sewing: 'Your garment is on the sewing machine. Our master tailors are stitching every seam with care.',
  Ready: 'Your outfit is beautifully finished, pressed, and packaged. It\'s ready for pickup or delivery!',
  Completed: 'Your outfit has been delivered. Thank you for trusting us with your style!',
};

export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const db = await getDatabase();
  const order = db.orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Order Not Found</h2>
          <p className={styles.errorText}>Please double-check your tracking URL or contact the shop.</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const progressPercent = ((currentStepIndex + 1) / STATUS_ORDER.length) * 100;
  const currentIllustration = STATUS_ILLUSTRATIONS[order.status];
  const currentHeadline = STATUS_HEADLINES[order.status];
  const currentMessage = STATUS_MESSAGES[order.status];

  return (
    <div className={styles.page}>
      {/* Sticky Brand Header */}
      <header className={styles.stickyHeader}>
        <div className={styles.brandBlock}>
          <span className={styles.brandName}>{APP_CONFIG.name.toUpperCase()}</span>
          <span className={styles.brandDomain}>{APP_CONFIG.domain}</span>
        </div>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Live
        </span>
      </header>

      {/* Scrollable Content */}
      <div className={styles.scrollContent}>
        {/* Hero Illustration Card */}
        <section className={styles.heroCard}>
          <div className={styles.illustrationWrapper}>
            <Image
              src={currentIllustration}
              alt={currentHeadline}
              width={280}
              height={280}
              className={styles.illustration}
              priority
            />
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.heroGreeting}>
              Hello, {order.customerName.split(' ')[0]} 👋
            </h1>
            <h2 className={styles.heroHeadline}>{currentHeadline}</h2>
            <p className={styles.heroMessage}>{currentMessage}</p>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressWrapper}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span>Logged</span>
              <span>{order.status === 'Completed' ? 'Complete ✓' : `${Math.round(progressPercent)}%`}</span>
            </div>
          </div>
        </section>

        {/* Expected Delivery */}
        {order.dueDate && order.status !== 'Completed' && (
          <section className={styles.dueCard}>
            <FaClock className={styles.dueIcon} />
            <div className={styles.dueInfo}>
              <span className={styles.dueLabel}>Expected Completion</span>
              <span className={styles.dueDate}>
                {new Date(order.dueDate).toLocaleDateString('en-NG', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </section>
        )}

        {/* Stage Timeline */}
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Production Timeline</h3>
          <div className={styles.timeline}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              let nodeClass = styles.nodePending;
              if (isCompleted) nodeClass = styles.nodeCompleted;
              if (isCurrent) nodeClass = styles.nodeCurrent;

              return (
                <div key={status} className={`${styles.timelineNode} ${nodeClass}`}>
                  <div className={styles.nodeLeft}>
                    <div className={styles.nodeCircle}>
                      {STATUS_ICONS[status]}
                    </div>
                    {index < STATUS_ORDER.length - 1 && (
                      <div className={styles.nodeLine} />
                    )}
                  </div>
                  <div className={styles.nodeRight}>
                    <span className={styles.nodeTitle}>{STATUS_HEADLINES[status]}</span>
                    {(isCurrent || isCompleted) && (
                      <span className={styles.nodeSubtext}>
                        {isCompleted ? '✓ Complete' : 'In progress…'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order Details & Financials */}
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Order Summary</h3>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Outfit Details</span>
            <p className={styles.infoValue}>{order.orderDetails}</p>
          </div>
          <div className={styles.divider} />
          <div className={styles.billGrid}>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Total Price</span>
              <span className={styles.billVal}>{formatCurrency(order.totalBill)}</span>
            </div>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Deposit Paid</span>
              <span className={styles.billVal}>{formatCurrency(order.depositPaid)}</span>
            </div>
            <div className={`${styles.billItem} ${styles.balanceItem}`}>
              <span className={styles.balanceLabel}>Balance Due</span>
              <span className={styles.balanceVal}>{formatCurrency(getBalanceOwed(order))}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.trackerFooter}>
          <p>© {new Date().getFullYear()} {APP_CONFIG.name}</p>
          <span className={styles.lockBadge}>
            <FaLock /> Secure Client Portal
          </span>
        </footer>
      </div>
    </div>
  );
}
