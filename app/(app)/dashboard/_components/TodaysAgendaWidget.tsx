'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCalendarEvents, updateEventStatus } from '@/app/actions/calendar';
import type { CalendarEvent } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './TodaysAgendaWidget.module.css';

export default function TodaysAgendaWidget() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.shopId) return;
    const fetchToday = async () => {
      try {
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const allMonth = await getCalendarEvents(user.shopId, monthStr);
        
        const todayStr = today.toISOString().split('T')[0];
        setEvents(allMonth.filter(e => e.date === todayStr));
      } catch (err) {
        console.error('Failed to fetch today calendar agenda:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchToday();
  }, [user?.shopId]);

  if (isLoading) return null;

  const pendingCount = events.filter(e => e.status !== 'completed').length;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Symbol name="calendar_today" size={16} />
          </span>
          <h2 className={styles.title}>Today&apos;s Schedule &amp; Fittings</h2>
          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>
              {pendingCount} Pending
            </span>
          )}
        </div>
        <Link href="/calendar" className={styles.calendarLink}>
          <span>Calendar</span>
          <Symbol name="chevron_right" size={14} />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyLeft}>
            <Symbol name="calendar_today" size={16} className={styles.emptyIcon} />
            <span className={styles.emptyText}>No fittings or appointments scheduled today</span>
          </div>
          <Link href="/calendar" className={styles.scheduleBtn}>
            <Symbol name="add" size={12} />
            <span>Schedule</span>
          </Link>
        </div>
      ) : (
        <div className={styles.eventList}>
          {events.map(evt => {
            const isCompleted = evt.status === 'completed';
            return (
              <div
                key={evt.id}
                className={`${styles.eventItem} ${isCompleted ? styles.eventItemCompleted : ''}`}
              >
                <div className={styles.eventLeft}>
                  <button
                    type="button"
                    onClick={async () => {
                      const newStatus = isCompleted ? 'pending' : 'completed';
                      setEvents(prev =>
                        prev.map(p => (p.id === evt.id ? { ...p, status: newStatus } : p))
                      );
                      await updateEventStatus(evt.id, newStatus);
                    }}
                    className={`${styles.checkBtn} ${isCompleted ? styles.checkBtnCompleted : ''}`}
                    title={isCompleted ? 'Mark as pending' : 'Mark as done'}
                    aria-label={isCompleted ? 'Mark as pending' : 'Mark as done'}
                  >
                    <Symbol name="check" size={12} />
                  </button>
                  <span
                    className={`${styles.eventTitle} ${
                      isCompleted ? styles.eventTitleCompleted : ''
                    }`}
                  >
                    {evt.title}
                  </span>
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
