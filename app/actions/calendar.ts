'use server';

import { createClient } from '@/lib/supabase/server';
import type { CalendarEvent, CalendarEventType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  
  const [year, m] = month.split('-');
  const lastDay = new Date(Number(year), Number(m), 0).getDate();

  // month is in YYYY-MM format. We want all events for this month.
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('shop_id', shopId)
    .gte('date', `${month}-01`)
    .lte('date', `${month}-${lastDay}`)
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
  currentWeeklyLoad: number;
  dailyCapacity: number;
  currentDailyLoad: number;
  overCapacity: boolean;
  weeklyOverCapacity: boolean;
  dailyOverCapacity: boolean;
}> {
  const supabase = await createClient();
  
  // 1. Get weekly and daily capacity
  const { data: shopData } = await supabase
    .from('shops')
    .select('weekly_capacity, daily_capacity')
    .eq('id', shopId)
    .single();
    
  const weeklyCapacity = shopData?.weekly_capacity || 5; // default 5
  const dailyCapacity = shopData?.daily_capacity || 2; // default 2

  // 2. Find start and end of the week for dateStr
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
  const startOfWeek = new Date(date.setDate(diff));
  startOfWeek.setHours(0,0,0,0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);
  
  // 3. Find start and end of the day for dateStr
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23,59,59,999);
  
  // 4. Query all active orders due within this week
  const { data: weekOrders } = await supabase
    .from('orders')
    .select('id, due_date')
    .eq('shop_id', shopId)
    .gte('due_date', startOfWeek.toISOString())
    .lte('due_date', endOfWeek.toISOString())
    .neq('status', 'Delivered')
    .neq('status', 'Cancelled');

  const currentWeeklyLoad = weekOrders?.length || 0;
  
  // Filter week orders to find today's orders
  const currentDailyLoad = weekOrders?.filter(order => {
    if (!order.due_date) return false;
    const orderDate = new Date(order.due_date);
    return orderDate >= startOfDay && orderDate <= endOfDay;
  }).length || 0;

  const weeklyOverCapacity = currentWeeklyLoad >= weeklyCapacity;
  const dailyOverCapacity = currentDailyLoad >= dailyCapacity;

  return {
    weeklyCapacity,
    currentWeeklyLoad,
    dailyCapacity,
    currentDailyLoad,
    overCapacity: weeklyOverCapacity || dailyOverCapacity,
    weeklyOverCapacity,
    dailyOverCapacity
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

export async function recordFittingVerdict(
  eventId: string,
  outcome: 'approved' | 'alterations',
  alterationNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: eventData, error: fetchErr } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };

  let updatedDesc = eventData.description || '';
  if (outcome === 'alterations' && alterationNotes) {
    updatedDesc = updatedDesc
      ? `${updatedDesc}\n[Fitting Alteration]: ${alterationNotes}`
      : `[Fitting Alteration]: ${alterationNotes}`;
  } else if (outcome === 'approved') {
    updatedDesc = updatedDesc
      ? `${updatedDesc}\n[Fitting Approved]: Perfect Fit`
      : `[Fitting Approved]: Perfect Fit`;
  }

  const { error: updateErr } = await supabase
    .from('calendar_events')
    .update({
      status: 'completed',
      description: updatedDesc,
    })
    .eq('id', eventId);

  if (updateErr) return { success: false, error: updateErr.message };

  // If there is an associated order and it needs alteration, move back to Sewing
  if (outcome === 'alterations' && eventData.related_order_id) {
    const { data: orderData } = await supabase
      .from('orders')
      .select('status, status_history, order_details')
      .eq('id', eventData.related_order_id)
      .single();

    if (orderData) {
      const newHistory = [
        ...(orderData.status_history || []),
        {
          from: orderData.status,
          to: 'Sewing',
          timestamp: new Date().toISOString(),
          note: `Fitting Alteration: ${alterationNotes || ''}`,
        },
      ];
      await supabase
        .from('orders')
        .update({
          status: 'Sewing',
          status_history: newHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventData.related_order_id);
    }
  }

  revalidatePath('/calendar');
  revalidatePath('/production');
  revalidatePath('/');
  return { success: true };
}
