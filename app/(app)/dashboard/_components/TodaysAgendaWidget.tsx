'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCalendarEvents, updateEventStatus } from '@/app/actions/calendar';
import type { CalendarEvent } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import Link from 'next/link';

export default function TodaysAgendaWidget() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.shop_id) return;
    const fetchToday = async () => {
      const today = new Date();
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const allMonth = await getCalendarEvents(user.shop_id, monthStr);
      
      const todayStr = today.toISOString().split('T')[0];
      setEvents(allMonth.filter(e => e.date === todayStr));
      setIsLoading(false);
    };
    fetchToday();
  }, [user?.shop_id]);

  if (isLoading) return null;

  const pendingCount = events.filter(e => e.status !== 'completed').length;

  return (
    <div style={{
      background: 'var(--sf-bg-surface)',
      borderRadius: '28px',
      padding: 'var(--sf-space-lg)',
      marginBottom: 'var(--sf-space-md)',
      border: '1px solid rgba(0, 0, 0, 0.03)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sf-space-md)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--sf-text-primary)', margin: 0 }}>
          Today's Agenda
        </h2>
        {pendingCount > 0 && (
          <span style={{ background: 'var(--sf-accent-red)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
            {pendingCount} Pending
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p style={{ color: 'var(--sf-text-secondary)', fontSize: '0.875rem', margin: 0 }}>No events scheduled for today.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map(evt => {
            const isCompleted = evt.status === 'completed';
            return (
              <div key={evt.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--sf-bg-surface-hover)',
                borderRadius: 'var(--sf-radius-md)',
                opacity: isCompleted ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    onClick={async () => {
                      const newStatus = isCompleted ? 'pending' : 'completed';
                      setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, status: newStatus } : p));
                      await updateEventStatus(evt.id, newStatus);
                    }}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: `1px solid ${isCompleted ? 'var(--sf-text-primary)' : 'var(--sf-border-base)'}`,
                      background: isCompleted ? 'var(--sf-text-primary)' : 'transparent',
                      color: isCompleted ? 'var(--sf-bg-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Symbol name="check" size={16} />
                  </button>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 500, 
                    color: 'var(--sf-text-primary)',
                    textDecoration: isCompleted ? 'line-through' : 'none'
                  }}>
                    {evt.title}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>
                  {evt.startTime || 'All day'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Link href="/calendar" style={{
        display: 'block',
        textAlign: 'center',
        marginTop: 'var(--sf-space-md)',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--sf-accent-blue)',
        textDecoration: 'none'
      }}>
        Open Full Calendar
      </Link>
    </div>
  );
}
