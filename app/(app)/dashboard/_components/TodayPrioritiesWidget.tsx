'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { updateEventStatus } from '@/app/actions/calendar';
import type { CalendarEvent } from '@/lib/types';
import type { OpenLoop } from '../_hooks/useOpenLoops';
import Symbol from '@/components/ui/Symbol/Symbol';
import Link from 'next/link';
import styles from './TodayPrioritiesWidget.module.css';

interface TodayPrioritiesWidgetProps {
  loops: OpenLoop[];
  onNavigate: (href: string) => void;
}

export default function TodayPrioritiesWidget({ loops, onNavigate }: TodayPrioritiesWidgetProps) {
  const { calendarEvents, isLoaded } = useData();
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'pending' | 'completed'>>({});

  const todayStr = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

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
  const hasItems = pendingEvents.length > 0 || loops.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Symbol name="calendar_today" size={16} className={styles.headerIcon} />
          <h2 className={styles.title}>Today&apos;s Schedule &amp; Priorities</h2>
        </div>
        {hasItems && (
          <span className={styles.pendingBadge}>
            {pendingEvents.length + loops.length} action{pendingEvents.length + loops.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoaded && !hasItems && (
        <div className={styles.allClearBox}>
          <div className={styles.clearIconWrap}>
            <Symbol name="check_circle" size={18} />
          </div>
          <span className={styles.clearText}>All caught up · Workshop running smoothly</span>
        </div>
      )}

      {/* 1. Today's Appointments & Client Fittings */}
      {events.length > 0 && (
        <div className={styles.list}>
          {events.map((evt) => {
            const isCompleted = evt.status === 'completed';
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
                    <span className={`${styles.itemTitle} ${isCompleted ? styles.itemTitleDone : ''}`}>
                      {evt.title}
                    </span>
                    <span className={styles.itemSub}>
                      {evt.startTime ? `${evt.startTime} · ` : ''}Client Fitting
                    </span>
                  </div>
                </div>
                <span className={styles.fittingBadge}>Fitting</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Open Loops & Workshop Urgencies */}
      {loops.length > 0 && (
        <div className={styles.list}>
          {loops.map((loop) => (
            <button
              key={loop.id}
              type="button"
              className={`${styles.itemRow} ${styles.loopRow}`}
              onClick={() => onNavigate(loop.href)}
            >
              <div className={styles.itemLeft}>
                <div className={`${styles.loopIconWrap} ${loop.urgency === 'high' ? styles.urgentIcon : ''}`}>
                  <Symbol
                    name={
                      loop.category === 'production'
                        ? 'local_fire_department'
                        : loop.category === 'measurements'
                          ? 'straighten'
                          : 'account_balance_wallet'
                    }
                    size={16}
                  />
                </div>
                <span className={styles.itemTitle}>{loop.title}</span>
              </div>
              <div className={styles.loopActionPill}>
                <span>{loop.actionText}</span>
                <Symbol name="chevron_right" size={14} />
              </div>
            </button>
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
