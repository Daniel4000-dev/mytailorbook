import React from 'react';
import type { Metadata } from 'next';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import { getPublicOrderView, getPublicBatchSiblings, hasOrderRatingAction } from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { OrderStatus, OrderPhoto, StatusChange } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import ReminderButton from './_components/ReminderButton/ReminderButton';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import TimelineStage from './_components/TimelineStage';
import RatingForm from './_components/RatingForm/RatingForm';
import CopyDomain from './_components/CopyDomain';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

// Private-by-link customer page (real names, order details) — must never
// show up in search results even though it's technically public/unauthed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// A short cache window rather than none at all — this page gets repeat/
// burst traffic (a shared link opened by several people around the same
// time, or one customer refreshing to check status), and a stage change
// only needs to show up within a minute, not instantly. Comments and
// reminders are handled by their own client components with their own
// optimistic UI, independent of this page-level cache.
export const revalidate = 60;

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Completed'];

const STAGE_HEADLINES: Record<OrderStatus, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Completed: 'Delivered',
};

function stageDate(history: StatusChange[], status: OrderStatus): Date | null {
  const entries = history.filter((h) => h.to === status);
  return entries.length > 0 ? new Date(entries[entries.length - 1].timestamp) : null;
}

export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const view = await getPublicOrderView(orderId);

  if (!view) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Order Not Found</h2>
          <p className={styles.errorText}>Please double-check your tracking URL or contact the shop.</p>
        </div>
      </div>
    );
  }

  const { order, shop } = view;
  const isDelivered = order.status === 'Completed';
  const [batchSiblings, alreadyRated] = await Promise.all([
    getPublicBatchSiblings(orderId),
    isDelivered ? hasOrderRatingAction(orderId) : Promise.resolve(false),
  ]);
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  // This is a Server Component rendered fresh per request, not a client
  // component re-rendering in the browser — reading the real current time
  // here is correct, not a hydration-purity concern the lint rule assumes.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysRemaining = order.dueDate
    ? Math.ceil((new Date(order.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const daysRemainingLabel =
    daysRemaining === null
      ? null
      : daysRemaining > 1
        ? `${daysRemaining} days to go`
        : daysRemaining === 1
          ? 'Due tomorrow'
          : daysRemaining === 0
            ? 'Due today'
            : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} overdue`;

  // The story stops at "Ready" until it's actually reached — an endless
  // pending tail reads like a delay.
  const visibleStages = STATUS_ORDER.filter(
    (s, i) => s !== 'Completed' || i <= currentStepIndex
  );

  const photosFor = (status: OrderStatus): OrderPhoto[] =>
    (order.images || []).filter((p) => p.stage === status);

  return (
    <div className={styles.page}>
      {/* Brand header — deliberately MyStitchBook, not the shop: this page
          is the app's main visibility channel to every shop's customers. */}
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <span className={styles.brandIcon}>
            <BrandIcon />
          </span>
          <div className={styles.brandText}>
            <span className={styles.brandName}>{APP_CONFIG.name}</span>
            <CopyDomain domain="www.mystitchbooks.com" />
          </div>
        </div>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Live
        </span>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <span className={styles.orderChip}>
            <Symbol name="verified" size={18} className={styles.orderChipIcon} />
            Order #{order.id.slice(0, 4).toUpperCase()}
          </span>
          <h2 className={styles.heroTitle}>Tracking your {order.orderDetails}</h2>
          <p className={styles.heroSub}>
            Hello {order.customerName.split(' ')[0]} — watch your piece come to life
            {shop ? ` at ${shop.name}` : ''}. Every major step of the process is documented here.
          </p>
          {order.dueDate && order.status !== 'Completed' && (
            <div className={styles.dueRow}>
              <Symbol name="event" size={18} className={styles.dueIcon} />
              <span>
                Expected{' '}
                {new Date(order.dueDate).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              {daysRemainingLabel && (
                <span className={`${styles.daysBadge} ${daysRemaining !== null && daysRemaining < 0 ? styles.daysBadgeOverdue : ''}`}>
                  {daysRemainingLabel}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Visual progress story — once delivered, the story is over and
            the ask shifts to feedback instead of "what's next." */}
        {isDelivered ? (
          <RatingForm orderId={order.id} shopName={shop?.name || APP_CONFIG.name} alreadyRated={alreadyRated} />
        ) : (
          <section className={styles.timeline}>
            <div className={styles.timelineRail} aria-hidden="true" />
            {visibleStages.map((status, index) => {
              const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'Completed');
              const isCurrent = index === currentStepIndex && status !== 'Completed';
              const isPending = index > currentStepIndex;

              return (
                <TimelineStage
                  key={status}
                  status={status}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isPending={isPending}
                  date={stageDate(order.statusHistory, status)}
                  photos={photosFor(status)}
                  dueDate={order.dueDate}
                  assignedToName={order.assignedToName}
                />
              );
            })}
          </section>
        )}

        {/* Other garments from the same drop-off */}
        {batchSiblings.length > 0 && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Also From Your Visit</h3>
            <div className={styles.siblingList}>
              {batchSiblings.map((sibling) => (
                <a key={sibling.id} href={ROUTES.track(sibling.id)} className={styles.siblingRow}>
                  <span className={styles.siblingDetails}>
                    {sibling.orderDetails.length > 60 ? sibling.orderDetails.slice(0, 60) + '…' : sibling.orderDetails}
                  </span>
                  <span className={styles.siblingStatus}>{STAGE_HEADLINES[sibling.status]}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Order summary & financials */}
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Order Summary</h3>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Outfit Details</span>
            <p className={styles.infoValue}>{order.orderDetails}</p>
          </div>
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
              <span className={styles.billLabel}>Balance Due</span>
              <span className={styles.balanceVal}>{formatCurrency(getBalanceOwed(order))}</span>
            </div>
          </div>
        </section>

        {/* Send a reminder */}
        {FEATURE_FLAGS.trackingPageReminder && (
          <ReminderButton orderId={order.id} initialLastReminderAt={order.lastReminderAt} />
        )}

        {/* Promotional CTA */}
        <section className={styles.ctaCard}>
          <Symbol name="auto_awesome" size={32} className={styles.ctaIcon} />
          <h3 className={styles.ctaTitle}>Are you a tailor?</h3>
          <p className={styles.ctaText}>
            Give your own customers this exact world-class tracking experience. Manage orders, sizes, and payments effortlessly.
          </p>
          <a href="https://www.mystitchbooks.com" target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
            Get MyStitchBook
            <Symbol name="arrow_forward" size={16} />
          </a>
        </section>
      </main>

      {shop?.subscriptionStatus !== 'active' && (
        <footer className={styles.footer}>
          <p>
            Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
          </p>
        </footer>
      )}
    </div>
  );
}
