import React from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { getPublicOrderView, getPublicOrderComments, getPublicBatchSiblings } from '@/app/public-actions';
import { getBalanceOwed } from '@/lib/types';
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { OrderStatus, OrderPhoto, StatusChange } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import CommentBox from '@/components/track/CommentBox/CommentBox';
import styles from './page.module.css';

const STATUS_ORDER: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready', 'Completed'];

const STAGE_ICONS: Record<OrderStatus, string> = {
  Documented: 'assignment',
  Cutting: 'content_cut',
  Sewing: 'apparel',
  Ready: 'inventory_2',
  Completed: 'check_circle',
};

const STAGE_HEADLINES: Record<OrderStatus, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Completed: 'Delivered',
};

const STAGE_STORIES: Record<OrderStatus, string> = {
  Documented: 'Your order has been carefully logged — specifications and measurements recorded.',
  Cutting: 'Patterns drafted and your fabric precision-cut to your exact measurements.',
  Sewing: 'On the machine — every seam stitched with care by your tailor.',
  Ready: 'Finished, pressed and packaged. Ready for pickup or delivery!',
  Completed: 'Delivered. Thank you for trusting us with your style!',
};

const PENDING_NOTES: Record<OrderStatus, string> = {
  Documented: 'Awaiting intake.',
  Cutting: 'Awaiting pattern drafting and fabric cutting.',
  Sewing: 'Awaiting the sewing bench.',
  Ready: 'Awaiting final finishing and quality checks.',
  Completed: 'Awaiting handover.',
};

function stageDate(history: StatusChange[], status: OrderStatus): Date | null {
  const entries = history.filter((h) => h.to === status);
  return entries.length > 0 ? new Date(entries[entries.length - 1].timestamp) : null;
}

function formatStageDate(d: Date): string {
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  if (sameDay) return 'Today';
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const [comments, batchSiblings] = await Promise.all([
    getPublicOrderComments(orderId),
    getPublicBatchSiblings(orderId),
  ]);
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  const daysRemaining = order.dueDate
    ? Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
      {/* Brand header — deliberately MyTailorBook, not the shop: this page
          is the app's main visibility channel to every shop's customers. */}
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <span className={styles.brandIcon}>
            <Symbol name="storefront" fill size={22} />
          </span>
          <span className={styles.brandName}>{APP_CONFIG.name}</span>
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
            Hello {order.customerName.split(' ')[0]} 👋 — watch your piece come to life
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

        {/* Visual progress story */}
        <section className={styles.timeline}>
          <div className={styles.timelineRail} aria-hidden="true" />
          {visibleStages.map((status, index) => {
            const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'Completed');
            const isCurrent = index === currentStepIndex && status !== 'Completed';
            const isPending = index > currentStepIndex;
            const date = stageDate(order.statusHistory, status);
            const photos = photosFor(status);
            const photo = photos[photos.length - 1];

            return (
              <article
                key={status}
                className={`${styles.stage} ${isCurrent ? styles.stageCurrent : ''} ${isPending ? styles.stagePending : ''}`}
              >
                <div className={styles.stageMeta}>
                  <div className={`${styles.stageNode} ${isCompleted ? styles.nodeDone : isCurrent ? styles.nodeNow : styles.nodeWait}`}>
                    <Symbol
                      name={isCompleted ? 'check' : STAGE_ICONS[status]}
                      size={isCurrent ? 24 : 20}
                      fill={isCompleted}
                      className={isCurrent ? styles.nodePulse : undefined}
                    />
                  </div>
                  <div className={styles.stageText}>
                    <span className={styles.stageDate}>
                      {isCurrent
                        ? date ? formatStageDate(date) : 'Today'
                        : isCompleted && date
                          ? formatStageDate(date)
                          : status === 'Ready' && order.dueDate
                            ? `Est. ${new Date(order.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                            : 'Up next'}
                    </span>
                    <h3 className={styles.stageTitle}>{STAGE_HEADLINES[status]}</h3>
                    <span
                      className={`${styles.stagePill} ${isCompleted ? styles.pillDone : isCurrent ? styles.pillNow : styles.pillWait}`}
                    >
                      {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className={styles.stageBody}>
                  {isPending ? (
                    <div className={styles.pendingCard}>
                      <Symbol name="hourglass_empty" size={30} className={styles.pendingIcon} />
                      <p>{PENDING_NOTES[status]}</p>
                    </div>
                  ) : photo ? (
                    <div className={`${styles.photoCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
                      {isCurrent && (
                        <span className={styles.liveTag}>
                          <span className={styles.liveTagDot} />
                          Live Update
                        </span>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={`Your garment during ${status}`} className={styles.stagePhoto} />
                      <div className={styles.photoCaption}>
                        <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
                        {isCurrent && order.assignedToName && (
                          <p className={styles.captionSub}>{order.assignedToName} is personally working on your garment.</p>
                        )}
                      </div>
                      {photos.length > 1 && (
                        <div className={styles.photoStrip}>
                          {photos.slice(0, -1).map((p, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={p.url} alt={`${status} photo ${i + 1}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`${styles.storyCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
                      {isCurrent && (
                        <span className={styles.liveTag}>
                          <span className={styles.liveTagDot} />
                          Live Update
                        </span>
                      )}
                      <Symbol name={STAGE_ICONS[status]} size={30} className={styles.storyIcon} />
                      <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
                      {isCurrent && order.assignedToName && (
                        <p className={styles.captionSub}>{order.assignedToName} is personally working on your garment.</p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* Other garments from the same drop-off */}
        {batchSiblings.length > 0 && (
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Also From Your Visit</h3>
            <div className={styles.siblingList}>
              {batchSiblings.map((sibling) => (
                <a key={sibling.id} href={`/track/${sibling.id}`} className={styles.siblingRow}>
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

        {/* Customer comments */}
        <CommentBox orderId={order.id} currentStage={order.status} initialComments={comments} />

        {/* WhatsApp CTA */}
        {shop?.phone && (
          <div className={styles.whatsappBlock}>
            <p className={styles.whatsappHint}>Prefer direct communication?</p>
            <a href={getWhatsAppLink(shop.phone)} target="_blank" rel="noopener noreferrer" className={styles.whatsappBtn}>
              <FaWhatsapp size={22} /> Chat with {shop.name}
            </a>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
        </p>
      </footer>
    </div>
  );
}
