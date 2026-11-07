import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getPublicOrderView, getPublicBatchSiblings, hasOrderRatingAction, getPublicOrderEvents } from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { OrderStatus, OrderPhoto, StatusChange } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import ReminderButton from './_components/ReminderButton/ReminderButton';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import TimelineStage, { CLIENT_STAGE_HEADLINES } from './_components/TimelineStage';
import SelectedDesignCard from './_components/SelectedDesignCard';
import RatingForm from './_components/RatingForm/RatingForm';
import ShareTrackButton from './_components/ShareTrackButton';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

// Private-by-link customer page (real names, order details) — must never
// show up in search results even though it's technically public/unauthed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const revalidate = 60;

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'];

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
          <p className={styles.errorText}>Please double-check your tracking URL or contact your tailor.</p>
        </div>
      </div>
    );
  }

  const { order, customer, shop } = view;
  const isDelivered = order.status === 'Delivered';
  const [batchSiblings, alreadyRated, events] = await Promise.all([
    getPublicBatchSiblings(orderId),
    isDelivered ? hasOrderRatingAction(orderId) : Promise.resolve(false),
    getPublicOrderEvents(orderId),
  ]);
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  // We only show future appointments to the customer (e.g. Fittings)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = events.filter(e => 
    e.date >= todayStr && 
    (e.type === 'fitting' || e.type === 'meeting')
  );

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
          ? 'Target tomorrow'
          : daysRemaining === 0
            ? 'Target today'
            : 'Final touches in progress';

  const visibleStages = STATUS_ORDER.filter(
    (s, i) => s !== 'Delivered' || i <= currentStepIndex
  );

  const photosFor = (status: OrderStatus): OrderPhoto[] =>
    (order.images || []).filter((p) => p.stage === status);

  const balanceOwed = getBalanceOwed(order);

  return (
    <div className={styles.page}>
      {/* Atelier-first header celebrating the tailoring studio */}
      <header className={styles.header}>
        <div className={styles.atelierBlock}>
          {shop?.logoUrl ? (
            <div className={styles.atelierLogoWrap}>
              <Image src={shop.logoUrl} alt={shop.name} width={38} height={38} className={styles.atelierLogo} />
            </div>
          ) : (
            <div className={styles.atelierMonogram}>
              {(shop?.name || APP_CONFIG.name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.atelierText}>
            <span className={styles.atelierName}>{shop?.name || APP_CONFIG.name}</span>
            <span className={styles.atelierBadge}>
              <Symbol name="verified" size={13} className={styles.atelierBadgeIcon} />
              Bespoke Atelier
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {shop?.phone && (
            <a
              href={`https://wa.me/${shop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${shop.name}, I am tracking my order #${order.id.slice(0, 4).toUpperCase()} (${order.orderDetails}).`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerChatBtn}
              title={`Message ${shop.name} on WhatsApp`}
            >
              <WhatsappIcon size={14} />
              <span className={styles.headerChatText}>Chat Studio</span>
            </a>
          )}
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroTopRow}>
            <span className={styles.orderChip}>
              <Symbol name="verified" size={16} className={styles.orderChipIcon} />
              Order #{order.id.slice(0, 4).toUpperCase()}
            </span>
            <ShareTrackButton orderTitle={order.orderDetails} shopName={shop?.name} />
          </div>
          <h2 className={styles.heroTitle}>Tracking your {order.orderDetails}</h2>
          <p className={styles.heroSub}>
            Hello {order.customerName ? order.customerName.split(' ')[0] : 'there'} — watch your piece come to life
            {shop ? ` at ${shop.name}` : ''}. Every milestone of your bespoke garment is documented here.
          </p>
          {order.dueDate && order.status !== 'Delivered' && (
            <div className={styles.dueRow}>
              <Symbol name="event" size={18} className={styles.dueIcon} />
              <span>
                Target Completion:{' '}
                {new Date(order.dueDate).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              {daysRemainingLabel && (
                <span className={`${styles.daysBadge} ${daysRemaining !== null && daysRemaining <= 0 ? styles.daysBadgeActive : ''}`}>
                  {daysRemainingLabel}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Selected design & fabric reference card */}
        <SelectedDesignCard
          inspirationImages={order.inspirationImages}
          fabrics={customer?.fabrics}
        />

        {/* Visual progress story */}
        {isDelivered ? (
          <RatingForm orderId={order.id} shopName={shop?.name || APP_CONFIG.name} alreadyRated={alreadyRated} />
        ) : (
          <section className={styles.timeline}>
            <div className={styles.timelineRail} aria-hidden="true" />
            {visibleStages.map((status, index) => {
              const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'Delivered');
              const isCurrent = index === currentStepIndex && status !== 'Delivered';
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

        {/* Customer Appointments / Fitting Sessions */}
        {upcomingAppointments.length > 0 && (
          <section className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Try-On & Fitting Session</h3>
              <span className={styles.fittingBadge}>Scheduled</span>
            </div>
            <div className={styles.siblingList}>
              {upcomingAppointments.map(evt => {
                const dateObj = new Date(evt.date);
                const isToday = evt.date === todayStr;
                return (
                  <div key={evt.id} className={styles.siblingRow} style={{ flexWrap: 'wrap' }}>
                    <div className={styles.siblingDetails}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Symbol name="calendar_month" size={16} />
                        <strong>{evt.title}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', marginTop: '4px' }}>
                        {isToday ? 'Today' : dateObj.toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' })}
                        {evt.startTime && ` • ${evt.startTime}`}
                      </div>
                    </div>
                    {evt.type === 'fitting' && (
                      <span className={styles.siblingStatus} style={{ background: 'var(--sf-accent-purple-light)', color: 'var(--sf-accent-purple)' }}>
                        Fitting
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {shop?.address && (
              <div className={styles.studioLocationBlock}>
                <div className={styles.studioLocationInfo}>
                  <Symbol name="location_on" size={16} className={styles.locationIcon} />
                  <span className={styles.studioLocationText}>{shop.address}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapLinkBtn}
                >
                  <span>Get Directions</span>
                  <Symbol name="arrow_forward" size={14} />
                </a>
              </div>
            )}
          </section>
        )}

        {/* Other pieces in this order */}
        {batchSiblings.length > 0 && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Other Pieces in This Order</h3>
            <div className={styles.siblingList}>
              {batchSiblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={ROUTES.track({ id: sibling.id, customerName: order.customerName, orderDetails: sibling.orderDetails })}
                  className={styles.siblingRow}
                >
                  <span className={styles.siblingDetails}>
                    {sibling.orderDetails.length > 60 ? sibling.orderDetails.slice(0, 60) + '…' : sibling.orderDetails}
                  </span>
                  <span className={styles.siblingStatus}>{CLIENT_STAGE_HEADLINES[sibling.status]}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Order summary & financials */}
        <section className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Order Summary</h3>
            <Link href={ROUTES.receipt(order)} className={styles.receiptLink}>
              <Symbol name="receipt_long" size={15} />
              <span>Digital Receipt</span>
            </Link>
          </div>
          <div className={styles.infoBlock} style={{ marginTop: '12px' }}>
            <span className={styles.infoLabel}>Outfit Details</span>
            <p className={styles.infoValue}>{order.orderDetails}</p>
          </div>
          <div className={styles.billGrid}>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Total Price</span>
              <span className={styles.billVal}>{formatCurrency(order.totalBill, shop?.currency)}</span>
            </div>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Deposit Paid</span>
              <span className={styles.billVal}>{formatCurrency(order.depositPaid, shop?.currency)}</span>
            </div>
            <div className={`${styles.billItem} ${styles.balanceItem}`}>
              <span className={styles.billLabel}>Balance Due</span>
              {balanceOwed <= 0 ? (
                <span className={styles.paidInFullVal}>
                  <Symbol name="check_circle" size={15} />
                  <span>Paid in Full</span>
                </span>
              ) : (
                <span className={styles.balanceVal}>{formatCurrency(balanceOwed, shop?.currency)}</span>
              )}
            </div>
          </div>

          <div className={styles.balanceNotice}>
            {balanceOwed > 0 ? (
              <p className={styles.balanceNoticeText}>
                <Symbol name="payments" size={16} className={styles.balanceNoticeIcon} />
                <span>Balance is payable at your try-on session or upon collection.</span>
              </p>
            ) : (
              <p className={styles.paidNoticeText}>
                <Symbol name="verified" size={16} className={styles.paidNoticeIcon} />
                <span>Your order is fully settled. No further payment required upon collection.</span>
              </p>
            )}
          </div>

          {shop?.phone && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--sf-border-light)' }}>
              <a
                href={`https://wa.me/${shop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${shop.name}, I am checking in on my order #${order.id.slice(0, 4).toUpperCase()} (${order.orderDetails}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shopContactBtn}
              >
                <WhatsappIcon size={16} />
                <span>Chat with {shop.name}</span>
              </a>
            </div>
          )}
        </section>

        {/* Courtesy workshop check-in */}
        {FEATURE_FLAGS.trackingPageReminder && (
          <ReminderButton orderId={order.id} initialLastReminderAt={order.lastReminderAt} />
        )}

        {/* Tailor CTA */}
        <section className={styles.ctaCard}>
          <Symbol name="auto_awesome" size={32} className={styles.ctaIcon} />
          <h3 className={styles.ctaTitle}>Are you a bespoke tailor?</h3>
          <p className={styles.ctaText}>
            Give your own customers this exact world-class live tracking experience. Manage orders, sizes, and payments effortlessly.
          </p>
          <a href="https://www.mystitchbooks.com" target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
            Get MyStitchBook
            <Symbol name="arrow_forward" size={16} />
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Crafted with care at {shop?.name || APP_CONFIG.name}
          <span className={styles.footerDivider}>•</span>
          <span>Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span></span>
        </p>
      </footer>
    </div>
  );
}
