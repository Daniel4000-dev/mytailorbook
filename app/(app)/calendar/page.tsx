'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import FAB from '@/components/ui/FAB/FAB';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import AddEventSheet from './_components/AddEventSheet';
import { getCalendarEvents, updateEventStatus } from '@/app/actions/calendar';
import { getWhatsAppLink, formatPhone } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import type { CalendarEvent, Order } from '@/lib/types';
import styles from './page.module.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarViewMode = 'grid' | 'agenda';

export default function CalendarPage() {
  const { user } = useAuth();
  const { orders, customers, currentShop, isLoaded, isDemoMode } = useData();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Month navigation calculations
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchEvents = async () => {
    if (!user?.shopId && !currentShop?.id) return;
    const shopId = user?.shopId || currentShop?.id || '';
    if (!shopId || isDemoMode) return;

    setIsLoadingEvents(true);
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const fetchedEvents = await getCalendarEvents(shopId, monthStr);
    setEvents(fetchedEvents);
    setIsLoadingEvents(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user?.shopId, currentShop?.id, currentYear, currentMonth, isDemoMode]);

  // Merge server events with live Order Delivery Deadlines
  const allEvents = useMemo(() => {
    const combined: CalendarEvent[] = [...events];

    // Auto-plot order deadlines
    orders.forEach((order) => {
      if (order.dueDate) {
        const orderDate = new Date(order.dueDate);
        if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
          const dateStr = order.dueDate.split('T')[0];
          combined.push({
            id: `order-deadline-${order.id}`,
            shopId: order.shopId,
            title: `${order.customerName} Delivery`,
            date: dateStr,
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

    return combined;
  }, [events, orders, currentYear, currentMonth]);

  // Today helpers
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar grid calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)

  // Empty slots before 1st day of month
  const gridCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(<div key={`empty-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
  }

  // Active day events for the selected date
  const selectedDayEvents = useMemo(() => {
    return allEvents
      .filter((e) => e.date === selectedDateStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [allEvents, selectedDateStr]);

  // Upcoming 3-Day Agenda
  const upcomingAgendaDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayEvents = allEvents
        .filter((e) => e.date === dateStr)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      let title = 'Today';
      if (i === 1) title = 'Tomorrow';
      else if (i === 2) title = 'Day After Tomorrow';

      days.push({
        dateStr,
        title,
        events: dayEvents,
        fullDate: d,
      });
    }
    return days;
  }, [allEvents, todayDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  const handleToggleEventStatus = async (evt: CalendarEvent) => {
    const isCompleted = evt.status === 'completed';
    const newStatus = isCompleted ? 'pending' : 'completed';

    // Optimistic UI update
    setEvents((prev) =>
      prev.map((p) => (p.id === evt.id ? { ...p, status: newStatus } : p))
    );

    if (!isDemoMode && !evt.id.startsWith('demo-') && !evt.id.startsWith('order-deadline-')) {
      try {
        await updateEventStatus(evt.id, newStatus);
      } catch (err) {
        setEvents((prev) =>
          prev.map((p) => (p.id === evt.id ? { ...p, status: evt.status } : p))
        );
      }
    }
  };

  const handleWhatsAppFittingReminder = (evt: CalendarEvent) => {
    const customer = customers.find((c) => c.id === evt.relatedCustomerId);
    if (!customer?.whatsappNumber) {
      showToast('Client has no WhatsApp number on file', 'error');
      return;
    }

    const timeStr = evt.startTime ? ` at ${evt.startTime}` : '';
    const shopName = currentShop?.name || 'our atelier';
    const address = currentShop?.address || 'our studio';
    const message = `Hello ${customer.fullName},\n\nWarm greetings from ${shopName}.\n\nThis is a friendly reminder regarding your bespoke fitting appointment scheduled for ${evt.date}${timeStr}.\n\nAtelier Address: ${address}.\n\nPlease let us know if you need to adjust this timing. See you soon!`;

    window.open(getWhatsAppLink(customer.whatsappNumber, message), '_blank');
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Grid days populator
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDateStr;
    const dayEvents = allEvents.filter((e) => e.date === dateStr);

    const hasDeadlines = dayEvents.some((e) => e.id.startsWith('order-deadline-'));
    const hasFittings = dayEvents.some((e) => e.type === 'fitting');
    const hasOtherTasks = dayEvents.some((e) => e.type !== 'fitting' && !e.id.startsWith('order-deadline-'));

    gridCells.push(
      <div
        key={`day-${day}`}
        className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isSelected ? styles.selectedDay : ''}`}
        onClick={() => setSelectedDateStr(dateStr)}
      >
        <span className={styles.dayNumber}>{day}</span>

        {/* Mobile Craft Event Dots */}
        <div className={styles.mobileDotsRow}>
          {hasDeadlines && <span className={`${styles.eventDot} ${styles.eventDotDeadline}`} title="Delivery Deadline" />}
          {hasFittings && <span className={`${styles.eventDot} ${styles.eventDotFitting}`} title="Bespoke Fitting" />}
          {hasOtherTasks && <span className={`${styles.eventDot} ${styles.eventDotTask}`} title="Shop Task" />}
        </div>

        {/* Desktop Event Pills */}
        <div className={styles.desktopEventsCol}>
          {dayEvents.slice(0, 3).map((evt) => (
            <div
              key={evt.id}
              className={`${styles.desktopEventBadge} ${
                evt.id.startsWith('order-deadline-')
                  ? styles.eventDeadline
                  : evt.type === 'fitting'
                  ? styles.eventFitting
                  : styles.eventTask
              }`}
            >
              <span>{evt.title}</span>
            </div>
          ))}
          {dayEvents.length > 3 && (
            <span className={styles.desktopMoreCount}>+{dayEvents.length - 3} more</span>
          )}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <>
        <TopBar title="Calendar" />
        <div className={styles.container}>
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonGrid} />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Calendar" />
      <div className={styles.container}>
        {/* Navigation & View Toggle Header */}
        <header className={styles.topControlCard}>
          <div className={styles.monthNavRow}>
            <div className={styles.navButtonsGroup}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={handlePrevMonth}
                aria-label="Previous Month"
              >
                <Symbol name="chevron_left" size={20} />
              </button>
              <h2 className={styles.monthTitle}>
                {monthName} <span className={styles.yearTitle}>{currentYear}</span>
              </h2>
              <button
                type="button"
                className={styles.navBtn}
                onClick={handleNextMonth}
                aria-label="Next Month"
              >
                <Symbol name="chevron_right" size={20} />
              </button>
            </div>

            <div className={styles.rightNavActions}>
              <button
                type="button"
                className={styles.todayPillBtn}
                onClick={handleJumpToToday}
              >
                Today
              </button>
              <div className={styles.viewSegmentedControl}>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Month View"
                >
                  <Symbol name="calendar_month" size={16} />
                  <span>Month</span>
                </button>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${viewMode === 'agenda' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('agenda')}
                  aria-label="Agenda View"
                >
                  <Symbol name="calendar_today" size={16} />
                  <span>Agenda</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {viewMode === 'grid' ? (
          <>
            {/* Calendar Grid */}
            <div className={styles.calendarCard}>
              <div className={styles.weekDaysHeader}>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className={styles.weekDayCell}>
                    {day}
                  </div>
                ))}
              </div>
              <div className={styles.daysGrid}>{gridCells}</div>
            </div>

            {/* Selected Date Focus Agenda */}
            <section className={styles.selectedDaySection}>
              <div className={styles.selectedDayHeader}>
                <div className={styles.selectedDayTitleWrap}>
                  <h3 className={styles.selectedDayTitle}>
                    {new Date(selectedDateStr).toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h3>
                  {selectedDateStr === todayStr && (
                    <span className={styles.todayTagBadge}>Today</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddEventOpen(true)}
                  icon={<Symbol name="add" size={14} />}
                >
                  Book on this Day
                </Button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className={styles.emptyDayBox}>
                  <p className={styles.emptyDayText}>No fittings or deadlines scheduled for this date.</p>
                </div>
              ) : (
                <div className={styles.eventsList}>
                  {selectedDayEvents.map((evt) => {
                    const isDeadline = evt.id.startsWith('order-deadline-');
                    const isCompleted = evt.status === 'completed';
                    const customer = customers.find((c) => c.id === evt.relatedCustomerId);

                    return (
                      <article
                        key={evt.id}
                        className={`${styles.agendaCard} ${isCompleted ? styles.agendaCardCompleted : ''}`}
                      >
                        <div
                          className={`${styles.agendaLeftBorder} ${
                            isDeadline
                              ? styles.borderDeadline
                              : evt.type === 'fitting'
                              ? styles.borderFitting
                              : styles.borderTask
                          }`}
                        />
                        <div className={styles.agendaBody}>
                          <div className={styles.agendaTopRow}>
                            <div className={styles.agendaTitleBlock}>
                              {customer && (
                                <Avatar name={customer.fullName} size="sm" shape="squircle" />
                              )}
                              <div>
                                <h4 className={styles.agendaEventTitle}>{evt.title}</h4>
                                {evt.description && (
                                  <p className={styles.agendaEventDesc}>{evt.description}</p>
                                )}
                              </div>
                            </div>

                            <div className={styles.timeAndStatus}>
                              <span className={styles.timeTag}>
                                {evt.startTime
                                  ? `${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''}`
                                  : 'All day'}
                              </span>
                              {!isDeadline && (
                                <button
                                  type="button"
                                  className={`${styles.statusCheckBtn} ${isCompleted ? styles.statusCheckBtnDone : ''}`}
                                  onClick={() => handleToggleEventStatus(evt)}
                                  title={isCompleted ? 'Mark pending' : 'Mark completed'}
                                  aria-label="Toggle completion"
                                >
                                  <Symbol name="check" size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Action Strip */}
                          <div className={styles.agendaActionStrip}>
                            {isDeadline && evt.relatedOrderId ? (
                              <Link
                                href={ROUTES.productionOrder(evt.relatedOrderId)}
                                className={styles.viewOrderBtn}
                              >
                                <Symbol name="content_cut" size={14} />
                                <span>Open Workshop Slip</span>
                              </Link>
                            ) : null}

                            {evt.type === 'fitting' && customer?.whatsappNumber ? (
                              <button
                                type="button"
                                className={styles.whatsAppReminderBtn}
                                onClick={() => handleWhatsAppFittingReminder(evt)}
                                title="Send WhatsApp appointment reminder to client"
                              >
                                <WhatsappIcon size={14} />
                                <span>Remind on WhatsApp</span>
                              </button>
                            ) : null}

                            {customer?.whatsappNumber && (
                              <a
                                href={`tel:${customer.whatsappNumber}`}
                                className={styles.callClientChip}
                                title="Call client"
                              >
                                <Symbol name="call" size={12} />
                                <span>{formatPhone(customer.whatsappNumber)}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          /* Continuous Agenda Feed Mode */
          <div className={styles.agendaFeedSection}>
            {upcomingAgendaDays.map((dayGroup) => (
              <section key={dayGroup.dateStr} className={styles.agendaFeedGroup}>
                <div className={styles.agendaFeedHeader}>
                  <h3 className={styles.agendaFeedDayName}>{dayGroup.title}</h3>
                  <span className={styles.agendaFeedDateSub}>
                    {dayGroup.fullDate.toLocaleDateString('default', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {dayGroup.events.length === 0 ? (
                  <div className={styles.emptyDayBox}>
                    <p className={styles.emptyDayText}>No events or delivery deadlines</p>
                  </div>
                ) : (
                  <div className={styles.eventsList}>
                    {dayGroup.events.map((evt) => {
                      const isDeadline = evt.id.startsWith('order-deadline-');
                      const isCompleted = evt.status === 'completed';
                      const customer = customers.find((c) => c.id === evt.relatedCustomerId);

                      return (
                        <article
                          key={evt.id}
                          className={`${styles.agendaCard} ${isCompleted ? styles.agendaCardCompleted : ''}`}
                        >
                          <div
                            className={`${styles.agendaLeftBorder} ${
                              isDeadline
                                ? styles.borderDeadline
                                : evt.type === 'fitting'
                                ? styles.borderFitting
                                : styles.borderTask
                            }`}
                          />
                          <div className={styles.agendaBody}>
                            <div className={styles.agendaTopRow}>
                              <div className={styles.agendaTitleBlock}>
                                {customer && (
                                  <Avatar name={customer.fullName} size="sm" shape="squircle" />
                                )}
                                <div>
                                  <h4 className={styles.agendaEventTitle}>{evt.title}</h4>
                                  {evt.description && (
                                    <p className={styles.agendaEventDesc}>{evt.description}</p>
                                  )}
                                </div>
                              </div>
                              <span className={styles.timeTag}>
                                {evt.startTime
                                  ? `${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''}`
                                  : 'All day'}
                              </span>
                            </div>

                            <div className={styles.agendaActionStrip}>
                              {isDeadline && evt.relatedOrderId ? (
                                <Link
                                  href={ROUTES.productionOrder(evt.relatedOrderId)}
                                  className={styles.viewOrderBtn}
                                >
                                  <Symbol name="content_cut" size={14} />
                                  <span>Open Workshop Slip</span>
                                </Link>
                              ) : null}

                              {evt.type === 'fitting' && customer?.whatsappNumber ? (
                                <button
                                  type="button"
                                  className={styles.whatsAppReminderBtn}
                                  onClick={() => handleWhatsAppFittingReminder(evt)}
                                >
                                  <WhatsappIcon size={14} />
                                  <span>WhatsApp</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Add Event Sheet */}
        <AddEventSheet
          isOpen={isAddEventOpen}
          onClose={() => setIsAddEventOpen(false)}
          defaultDate={selectedDateStr}
          onEventCreated={(newEvent) => {
            if (newEvent) {
              setEvents((prev) => [...prev, newEvent]);
            } else {
              fetchEvents();
            }
          }}
        />

        {/* Floating Action Button */}
        <FAB
          icon={<Symbol name="add" size={24} />}
          onClick={() => setIsAddEventOpen(true)}
          label="Book Fitting or Event"
        />
      </div>
    </>
  );
}
