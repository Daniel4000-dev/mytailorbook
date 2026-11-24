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
import { getTierForXp } from '@/lib/xp';
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

function formatMeasurementKey(rawKey: string): string {
  return rawKey
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [batchSiblings, alreadyRated, events] = await Promise.all([
    getPublicBatchSiblings(order.id),
    isDelivered ? hasOrderRatingAction(order.id) : Promise.resolve(false),
    getPublicOrderEvents(order.id),
  ]);
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const deliveredDate = stageDate(order.statusHistory, 'Delivered');

  // Once the order is Delivered AND the customer's review has been collected,
  // terminate the active tracking session and render a clean "Your Order is Completed" screen.
  if (isDelivered && alreadyRated) {
    return (
      <div className={styles.page}>
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
              <span className={styles.atelierBadge}>
                <Symbol name="verified" size={13} className={styles.atelierBadgeIcon} />
                Verified Tailor
              </span>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.completedArchiveCard}>
            <div className={styles.completedArchiveBadge}>
              <Symbol name="check_circle" size={28} />
            </div>
            <span className={styles.completedArchiveOverline}>
              Order #{order.id.slice(0, 4).toUpperCase()} · Closed
            </span>
            <h1 className={styles.completedArchiveTitle}>Your Order is Completed</h1>
            <p className={styles.completedArchiveText}>
              <strong>{order.orderDetails}</strong> was delivered
              {deliveredDate
                ? ` on ${deliveredDate.toLocaleDateString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : ''}{' '}
              and your review has been received. This live tracking link is now closed.
            </p>

            <div className={styles.completedArchiveActions}>
              <Link href={ROUTES.receipt(order)} className={styles.completedReceiptBtn}>
                <Symbol name="receipt_long" size={16} />
                <span>View Digital Receipt</span>
              </Link>
              {shop?.slug && (
                <Link href={ROUTES.studio(shop.slug)} className={styles.completedSecondaryBtn}>
                  <Symbol name="storefront" size={16} />
                  <span>Visit {shop.name}</span>
                </Link>
              )}
              {shop?.phone && (
                <a
                  href={getWhatsAppLink(
                    shop.phone,
                    `Hello ${shop.name}, thank you for my completed order (${order.orderDetails}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.completedSecondaryBtn}
                >
                  <WhatsappIcon size={15} />
                  <span>Contact Tailor</span>
                </a>
              )}
            </div>
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
  const latestPhoto =
    order.images && order.images.length > 0
      ? order.images[order.images.length - 1].url
      : order.inspirationImages?.[0] || customer?.fabrics?.[0]?.url || null;

  // Extract documented fit measurements (either on order or customer profile)
  const rawMeasurements =
    order.measurements && Object.keys(order.measurements).length > 0
      ? order.measurements
      : customer?.measurements || {};
  const measurementEntries = Object.entries(rawMeasurements).filter(
    ([key, val]) =>
      val !== undefined &&
      val !== null &&
      String(val).trim() !== '' &&
      String(val) !== '0' &&
      !key.startsWith('_')
  );

  const paidPercent =
    order.totalBill > 0
      ? Math.min(100, Math.max(0, Math.round((order.depositPaid / order.totalBill) * 100)))
      : 100;

  const activePassStep = isDelivered ? 4 : Math.min(4, Math.max(1, currentStepIndex + 1));

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className={styles.atelierBadge}>
                <Symbol name="verified" size={13} className={styles.atelierBadgeIcon} />
                Verified Tailor
              </span>
              {shop && shop.xp !== undefined && shop.xp > 0 && (
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
              )}
            </div>
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
        {/* ── 1. Apple Wallet-Style Sartorial Commission Pass Hero ── */}
        <section className={styles.commissionPass}>
          <div className={styles.passStitchBorder} aria-hidden="true" />

          <div className={styles.passTopRow}>
            <div className={styles.passChipGroup}>
              <span className={styles.passOrderChip}>
                <Symbol name="verified" size={14} />
                <span>Order #{order.id.slice(0, 4).toUpperCase()}</span>
              </span>
              {order.styleName && (
                <span className={styles.passStyleChip}>{order.styleName}</span>
              )}
            </div>

            <ShareTrackButton
              orderId={order.id}
              orderTitle={order.orderDetails}
              shopName={shop?.name || APP_CONFIG.name}
              shopLogoUrl={shop?.logoUrl || null}
              customerName={order.customerName}
              stageHeadline={CLIENT_STAGE_HEADLINES[order.status]}
              status={order.status}
              photoUrl={latestPhoto}
              dueDate={order.dueDate}
              completedDate={deliveredDate ? deliveredDate.toISOString() : null}
              isDelivered={isDelivered}
            />
          </div>

          <div className={styles.passBody}>
            <span className={styles.passClientOverline}>
              Prepared for {order.customerName || 'Valued Client'}
            </span>
            <h1 className={styles.passTitle}>{order.orderDetails}</h1>
            <p className={styles.passSubtitle}>
              {isDelivered
                ? `Completed and delivered by ${shop ? shop.name : 'your tailor'}. Thank you for your patronage.`
                : `Crafted to your individual measurements${
                    shop ? ` at ${shop.name}` : ''
                  }. Follow each tailoring milestone below.`}
            </p>
          </div>

          {/* 4-Step Illuminated Progress Rail inside Pass */}
          <div className={styles.passProgressSection}>
            <div className={styles.passProgressMeta}>
              <span className={styles.passProgressStage}>
                {CLIENT_STAGE_HEADLINES[order.status]}
              </span>
              <span className={styles.passProgressStepCount}>
                {isDelivered ? 'Completed (100%)' : `Step ${activePassStep} of 4`}
              </span>
            </div>

            <div className={styles.passSegmentsTrack} role="progressbar" aria-valuenow={activePassStep} aria-valuemin={1} aria-valuemax={4}>
              {PASS_SEGMENTS.map((seg, idx) => {
                const segFilled = isDelivered || idx < currentStepIndex;
                const segActive = !isDelivered && idx === currentStepIndex;
                return (
                  <div key={seg.status} className={styles.passSegmentCol}>
                    <div
                      className={`${styles.passSegmentBar} ${
                        segFilled
                          ? styles.passSegmentFilled
                          : segActive
                          ? styles.passSegmentActive
                          : ''
                      }`}
                    />
                    <span
                      className={`${styles.passSegmentLabel} ${
                        segFilled || segActive ? styles.passSegmentLabelLit : ''
                      }`}
                    >
                      {seg.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recessed Pass Telemetry Deck */}
          <div className={styles.passFooterDeck}>
            <div className={styles.passDeckCell}>
              <span className={styles.passDeckLabel}>Status</span>
              <span className={styles.passDeckValue}>
                {CLIENT_STAGE_HEADLINES[order.status]}
              </span>
            </div>

            <div className={styles.passDeckCell}>
              <span className={styles.passDeckLabel}>
                {isDelivered ? 'Delivered On' : 'Target Date'}
              </span>
              <span className={styles.passDeckValue}>
                {isDelivered && deliveredDate
                  ? deliveredDate.toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : order.dueDate
                  ? new Date(order.dueDate).toLocaleDateString('en-NG', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Scheduled'}
              </span>
            </div>

            <div className={styles.passDeckCell}>
              <span className={styles.passDeckLabel}>Timeline</span>
              <span className={styles.passDeckValue}>
                {isDelivered
                  ? 'Received'
                  : daysRemainingLabel ||
                    (measurementEntries.length > 0
                      ? `${measurementEntries.length} fit specs`
                      : 'In production')}
              </span>
            </div>
          </div>
        </section>

        {/* Selected design & fabric reference card */}
        <SelectedDesignCard
          inspirationImages={order.inspirationImages}
          fabrics={customer?.fabrics}
        />

        {/* When Delivered (and awaiting review), replace the progress timeline with the Review Card */}
        {isDelivered ? (
          <RatingForm
            orderId={order.id}
            shopName={shop?.name || APP_CONFIG.name}
            alreadyRated={alreadyRated}
          />
        ) : (
          /* ── 2. Craftsmanship Timeline with Sartorial SVG Blueprints (Only while in production) ── */
          <section className={styles.timeline}>
            <div className={styles.timelineRail} aria-hidden="true" />
            {visibleStages.map((status, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
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

        {/* ── 3. Documented Fit Profile Card (Makes Photo-less Orders Look Rich & Personal) ── */}
        {measurementEntries.length > 0 && (
          <section className={styles.card}>
            <div className={styles.fitHeaderRow}>
              <div className={styles.fitTitleGroup}>
                <Symbol name="straighten" size={18} className={styles.referenceIcon} />
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                    Documented Fit Profile
                  </h3>
                  <p className={styles.fitSubtitle}>
                    Bespoke measurements recorded for {order.customerName || 'this commission'}
                  </p>
                </div>
              </div>
              <span className={styles.referenceBadge}>
                {measurementEntries.length} Specs
              </span>
            </div>

            <div className={styles.fitSpecsGrid}>
              {measurementEntries.slice(0, 12).map(([key, val]) => (
                <div key={key} className={styles.fitSpecChip}>
                  <span className={styles.fitSpecLabel}>{formatMeasurementKey(key)}</span>
                  <span className={styles.fitSpecVal}>{String(val)}&quot;</span>
                </div>
              ))}
            </div>
          </section>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
              Order Summary
            </h3>
            <Link href={ROUTES.receipt(order)} className={styles.receiptLink}>
              <Symbol name="receipt_long" size={15} />
              <span>Digital Receipt</span>
            </Link>
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

          {shop?.phone && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--sf-border-light)',
              }}
            >
              <a
                href={getWhatsAppLink(
                  shop.phone,
                  `Hello ${shop.name}, I am checking in on my order #${order.id
                    .slice(0, 4)
                    .toUpperCase()} (${order.orderDetails}).`
                )}
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
