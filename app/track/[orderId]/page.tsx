import React from 'react';
import Link from 'next/link';
import { FaScissors, FaCheckDouble, FaMotorcycle, FaCircleCheck, FaChevronLeft } from 'react-icons/fa6';
import { getDatabase } from '@/app/actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { OrderStatus } from '@/lib/types';
import styles from './page.module.css';

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  Cutting: <FaScissors />,
  Sewing: <FaCheckDouble />,
  Ready: <FaMotorcycle />,
  Completed: <FaCircleCheck />,
};

const STATUS_ORDER: OrderStatus[] = ['Cutting', 'Sewing', 'Ready', 'Completed'];

export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const db = await getDatabase();
  
  const order = db.orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Order Not Found</h2>
          <p>Please check your tracking link.</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>MyTailorBook</div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcome}>
          <h1>Hello, {order.customerName.split(' ')[0]} 👋</h1>
          <p>Here is the status of your order.</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.orderLabel}>Order ID</span>
              <span className={styles.orderId}>{order.id}</span>
            </div>
            {order.dueDate && (
              <div style={{ textAlign: 'right' }}>
                <span className={styles.orderLabel}>Expected By</span>
                <span className={styles.dueDate}>
                  {new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          <div className={styles.tracker}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              let stateClass = '';
              if (isCompleted) stateClass = styles.stepCompleted;
              else if (isCurrent) stateClass = styles.stepCurrent;
              else stateClass = styles.stepPending;

              return (
                <div key={status} className={`${styles.step} ${stateClass}`}>
                  <div className={styles.stepIconWrapper}>
                    {STATUS_ICONS[status]}
                  </div>
                  <div className={styles.stepContent}>
                    <h3 className={styles.stepTitle}>{status}</h3>
                    {isCurrent && (
                      <p className={styles.stepDesc}>
                        {status === 'Cutting' && 'We are preparing your fabric.'}
                        {status === 'Sewing' && 'Your garment is currently being stitched.'}
                        {status === 'Ready' && 'Your outfit is ready for pickup/delivery!'}
                        {status === 'Completed' && 'Order has been delivered.'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Order Summary</h3>
          <p className={styles.orderDetails}>{order.orderDetails}</p>
          
          <div className={styles.billRow}>
            <span>Total Bill</span>
            <span>{formatCurrency(order.totalBill)}</span>
          </div>
          <div className={styles.billRow}>
            <span>Deposit Paid</span>
            <span>{formatCurrency(order.depositPaid)}</span>
          </div>
          <div className={`${styles.billRow} ${styles.balanceRow}`}>
            <span>Balance Remaining</span>
            <span>{formatCurrency(getBalanceOwed(order))}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
