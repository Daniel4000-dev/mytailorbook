import React from 'react';
import Link from 'next/link';
import { FaScissors, FaCheckDouble, FaBagShopping, FaCircleCheck, FaChevronLeft, FaClock, FaLocationDot, FaLock, FaClipboardList } from 'react-icons/fa6';
import { getDatabase } from '@/app/actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import type { OrderStatus } from '@/lib/types';
import styles from './page.module.css';

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  Documented: <FaClipboardList className={styles.iconStyle} />,
  Cutting: <FaScissors className={styles.iconStyle} />,
  Sewing: <FaCheckDouble className={styles.iconStyle} />,
  Ready: <FaBagShopping className={styles.iconStyle} />,
  Completed: <FaCircleCheck className={styles.iconStyle} />,
};

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Completed'];

const STATUS_DESCS: Record<OrderStatus, string> = {
  Documented: 'Your order details, measurements, and requirements have been registered.',
  Cutting: 'We are custom-cutting your Senator fabric with extreme precision.',
  Sewing: 'Our master tailors are sewing the panels and refining details.',
  Ready: 'Your garment is ironed, packaged, and ready for pick-up/delivery!',
  Completed: 'Delivered. Thank you for dressing premium with us!',
};

export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const db = await getDatabase();
  const order = db.orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.notFound}>
            <h2>Order Not Found</h2>
            <p>Please double-check your tracking URL or contact the shop support.</p>
            <Link href="/" className={styles.backLink}>
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  
  // Calculate progress bar percentage
  // Steps: Cutting (25%), Sewing (50%), Ready (75%), Completed (100%)
  const progressPercent = ((currentStepIndex + 1) / STATUS_ORDER.length) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.trackerWrapper}>
        
        {/* Brand Header */}
        <header className={styles.brandHeader}>
          <span className={styles.brandLogo}>MYTAILORBOOK</span>
          <span className={styles.badge}>Live Tracking</span>
        </header>

        {/* Hero Card */}
        <section className={styles.heroSection}>
          <div className={styles.heroHeader}>
            <h1 className={styles.customerName}>Hello, {order.customerName.split(' ')[0]} 👋</h1>
            <p className={styles.heroSubText}>Your outfit is in safe hands. Here is the current progress:</p>
          </div>

          <div className={styles.statusDisplay}>
            <span className={styles.statusBadge}>{order.status}</span>
            <span className={styles.dueDateText}>
              {order.status === 'Completed' ? 'Completed' : (
                <>
                  <FaClock className={styles.clockIcon} /> Expected: {order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Soon'}
                </>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBarTrack}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span>Intake</span>
              <span>Ready</span>
            </div>
          </div>
        </section>

        {/* Timeline Tracking */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Garment Status Timeline</h2>
          <div className={styles.trackerTimeline}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              let nodeStatusClass = styles.nodePending;
              if (isCompleted) nodeStatusClass = styles.nodeCompleted;
              if (isCurrent) nodeStatusClass = styles.nodeCurrent;

              return (
                <div key={status} className={`${styles.timelineNode} ${nodeStatusClass}`}>
                  <div className={styles.nodeLeft}>
                    <div className={styles.nodeCircle}>
                      {STATUS_ICONS[status]}
                    </div>
                    {index < STATUS_ORDER.length - 1 && (
                      <div className={styles.nodeLine} />
                    )}
                  </div>
                  <div className={styles.nodeRight}>
                    <h4 className={styles.nodeTitle}>{status}</h4>
                    <p className={styles.nodeDesc}>
                      {STATUS_DESCS[status]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Financial and Order Details */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Order Information</h2>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Outfits Details</span>
            <p className={styles.infoValueText}>{order.orderDetails}</p>
          </div>

          <div className={styles.divider} />

          <div className={styles.billBreakdown}>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Total Price</span>
              <span className={styles.billVal}>{formatCurrency(order.totalBill)}</span>
            </div>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Deposit Paid</span>
              <span className={styles.billVal}>{formatCurrency(order.depositPaid)}</span>
            </div>
            <div className={`${styles.billItem} ${styles.balanceItem}`}>
              <span className={styles.balanceLabel}>Outstanding Balance</span>
              <span className={styles.balanceVal}>{formatCurrency(getBalanceOwed(order))}</span>
            </div>
          </div>
        </section>

        <footer className={styles.trackerFooter}>
          <p>© {new Date().getFullYear()} MyTailorBook. Powered by MasterFit Studios.</p>
          <span className={styles.lockInfo}>
            <FaLock /> End-to-end Encrypted Client Access
          </span>
        </footer>

      </div>
    </div>
  );
}
