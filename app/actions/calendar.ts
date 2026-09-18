'use server';

import { createClient } from '@/lib/supabase/server';
import type { CalendarEvent, CalendarEventType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

function mapEventRow(row: any): CalendarEvent {
  return {
    id: row.id,
    shopId: row.shop_id,
    title: row.title,
    description: row.description || undefined,
    type: row.type as CalendarEventType,
    date: row.date,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    relatedOrderId: row.related_order_id || undefined,
    relatedCustomerId: row.related_customer_id || undefined,
    assignedTo: row.assigned_to || undefined,
    status: row.status || 'pending',
    createdAt: row.created_at,
  };
}

export async function getCalendarEvents(shopId: string, month: string): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  
  // month is in YYYY-MM format. We want all events for this month.
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('shop_id', shopId)
    .like('date', `${month}-%`)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  return (data || []).map(mapEventRow);
}

export async function createCalendarEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('calendar_events')
    .insert({
      shop_id: eventData.shopId,
      title: eventData.title,
      description: eventData.description || null,
      type: eventData.type,
      date: eventData.date,
      start_time: eventData.startTime || null,
      end_time: eventData.endTime || null,
      related_order_id: eventData.relatedOrderId || null,
      related_customer_id: eventData.relatedCustomerId || null,
      assigned_to: eventData.assignedTo || null,
    });

  if (error) {
    console.error('Error creating calendar event:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/calendar');
  return { success: true };
}

export async function deleteCalendarEvent(eventId: string, shopId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('shop_id', shopId);

  if (error) {
    console.error('Error deleting calendar event:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/calendar');
  return { success: true };
}

export async function checkWeeklyCapacity(shopId: string, dateStr: string): Promise<{
  weeklyCapacity: number;
  currentLoad: number;
  overCapacity: boolean;
}> {
  const supabase = await createClient();
  
  // 1. Get weekly capacity
  const { data: shopData } = await supabase
    .from('shops')
    .select('weekly_capacity')
    .eq('id', shopId)
    .single();
    
  const weeklyCapacity = shopData?.weekly_capacity || 15; // default 15

  // 2. Find start and end of the week for dateStr
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
  const startOfWeek = new Date(date.setDate(diff));
  startOfWeek.setHours(0,0,0,0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);
  
  // 3. Query all orders due within this week
  // We check the due_date of active orders (not delivered/cancelled)
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .gte('due_date', startOfWeek.toISOString())
    .lte('due_date', endOfWeek.toISOString())
    .neq('status', 'Delivered')
    .neq('status', 'Cancelled');

  const currentLoad = count || 0;

  return {
    weeklyCapacity,
    currentLoad,
    overCapacity: currentLoad >= weeklyCapacity,
  };
}

export async function updateEventStatus(eventId: string, status: 'pending' | 'completed'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('calendar_events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/calendar');
  revalidatePath('/'); // For the dashboard
  return { success: true };
}
