'use client';

import React from 'react';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { getTelLink } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import type { CalendarEvent, Customer } from '@/lib/types';
import styles from './AgendaCard.module.css';

export interface AgendaCardProps {
  event: CalendarEvent;
  customer?: Customer | null;
  /** When false (e.g. workshop floor staff), customer call/WhatsApp actions are suppressed for privacy */
  canContactClient?: boolean;
  onToggleStatus: (evt: CalendarEvent) => void;
  onOpenVerdict: (evt: CalendarEvent) => void;
  onWhatsAppReminder: (evt: CalendarEvent) => void;
}

/**
 * Intelligent de-duplication: Ensures customer name isn't repetitively printed
 * both in the headline and subhead when auto-generated titles include client names.
 */
function getDeduplicatedTitleAndClient(eventTitle: string, customerName?: string | null) {
  if (!customerName) {
    return { title: eventTitle, showCustomerSub: false };
  }

  const trimmedCust = customerName.trim();
  const lowerCust = trimmedCust.toLowerCase();
  const trimmedTitle = eventTitle.trim();
  const lowerTitle = trimmedTitle.toLowerCase();

  // Pattern 1: "Fitting: <Customer> (<Outfit>)" -> Headline: "<Outfit> Fitting", Subhead: "<Customer>"
  const fittingOutfitMatch = trimmedTitle.match(/^Fitting:\s*.+?\s*\((.+?)\)$/i);
  if (fittingOutfitMatch && lowerTitle.includes(lowerCust)) {
    return {
      title: `${fittingOutfitMatch[1]} Fitting`,
      showCustomerSub: true,
    };
  }

  // Pattern 2: "<Customer> Delivery" -> Headline: "Garment Delivery", Subhead: "<Customer>"
  if (lowerTitle === `${lowerCust} delivery` || lowerTitle === `${lowerCust}'s delivery`) {
    return {
      title: 'Garment Delivery',
      showCustomerSub: true,
    };
  }

  // Pattern 3: Title exactly matches customer name
  if (lowerTitle === lowerCust) {
    return {
      title: trimmedTitle,
      showCustomerSub: false,
    };
  }

  // Pattern 4: Title starts with "Fitting: <Customer>"
  if (lowerTitle.startsWith(`fitting: ${lowerCust}`)) {
    const remainder = trimmedTitle.slice(`fitting: ${lowerCust}`.length).trim();
    return {
      title: remainder ? `Fitting ${remainder}` : 'Fitting Session',
      showCustomerSub: true,
    };
  }

  // Pattern 5: Title already prominently includes customer name -> keep title as-is, suppress redundant subheader
  if (lowerTitle.includes(lowerCust)) {
    return {
      title: trimmedTitle,
      showCustomerSub: false,
    };
  }

  // Distinct title and customer name -> display both cleanly
  return {
    title: trimmedTitle,
    showCustomerSub: true,
  };
}

export default function AgendaCard({
  event,
  customer,
  canContactClient = true,
  onToggleStatus,
  onOpenVerdict,
  onWhatsAppReminder,
}: AgendaCardProps) {
  const isDeadline = event.id.startsWith('order-deadline-') || event.type === 'dispatch';
  const isFitting = event.type === 'fitting';
  const isCompleted = event.status === 'completed';

  const timeDisplay = event.startTime
    ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
    : 'All day';

  const { title: displayTitle, showCustomerSub } = getDeduplicatedTitleAndClient(
    event.title,
    customer?.fullName
  );

  return (
    <article className={`${styles.card} ${isCompleted ? styles.cardCompleted : ''}`}>
      {/* ── Top Meta Bar: Time, Category Pill, Status Badge & Check Control ── */}
      <div className={styles.topMetaBar}>
        <div className={styles.timeAndCategory}>
          {/* Contextual Craft Category Tag */}
          {isFitting ? (
            <span className={`${styles.categoryPill} ${styles.categoryFitting}`}>
              <Symbol name="checkroom" size={12} />
              <span>Fitting Session</span>
            </span>
          ) : isDeadline ? (
            <span className={`${styles.categoryPill} ${styles.categoryDeadline}`}>
              <Symbol name="local_shipping" size={12} />
              <span>Garment Delivery</span>
            </span>
          ) : (
            <span className={`${styles.categoryPill} ${styles.categoryTask}`}>
              <Symbol name="task_alt" size={12} />
              <span>Workshop Task</span>
            </span>
          )}

          {/* Time Tag */}
          <span className={styles.timeTag}>
            <Symbol name="schedule" size={12} />
            <span>{timeDisplay}</span>
          </span>
        </div>

        {/* Status Badge & Check Action */}
        <div className={styles.statusAndCheck}>
          {isFitting && (
            <span
              className={`${styles.fittingBadge} ${
                isCompleted ? styles.fittingBadgeDone : styles.fittingBadgePending
              }`}
            >
              {isCompleted ? 'Fitted' : 'Pending'}
            </span>
          )}

          {!isDeadline && (
            <button
              type="button"
              className={`${styles.statusCheckBtn} ${isCompleted ? styles.statusCheckBtnDone : ''}`}
              onClick={() => onToggleStatus(event)}
              title={isCompleted ? 'Mark pending' : 'Mark completed'}
              aria-label="Toggle completion status"
            >
              <Symbol name="check" size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content: Title & Customer Name (Deduplicated) ── */}
      <div className={styles.contentBlock}>
        <h4 className={styles.title}>{displayTitle}</h4>
        {showCustomerSub && customer && (
          <p className={styles.customerSub}>
            <Symbol name="person" size={13} className={styles.customerIcon} />
            <span>{customer.fullName}</span>
          </p>
        )}
      </div>

      {/* ── Full-Width Description Box ── */}
      {event.description && (
        <div className={styles.descContainer}>
          <div className={styles.descHeader}>
            <Symbol name="notes" size={13} className={styles.descIcon} />
            <span>{isFitting ? 'Fitting Notes & Instructions' : 'Task Notes'}</span>
          </div>
          <p className={styles.descText}>{event.description}</p>
        </div>
      )}

      {/* ── Action Strip ── */}
      <div className={styles.actionStrip}>
        {/* Record / Update Fitting Verdict */}
        {isFitting && (
          <button
            type="button"
            className={styles.verdictBtn}
            onClick={() => onOpenVerdict(event)}
            title="Record fitting session outcome"
          >
            <Symbol name="straighten" size={14} />
            <span>{isCompleted ? 'Update Verdict' : 'Record Verdict'}</span>
          </button>
        )}

        {/* Link to Workshop Cutting Slip / Dossier */}
        {isDeadline && event.relatedOrderId && (
          <Link
            href={ROUTES.productionOrder(event.relatedOrderId)}
            className={styles.viewOrderBtn}
          >
            <Symbol name="content_cut" size={14} />
            <span>Open Workshop Slip</span>
          </Link>
        )}

        {/* Send WhatsApp Appointment Reminder — Gated to Owner/Manager */}
        {canContactClient && isFitting && customer?.whatsappNumber && (
          <button
            type="button"
            className={styles.whatsAppReminderBtn}
            onClick={() => onWhatsAppReminder(event)}
            title="Send WhatsApp appointment reminder to client"
          >
            <WhatsappIcon size={14} />
            <span>WhatsApp Reminder</span>
          </button>
        )}

        {/* Call Client Phone Action — Gated to Owner/Manager, explicit CTA label */}
        {canContactClient && customer?.whatsappNumber && (
          <a
            href={getTelLink(customer.whatsappNumber)}
            className={styles.callClientBtn}
            title="Call client"
          >
            <Symbol name="call" size={14} />
            <span>Call Client</span>
          </a>
        )}
      </div>
    </article>
  );
}

