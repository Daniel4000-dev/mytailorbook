'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { updateEventStatus } from '@/app/actions/calendar';
import type { CalendarEvent } from '@/lib/types';
import type { OpenLoop } from '../_hooks/useOpenLoops';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Link from 'next/link';
import { formatNumber, getCurrencySymbol, getShopCurrency, getWhatsAppLink } from '@/lib/formatters';
import styles from './TodayPrioritiesWidget.module.css';

interface TodayPrioritiesWidgetProps {
  loops: OpenLoop[];
  onNavigate: (href: string) => void;
}

export default function TodayPrioritiesWidget({ loops, onNavigate }: TodayPrioritiesWidgetProps) {
  const { calendarEvents, customers, orders, currentShop, isLoaded } = useData();
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'pending' | 'completed'>>({});

  const currencySymbol = getCurrencySymbol(getShopCurrency(currentShop));

  const todayStr = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  const currentHour = useMemo(() => new Date().getHours(), []);
  const isEvening = currentHour >= 17;

  // Synchronous resolution directly from cached DataContext — instant 0ms rendering on screen refocus
  const events = useMemo(() => {
    return (calendarEvents || [])
      .filter((e) => (e.date || '').split('T')[0] === todayStr)
      .map((e) => (localStatuses[e.id] ? { ...e, status: localStatuses[e.id] } : e));
  }, [calendarEvents, todayStr, localStatuses]);

  const handleToggleEvent = async (evt: CalendarEvent) => {
    const isCompleted = evt.status === 'completed';
    const newStatus = isCompleted ? 'pending' : 'completed';
    setLocalStatuses((prev) => ({ ...prev, [evt.id]: newStatus }));
    try {
      await updateEventStatus(evt.id, newStatus);
    } catch (err) {
      console.warn('Failed to update event status', err);
      setLocalStatuses((prev) => {
        const copy = { ...prev };
        delete copy[evt.id];
        return copy;
      });
    }
  };

  const pendingEvents = events.filter((e) => e.status !== 'completed');
  const completedEvents = events.filter((e) => e.status === 'completed');
  const hasItems = pendingEvents.length > 0 || loops.length > 0;

  // Cash at Stake Today across priority open loops
  const totalCashAtStake = useMemo(() => {
    return loops.reduce((sum, l) => sum + (l.amountAtStake || 0), 0);
  }, [loops]);

  // Today's completed order deliveries
  const todayDeliveredOrders = useMemo(() => {
    return (orders || []).filter(
      (o) => o.status === 'Delivered' && o.updatedAt && o.updatedAt.split('T')[0] === todayStr
    );
  }, [orders, todayStr]);

  // Direct 1-tap WhatsApp link for today's fitting appointment
  const getFittingWhatsAppUrl = (evt: CalendarEvent) => {
    let customer = evt.relatedCustomerId ? customers.find((c) => c.id === evt.relatedCustomerId) : undefined;
    if (!customer && evt.title) {
      customer = customers.find(
        (c) => c.fullName && evt.title.toLowerCase().includes(c.fullName.toLowerCase())
      );
    }
    if (!customer?.whatsappNumber) return null;

    const clientFirst = (customer.fullName || 'there').trim().split(' ')[0];
    const shopName = currentShop?.name ? `*${currentShop.name}*` : 'our workshop';
    const timeText = evt.startTime ? ` at *${evt.startTime}*` : '';
    const msg = `Hello ${clientFirst}, this is a gentle reminder from ${shopName} regarding your garment fitting scheduled for today${timeText}. Please let us know if you are on schedule!`;
    return getWhatsAppLink(customer.whatsappNumber, msg);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Symbol name="calendar_today" size={16} className={styles.headerIcon} />
          <h2 className={styles.title}>Today&apos;s Schedule &amp; Priorities</h2>
        </div>
        <div className={styles.headerBadges}>
          {totalCashAtStake > 0 && (
            <span className={styles.cashAtStakeBadge} title="Total balance collectible from current priorities">
              <Symbol name="payments" size={13} />
              <span>{currencySymbol}{formatNumber(totalCashAtStake)} at stake</span>
            </span>
          )}
          {hasItems && (
            <span className={styles.pendingBadge}>
              {pendingEvents.length + loops.length} action{pendingEvents.length + loops.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {isLoaded && !hasItems && (
        <div className={styles.wrapUpBox}>
          <div className={styles.wrapUpHeader}>
            <div className={styles.clearIconWrap}>
              <Symbol name="verified" size={20} />
            </div>
            <div className={styles.wrapUpTextGroup}>
              <span className={styles.wrapUpTitle}>
                {isEvening ? 'Evening Workshop Wrap-Up' : 'All Clear · Workshop Running Smoothly'}
              </span>
              <p className={styles.wrapUpSub}>
                {isEvening
                  ? 'All scheduled fittings and priority loops are cleared for the night.'
                  : 'No overdue orders, missing measurements, or delayed fittings right now.'}
              </p>
            </div>
          </div>
          {(completedEvents.length > 0 || todayDeliveredOrders.length > 0) && (
            <div className={styles.wrapUpStats}>
              {completedEvents.length > 0 && (
                <span className={styles.wrapUpStatPill}>
                  <Symbol name="check" size={12} />
                  <span>{completedEvents.length} fitting{completedEvents.length === 1 ? '' : 's'} done</span>
                </span>
              )}
              {todayDeliveredOrders.length > 0 && (
                <span className={styles.wrapUpStatPill}>
                  <Symbol name="check" size={12} />
                  <span>{todayDeliveredOrders.length} order{todayDeliveredOrders.length === 1 ? '' : 's'} delivered</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Today's Appointments & Client Fittings */}
      {events.length > 0 && (
        <div className={styles.list}>
          {events.map((evt) => {
            const isCompleted = evt.status === 'completed';
            const waUrl = getFittingWhatsAppUrl(evt);
            return (
              <div
                key={evt.id}
                className={`${styles.itemRow} ${styles.fittingRow} ${isCompleted ? styles.completedRow : ''}`}
              >
                <div className={styles.itemLeft}>
                  <button
                    type="button"
                    onClick={() => handleToggleEvent(evt)}
                    className={`${styles.checkbox} ${isCompleted ? styles.checkboxChecked : ''}`}
                    aria-label={`Mark ${evt.title} as ${isCompleted ? 'pending' : 'done'}`}
                  >
                    {isCompleted && <Symbol name="check" size={14} />}
                  </button>
                  <div className={styles.itemMeta}>
                    <span
                      className={`${styles.itemTitle} ${isCompleted ? styles.itemTitleDone : ''}`}
                      title={evt.title}
                    >
                      {evt.title}
                    </span>
                    <span
                      className={styles.itemSub}
                      title={`${evt.startTime ? `${evt.startTime} · ` : ''}Client Fitting`}
                    >
                      {evt.startTime ? `${evt.startTime} · ` : ''}Client Fitting
                    </span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  {!isCompleted && waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.waActionBtn}
                      title="Send WhatsApp fitting reminder"
                      aria-label="Send WhatsApp fitting reminder"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WhatsappIcon size={14} />
                    </a>
                  )}
                  <span className={styles.fittingBadge}>Fitting</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Open Loops & Workshop Urgencies */}
      {loops.length > 0 && (
        <div className={styles.list}>
          {loops.map((loop) => (
            <div
              key={loop.id}
              role="button"
              tabIndex={0}
              className={`${styles.itemRow} ${styles.loopRow}`}
              onClick={() => onNavigate(loop.href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate(loop.href);
                }
              }}
            >
              <div className={styles.itemLeft}>
                <div className={`${styles.loopIconWrap} ${loop.urgency === 'high' ? styles.urgentIcon : ''}`}>
                  <Symbol
                    name={
                      loop.category === 'production'
                        ? 'local_fire_department'
                        : loop.category === 'measurements'
                        ? 'straighten'
                        : 'payments'
                    }
                    size={16}
                  />
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemTitle} title={loop.title}>
                    {loop.title}
                  </span>
                  {loop.subtitle && (
                    <span className={styles.itemSub} title={loop.subtitle}>
                      {loop.subtitle}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.itemRight}>
                {loop.whatsappUrl && (
                  <a
                    href={loop.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.waActionBtn}
                    title="Send WhatsApp message"
                    aria-label="Send WhatsApp message"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <WhatsappIcon size={14} />
                  </a>
                )}
                <div className={styles.loopActionPill}>
                  <span>{loop.actionText}</span>
                  <Symbol name="chevron_right" size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footerRow}>
        <Link href="/calendar" className={styles.calendarLink}>
          <span>Open Full Studio Calendar</span>
          <Symbol name="arrow_forward" size={13} />
        </Link>
      </div>
    </div>
  );
}
