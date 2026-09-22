'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import FAB from '@/components/ui/FAB/FAB';
import AddEventSheet from './_components/AddEventSheet';
import { getCalendarEvents, updateEventStatus } from '@/app/actions/calendar';
import type { CalendarEvent, Order } from '@/lib/types';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import styles from './page.module.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { user } = useAuth();
  const { orders, customers, isLoaded } = useData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: any[] } | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Derive month bounds
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchEvents = async () => {
    if (!user?.shopId) return;
    setIsLoadingEvents(true);
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const fetchedEvents = await getCalendarEvents(user.shopId, monthStr);
    setEvents(fetchedEvents);
    setIsLoadingEvents(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [user?.shopId, currentYear, currentMonth]);

  // Combine fetched events with dynamic Order Deadlines
  const allEvents = useMemo(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combined: any[] = [...events];
    
    // Auto-plot order deadlines
    orders.forEach((order) => {
      if (order.dueDate) {
        // Only include if it's in the current rendering month roughly
        const orderDate = new Date(order.dueDate);
        if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
          combined.push({
            id: `order-deadline-${order.id}`,
            title: `${order.customerName} Delivery`,
            date: order.dueDate.split('T')[0],
            type: 'order_deadline',
            relatedOrderId: order.id,
          });
        }
      }
    });
    
    return combined;
  }, [events, orders, currentYear, currentMonth]);

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const gridCells = [];
  
  // Empty slots before 1st day
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(<div key={`empty-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
  }
  
  // Real days
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  const todayStr = new Date().toISOString().split('T')[0];
  
  const agendaDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayEvents = allEvents.filter(e => e.date === dateStr).sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      let title = 'Today';
      if (i === 1) title = 'Tomorrow';
      else if (i === 2) title = 'Day after';
      
      days.push({
        dateStr,
        title,
        events: dayEvents,
        fullDate: d
      });
    }
    return days;
  }, [allEvents, todayDate]);
  

  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    
    // Find events for this day
    const dayEvents = allEvents.filter(e => e.date === dateStr);
    
    gridCells.push(
      <div 
        key={`day-${day}`} 
        className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
        onClick={() => setSelectedDayEvents({ date: dateStr, events: dayEvents })}
      >
        <span className={styles.dayNumber}>{day}</span>
        
        {dayEvents.map(evt => (
          <div 
            key={evt.id} 
            className={`${styles.eventBadge} ${evt.type === 'order_deadline' ? styles.eventDeadline : evt.type === 'fitting' ? styles.eventFitting : styles.eventTask}`}
          >
            {evt.type === 'order_deadline' && <Symbol name="warning" size={12} fill />}
            {evt.type === 'fitting' && <Symbol name="straighten" size={12} />}
            <span>{evt.title}</span>
          </div>
        ))}
      </div>
    );
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const topBar = (
    <TopBar title="Calendar" />
  );

  return (
    <PageLayout header={topBar}>
      <div className={styles.container}>
        <div className={styles.calendarHeader}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={handlePrevMonth}>
              <Symbol name="chevron_left" size={24} />
            </button>
            <span className={styles.monthTitle}>{monthName} {currentYear}</span>
            <button className={styles.navBtn} onClick={handleNextMonth}>
              <Symbol name="chevron_right" size={24} />
            </button>
          </div>
        </div>
        
        <div className={styles.calendarGrid}>
          <div className={styles.weekDays}>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className={styles.weekDay}>{day}</div>
            ))}
          </div>
          <div className={styles.days}>
            {gridCells}
          </div>
        </div>
        
        <div className={styles.agendaSection}>
          {agendaDays.map(dayGroup => (
            <div key={dayGroup.dateStr} className={styles.agendaDayGroup}>
              <h3 className={styles.agendaDayTitle}>
                {dayGroup.title} 
                <span className={styles.agendaDaySubtitle}>
                  {dayGroup.fullDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </h3>
              
              {dayGroup.events.length === 0 ? (
                <div className={styles.emptyAgendaInline}>No events scheduled</div>
              ) : (
                <div className={styles.agendaList}>
                  {dayGroup.events.map((evt, i) => {
                    const isCompleted = evt.status === 'completed';
                    return (
                      <div key={evt.id} className={`${styles.agendaItem} ${isCompleted ? styles.completedEvent : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className={`${styles.agendaColorBar} ${evt.type === 'order_deadline' ? styles.eventDeadline : evt.type === 'fitting' ? styles.eventFitting : styles.eventTask}`} />
                        <div className={styles.agendaContent}>
                          <div className={styles.agendaHeader}>
                            <span className={styles.agendaTitle}>{evt.title}</span>
                            <div className={styles.agendaActions}>
                              <span className={styles.agendaTime}>
                                {evt.startTime ? `${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''}` : 'All day'}
                              </span>
                              {evt.type !== 'order_deadline' && (
                                <button 
                                  className={`${styles.checkBtn} ${isCompleted ? styles.checked : ''}`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const newStatus = isCompleted ? 'pending' : 'completed';
                                    setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, status: newStatus } : p));
                                    try {
                                      await updateEventStatus(evt.id, newStatus);
                                    } catch (err) {
                                      setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, status: isCompleted ? 'completed' : 'pending' } : p));
                                    }
                                  }}
                                >
                                  <Symbol name="check" size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Daily Agenda Sheet */}
      <BottomSheet
        isOpen={!!selectedDayEvents}
        onClose={() => setSelectedDayEvents(null)}
        title={selectedDayEvents ? new Date(selectedDayEvents.date).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
      >
        <div className={styles.agendaContainer}>
          {selectedDayEvents?.events.length === 0 ? (
            <EmptyState
              icon={<Symbol name="event_busy" size={48} />}
              title="No events scheduled"
              description="Enjoy the free time."
            />
          ) : (
            <div className={styles.agendaList}>
              {selectedDayEvents?.events.map((evt, i) => {
                const isCompleted = evt.status === 'completed';
                
                return (
                  <div key={evt.id} className={`${styles.agendaItem} ${isCompleted ? styles.completedEvent : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className={`${styles.agendaColorBar} ${evt.type === 'order_deadline' ? styles.eventDeadline : evt.type === 'fitting' ? styles.eventFitting : styles.eventTask}`} />
                    <div className={styles.agendaContent}>
                      <div className={styles.agendaHeader}>
                        <span className={styles.agendaTitle}>{evt.title}</span>
                        <div className={styles.agendaActions}>
                          <span className={styles.agendaTime}>
                            {evt.startTime ? `${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''}` : 'All day'}
                          </span>
                          {/* Don't allow checking off auto order deadlines directly from calendar (they complete when order ships) */}
                          {evt.type !== 'order_deadline' && (
                            <button 
                              className={`${styles.checkBtn} ${isCompleted ? styles.checked : ''}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newStatus = isCompleted ? 'pending' : 'completed';
                                
                                // Optimistic UI update
                                setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, status: newStatus } : p));
                                setSelectedDayEvents(prev => prev ? {
                                  ...prev,
                                  events: prev.events.map(p => p.id === evt.id ? { ...p, status: newStatus } : p)
                                } : null);
                                
                                await updateEventStatus(evt.id, newStatus);
                              }}
                            >
                              <Symbol name="check" size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {evt.description && <p className={styles.agendaDesc}>{evt.description}</p>}
                      {evt.type === 'order_deadline' && (
                        <span className={styles.agendaPill}>Order Deadline</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>
      
      <AddEventSheet 
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        defaultDate={selectedDayEvents?.date}
        onEventCreated={() => {
          fetchEvents();
          setSelectedDayEvents(null);
        }}
      />

      <FAB 
        icon={<Symbol name="add" />} 
        onClick={() => setIsAddEventOpen(true)}
        label="Add Event"
      />
    </PageLayout>
  );
}
