import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  getPublicOrderView,
  getPublicBatchSiblings,
  hasOrderRatingAction,
  getPublicOrderEvents,
} from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { getTierForXp, isXpSystemEnabled } from '@/lib/xp';
import type { OrderStatus, OrderPhoto, StatusChange } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import ReminderButton from './_components/ReminderButton/ReminderButton';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { CLIENT_STAGE_HEADLINES } from './_components/TimelineStage';
import LiveTrackingJourney from './_components/LiveTrackingJourney';
import SelectedDesignCard from './_components/SelectedDesignCard';
import RatingForm from './_components/RatingForm/RatingForm';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

// Dynamic OpenGraph metadata for social & WhatsApp message previews
export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  const view = await getPublicOrderView(orderId);
  if (!view) {
    return {
      title: `Order Tracking | ${APP_CONFIG.name}`,
      robots: { index: false, follow: false },
    };
  }

  const { order, shop } = view;
  const shopName = shop?.name || APP_CONFIG.name;
  const title = `Tracking: ${order.orderDetails} | ${shopName}`;
  const description = `Live craftsmanship updates and progress photos for your custom garment at ${shopName}.`;
  const primaryImage = order.images?.[0]?.url || order.inspirationImages?.[0] || shop?.logoUrl;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(primaryImage ? { images: [{ url: primaryImage }] } : {}),
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(primaryImage ? { images: [primaryImage] } : {}),
    },
  };
}

export const revalidate = 60;

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'];
const PASS_SEGMENTS: { status: OrderStatus; shortLabel: string }[] = [
  { status: 'Documented', shortLabel: 'Confirmed' },
  { status: 'Cutting', shortLabel: 'Cutting' },
  { status: 'Sewing', shortLabel: 'Sewing' },
  { status: 'Ready', shortLabel: 'Ready' },
];

function stageDate(history: StatusChange[], status: OrderStatus): Date | null {
  const entries = history.filter((h) => h.to === status);
  return entries.length > 0 ? new Date(entries[entries.length - 1].timestamp) : null;
}

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const view = await getPublicOrderView(orderId, { recordView: true });

  if (!view) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <Symbol name="search" size={40} className={styles.errorIcon} />
          <h2 className={styles.errorTitle}>Order Not Found</h2>
          <p className={styles.errorText}>
            We could not locate this order. Please check the tracking link sent by your tailor or
            contact them directly.
          </p>
          <Link href="/" className={styles.ctaButton} style={{ marginTop: '16px' }}>
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const { order, customer, shop } = view;
  const isDelivered = order.status === 'Delivered';
  const isTrackingReactivated = Boolean(order.metadata?.trackingReactivated);
  const hasMetadataRatedFlag = Boolean(order.metadata?.ratingSubmitted);

  // Short-circuit BEFORE running batchSiblings / events queries if already rated & not reactivated
  const alreadyRated = isDelivered
    ? hasMetadataRatedFlag || (await hasOrderRatingAction(order.id))
    : false;
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const deliveredDate = stageDate(order.statusHistory, 'Delivered');

  // Once the order is Delivered AND the customer's review has been collected (unless explicitly
  // reactivated by the tailor), return ONLY a zero-weight "Your Order is Completed" card —
  // no extra database queries, no images, and no WhatsApp/Storefront/Digital Receipt links.
  if (isDelivered && alreadyRated && !isTrackingReactivated) {
    return (
      <div className={styles.page}>
        <main className={styles.main} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <section className={styles.completedArchiveCard}>
            <div className={styles.completedArchiveBadge}>
              <Symbol name="check_circle" size={28} />
            </div>
            <span className={styles.completedArchiveOverline}>
              Order #{order.id.slice(0, 4).toUpperCase()} · Completed
            </span>
            <h1 className={styles.completedArchiveTitle}>Your Order is Completed</h1>
            <p className={styles.completedArchiveText}>
              Thank you for your patronage and feedback. This order has been completed and this
              tracking link is now closed.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const [batchSiblings, events] = await Promise.all([
    getPublicBatchSiblings(order.id),
    getPublicOrderEvents(order.id),
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = events.filter(
    (e) => e.date >= todayStr && (e.type === 'fitting' || e.type === 'meeting')
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

  // Never show a 'Delivered' stage card in the timeline
  const visibleStages = STATUS_ORDER.filter((s) => s !== 'Delivered');

  const photosFor = (status: OrderStatus): OrderPhoto[] =>
    (order.images || []).filter((p) => p.stage === status);

  const balanceOwed = getBalanceOwed(order);
  const latestProgressPhoto =
    order.images && order.images.length > 0
      ? order.images[order.images.length - 1].url
      : null;
  const outfitReferenceUrl =
    order.inspirationImages?.[0] || customer?.fabrics?.[0]?.url || null;

  const stagesPayload = visibleStages.map((s) => {
    const d = stageDate(order.statusHistory, s);
    return {
      status: s,
      dateIso: d ? d.toISOString() : null,
      photos: photosFor(s),
    };
  });

  const paidPercent =
    order.totalBill > 0
      ? Math.min(100, Math.max(0, Math.round((order.depositPaid / order.totalBill) * 100)))
      : 100;

  return (
    <div className={styles.page}>
      {/* Sticky Frosted Glass Studio Header */}
      <header className={styles.header}>
        <div className={styles.atelierBlock}>
          {shop?.logoUrl ? (
            <div className={styles.atelierLogoWrap}>
              <Image
                src={shop.logoUrl}
                alt={shop.name}
                width={38}
                height={38}
                className={styles.atelierLogo}
              />
            </div>
          ) : (
            <div className={styles.atelierMonogram}>
              {(shop?.name || APP_CONFIG.name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.atelierText}>
            <span className={styles.atelierName}>{shop?.name || APP_CONFIG.name}</span>
            {isXpSystemEnabled() && shop && shop.xp !== undefined && shop.xp > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 650,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    backgroundColor: `${getTierForXp(shop.xp).color}1A`,
                    color: getTierForXp(shop.xp).color,
                    border: `1px solid ${getTierForXp(shop.xp).color}40`,
                  }}
                  title={`Rank: ${getTierForXp(shop.xp).name}`}
                >
                  <Symbol name="workspace_premium" size={12} />
                  {getTierForXp(shop.xp).name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          {shop?.phone && (
            <a
              href={getWhatsAppLink(
                shop.phone,
                `Hello ${shop.name}, I am tracking my order #${order.id
                  .slice(0, 4)
                  .toUpperCase()} (${order.orderDetails}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerChatBtn}
              title={`Message ${shop.name} on WhatsApp`}
            >
              <WhatsappIcon size={14} />
              <span className={styles.headerChatText}>Chat on WhatsApp</span>
            </a>
          )}
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── 1 & 2. Clean Apple Live Activity Hero + Animated Stage Replay Journey ── */}
        <LiveTrackingJourney
          orderId={order.id}
          orderTitle={order.orderDetails}
          styleName={order.styleName}
          customerName={order.customerName}
          shopName={shop?.name || APP_CONFIG.name}
          shopLogoUrl={shop?.logoUrl || null}
          actualStatus={order.status}
          dueDate={order.dueDate}
          completedDateIso={deliveredDate ? deliveredDate.toISOString() : null}
          daysRemainingLabel={daysRemainingLabel}
          assignedToName={order.assignedToName}
          latestPhotoUrl={latestProgressPhoto}
          outfitReferenceUrl={outfitReferenceUrl}
          stages={stagesPayload}
        />

        {/* Selected design & fabric reference card */}
        <SelectedDesignCard
          inspirationImages={order.inspirationImages}
          fabrics={customer?.fabrics}
        />

        {/* When Delivered (and awaiting review), show the Review Card */}
        {isDelivered && (
          <RatingForm
            orderId={order.id}
            shopName={shop?.name || APP_CONFIG.name}
            alreadyRated={alreadyRated}
          />
        )}

        {/* Customer Appointments / Fitting Sessions */}
        {(!isDelivered || batchSiblings.some((s) => s.status !== 'Delivered')) &&
          upcomingAppointments.length > 0 && (
            <section className={styles.card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                  Try-On &amp; Fitting Session
                </h3>
                <span className={styles.fittingBadge}>Scheduled</span>
              </div>
              <div className={styles.siblingList}>
                {upcomingAppointments.map((evt) => {
                  const dateObj = new Date(evt.date);
                  const isToday = evt.date === todayStr;
                  return (
                    <div key={evt.id} className={styles.siblingRow} style={{ flexWrap: 'wrap' }}>
                      <div className={styles.siblingDetails}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Symbol name="calendar_month" size={16} />
                          <strong>{evt.title}</strong>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--sf-text-secondary)',
                            marginTop: '4px',
                          }}
                        >
                          {isToday
                            ? 'Today'
                            : dateObj.toLocaleDateString('en-NG', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                              })}
                          {evt.startTime && ` • ${evt.startTime}`}
                        </div>
                      </div>
                      {evt.type === 'fitting' && (
                        <span
                          className={styles.siblingStatus}
                          style={{
                            background: 'var(--sf-accent-purple-light)',
                            color: 'var(--sf-accent-purple)',
                          }}
                        >
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
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${shop.name} ${shop.address}`
                    )}`}
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
                  href={ROUTES.track({
                    id: sibling.id,
                    customerName: order.customerName,
                    orderDetails: sibling.orderDetails,
                  })}
                  className={styles.siblingRow}
                >
                  <span className={styles.siblingDetails}>
                    {sibling.orderDetails.length > 60
                      ? sibling.orderDetails.slice(0, 60) + '…'
                      : sibling.orderDetails}
                  </span>
                  <span className={styles.siblingStatus}>
                    {CLIENT_STAGE_HEADLINES[sibling.status]}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Order Summary, Payment Progress & Bank Transfer Pass ── */}
        <section className={styles.card}>
          <div>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
              Order Summary
            </h3>
          </div>
          <div className={styles.infoBlock} style={{ marginTop: '12px' }}>
            <span className={styles.infoLabel}>Commission Details</span>
            <p className={styles.infoValue}>{order.orderDetails}</p>
          </div>

          {/* Visual Settlement Progress Bar */}
          {order.totalBill > 0 && (
            <div className={styles.settlementMeterWrap}>
              <div className={styles.settlementMeterHeader}>
                <span className={styles.settlementMeterLabel}>Payment Progress</span>
                <span className={styles.settlementMeterPct}>{paidPercent}% settled</span>
              </div>
              <div className={styles.settlementTrack}>
                <div
                  className={styles.settlementFill}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className={styles.billGrid}>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Total Price</span>
              <span className={styles.billVal}>
                {formatCurrency(order.totalBill, shop?.currency)}
              </span>
            </div>
            <div className={styles.billItem}>
              <span className={styles.billLabel}>Deposit Paid</span>
              <span className={styles.billVal}>
                {formatCurrency(order.depositPaid, shop?.currency)}
              </span>
            </div>
            <div className={`${styles.billItem} ${styles.balanceItem}`}>
              <span className={styles.billLabel}>Balance Due</span>
              {balanceOwed <= 0 ? (
                <span className={styles.paidInFullVal}>
                  <Symbol name="check_circle" size={15} />
                  <span>Paid in Full</span>
                </span>
              ) : (
                <span className={styles.balanceVal}>
                  {formatCurrency(balanceOwed, shop?.currency)}
                </span>
              )}
            </div>
          </div>

          {/* Bank Settlement Box if Balance Due & Shop Bank Details Configured */}
          {balanceOwed > 0 &&
            (shop?.bankDetails?.bankName || shop?.bankDetails?.accountNumber) && (
              <div className={styles.bankTransferBox}>
                <div className={styles.bankTransferHeader}>
                  <Symbol name="account_balance" size={15} />
                  <span>Bank Transfer Details</span>
                </div>
                <div className={styles.bankTransferGrid}>
                  {shop.bankDetails.bankName && (
                    <div>
                      <span className={styles.bankFieldLabel}>Bank</span>
                      <span className={styles.bankFieldVal}>{shop.bankDetails.bankName}</span>
                    </div>
                  )}
                  {shop.bankDetails.accountNumber && (
                    <div>
                      <span className={styles.bankFieldLabel}>Account Number</span>
                      <span className={styles.bankFieldVal}>
                        {shop.bankDetails.accountNumber}
                      </span>
                    </div>
                  )}
                  {shop.bankDetails.accountName && (
                    <div>
                      <span className={styles.bankFieldLabel}>Account Name</span>
                      <span className={styles.bankFieldVal}>{shop.bankDetails.accountName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          <div className={styles.balanceNotice}>
            {balanceOwed > 0 ? (
              <p className={styles.balanceNoticeText}>
                <Symbol name="payments" size={16} className={styles.balanceNoticeIcon} />
                <span>Balance is payable at your try-on session or upon collection.</span>
              </p>
            ) : (
              <p className={styles.paidNoticeText}>
                <Symbol name="verified" size={16} className={styles.paidNoticeIcon} />
                <span>
                  Your order is fully settled. No further payment required upon collection.
                </span>
              </p>
            )}
          </div>
        </section>

        {/* Courtesy workshop check-in — active only before delivery */}
        {!isDelivered && FEATURE_FLAGS.trackingPageReminder && (
          <ReminderButton orderId={order.id} initialLastReminderAt={order.lastReminderAt} />
        )}

        {/* Tailor CTA */}
        <section className={styles.ctaCard}>
          <Symbol name="auto_awesome" size={32} className={styles.ctaIcon} />
          <h3 className={styles.ctaTitle}>Are you a tailor or fashion designer?</h3>
          <p className={styles.ctaText}>
            Give your own customers this exact world-class live tracking experience. Manage orders,
            sizes, and payments effortlessly.
          </p>
          <a
            href={APP_CONFIG.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
          >
            Get {APP_CONFIG.name}
            <Symbol name="arrow_forward" size={16} />
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Crafted with care at {shop?.name || APP_CONFIG.name}
          <span className={styles.footerDivider}>•</span>
          <span>
            Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
          </span>
        </p>
      </footer>
    </div>
  );
}
