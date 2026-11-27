'use client';

import React from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar/Avatar';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { formatPhone, getTelLink } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import type { CalendarEvent, Customer } from '@/lib/types';
import styles from './AgendaCard.module.css';

export interface AgendaCardProps {
  event: CalendarEvent;
  customer?: Customer | null;
  onToggleStatus: (evt: CalendarEvent) => void;
  onOpenVerdict: (evt: CalendarEvent) => void;
  onWhatsAppReminder: (evt: CalendarEvent) => void;
}

export default function AgendaCard({
  event,
  customer,
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

  return (
    <article className={`${styles.card} ${isCompleted ? styles.cardCompleted : ''}`}>
      {/* ── Top Header Row ── */}
      <div className={styles.headerRow}>
        <div className={styles.clientBlock}>
          {customer ? (
            <Avatar name={customer.fullName} size="sm" shape="squircle" />
          ) : (
            <Avatar name={event.title} size="sm" shape="squircle" />
          )}

          <div className={styles.metaWrap}>
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

            <h4 className={styles.title}>{event.title}</h4>
            {customer && <p className={styles.customerSub}>{customer.fullName}</p>}
          </div>
        </div>

        {/* Time Tag & Action Controls */}
        <div className={styles.timeAndStatus}>
          <span className={styles.timeTag}>
            <Symbol name="schedule" size={12} />
            <span>{timeDisplay}</span>
          </span>

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
              <Symbol name="check" size={14} />
            </button>
          )}
        </div>
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

        {/* Send WhatsApp Appointment Reminder */}
        {isFitting && customer?.whatsappNumber && (
          <button
            type="button"
            className={styles.whatsAppReminderBtn}
            onClick={() => onWhatsAppReminder(event)}
            title="Send WhatsApp appointment reminder to client"
          >
            <WhatsappIcon size={14} />
            <span>Remind on WhatsApp</span>
          </button>
        )}

        {/* Call Client Phone Action */}
        {customer?.whatsappNumber && (
          <a
            href={getTelLink(customer.whatsappNumber)}
            className={styles.callClientChip}
            title="Call client"
          >
            <Symbol name="call" size={13} />
            <span>{formatPhone(customer.whatsappNumber)}</span>
          </a>
        )}
      </div>
    </article>
  );
}
