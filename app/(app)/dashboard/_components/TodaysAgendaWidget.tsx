'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useData } from '@/contexts/DataContext';
import { updateEventStatus } from '@/app/actions/calendar';
import { ROUTES } from '@/lib/routes';
import type { CalendarEvent } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './TodaysAgendaWidget.module.css';

export default function TodaysAgendaWidget() {
  const { calendarEvents, orders, isLoaded } = useData();
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'pending' | 'completed'>>({});

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Merge today's calendar events with orders due today — fully synchronous, 0ms lag
  const events = useMemo(() => {
    const list: CalendarEvent[] = (calendarEvents || [])
      .filter((e) => (e.date || '').split('T')[0] === todayStr)
      .map((e) => (localStatuses[e.id] ? { ...e, status: localStatuses[e.id] } : e));

    // Merge in any orders due today that aren't already represented as deadlines
    (orders || []).forEach((order) => {
      if (order.dueDate && order.dueDate.split('T')[0] === todayStr) {
        const alreadyHasDeadline = list.some(
          (e) => e.relatedOrderId === order.id || e.id === `order-deadline-${order.id}`
        );
        if (!alreadyHasDeadline) {
          list.push({
            id: `order-deadline-${order.id}`,
            shopId: order.shopId,
            title: `${order.customerName} Delivery`,
            date: todayStr,
            type: 'dispatch',
            relatedOrderId: order.id,
            relatedCustomerId: order.customerId,
            description: order.orderDetails,
            status: order.status === 'Delivered' ? 'completed' : 'pending',
            createdAt: order.createdAt,
          });
        }
      }
    });

    return list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [calendarEvents, orders, todayStr, localStatuses]);

  if (!isLoaded) return null;

  const pendingCount = events.filter((e) => e.status !== 'completed').length;
  const fittingsCount = events.filter((e) => e.type === 'fitting').length;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Symbol name="calendar_today" size={17} />
          </span>
          <h2 className={styles.title}>Today&apos;s Schedule &amp; Fittings</h2>
          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>{pendingCount} Pending</span>
          )}
          {fittingsCount > 0 && (
            <span className={styles.fittingCountBadge}>{fittingsCount} Try-ons</span>
          )}
        </div>
        <Link href={ROUTES.calendarWithFilter('fitting')} className={styles.calendarLink}>
          <span>Lounge</span>
          <Symbol name="chevron_right" size={14} />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyLeft}>
            <Symbol name="calendar_today" size={16} className={styles.emptyIcon} />
            <span className={styles.emptyText}>No fittings or appointments scheduled today</span>
          </div>
          <Link href={ROUTES.calendarWithFilter('fitting')} className={styles.scheduleBtn}>
            <Symbol name="add" size={12} />
            <span>Schedule</span>
          </Link>
        </div>
      ) : (
        <div className={styles.eventList}>
          {events.map((evt) => {
            const isCompleted = evt.status === 'completed';
            const isFitting = evt.type === 'fitting';
            const isDeadline = evt.id.startsWith('order-deadline-') || evt.type === 'dispatch';

            return (
              <div
                key={evt.id}
                className={`${styles.eventItem} ${isCompleted ? styles.eventItemCompleted : ''}`}
              >
                <div className={styles.eventLeft}>
                  {!isDeadline && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus = isCompleted ? 'pending' : 'completed';
                        setLocalStatuses((prev) => ({ ...prev, [evt.id]: newStatus }));
                        await updateEventStatus(evt.id, newStatus);
                      }}
                      className={`${styles.checkBtn} ${isCompleted ? styles.checkBtnCompleted : ''}`}
                      title={isCompleted ? 'Mark as pending' : 'Mark as done'}
                      aria-label={isCompleted ? 'Mark as pending' : 'Mark as done'}
                    >
                      <Symbol name="check" size={12} />
                    </button>
                  )}
                  <span
                    className={`${styles.eventTitle} ${isCompleted ? styles.eventTitleCompleted : ''
                      }`}
                  >
                    {evt.title}
                  </span>
                  {isFitting && (
                    <span className={styles.fittingMiniPill}>Fitting</span>
                  )}
                  {isDeadline && (
                    <span className={styles.deadlineMiniPill}>Dispatch</span>
                  )}
                </div>
                <span className={styles.eventTime}>
                  {evt.startTime || 'All day'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
