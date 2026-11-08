'use server';

import { createClient } from '@/lib/supabase/server';
import { getExpensesByDate } from '@/app/actions/expenses';
import type { Expense, PaymentMethod } from '@/lib/types';
import { isOwnerLikeRole } from '@/lib/types';

export interface PaymentEntrySummary {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  channel: 'pos_counter' | 'bespoke';
  referenceNote?: string;
  customerName?: string;
  orderDetails?: string;
  createdAt: string;
}

export interface DailyRegisterSummary {
  date: string;
  inflows: {
    showroom: {
      cash: number;
      transfer: number;
      pos: number;
      total: number;
      orderCount: number;
    };
    bespoke: {
      cash: number;
      transfer: number;
      pos: number;
      total: number;
      orderCount: number;
    };
    total: number;
    drawerCashInflow: number;
    digitalInflow: number;
  };
  outflows: {
    drawerCashOutflow: number;
    transferOutflow: number;
    total: number;
    count: number;
  };
  drawer: {
    expectedCash: number;
    cashInflow: number;
    cashOutflow: number;
  };
  payments: PaymentEntrySummary[];
  expenses: Expense[];
}

export async function getDailyRegisterSummary(
  shopId: string,
  date: string
): Promise<DailyRegisterSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch shop expenses for the date
  const expenses = await getExpensesByDate(shopId, date);

  // Compute wide range for payments to safely catch all local-time entries
  const [yearStr, monthStr, dayStr] = date.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  const prevDate = new Date(Date.UTC(y, m, d - 1, 0, 0, 0));
  const nextDate = new Date(Date.UTC(y, m, d + 1, 23, 59, 59));

  // 1. Fetch payments
  const { data: rawPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('shop_id', shopId)
    .gte('created_at', prevDate.toISOString())
    .lte('created_at', nextDate.toISOString())
    .order('created_at', { ascending: false });

  const paymentList = (rawPayments || []).filter((p: any) => {
    const rawDate = p.date || p.created_at;
    if (!rawDate) return false;
    const datePart = typeof rawDate === 'string' && rawDate.includes('T') ? rawDate.split('T')[0] : String(rawDate).slice(0, 10);
    return datePart === date;
  });

  // Collect order IDs to fetch metadata and customer names
  const orderIds = Array.from(new Set(paymentList.map((p: any) => p.order_id).filter(Boolean)));
  let orderMap = new Map<string, any>();

  if (orderIds.length > 0) {
    const { data: relatedOrders } = await supabase
      .from('orders')
      .select('id, customer_name, metadata, order_details, total_bill, deposit_paid')
      .in('id', orderIds);

    if (relatedOrders) {
      for (const ord of relatedOrders) {
        orderMap.set(ord.id, ord);
      }
    }
  }

  // 2. Fetch orders created directly on that date (fallback for orders without payments table entries)
  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id, customer_name, metadata, order_details, total_bill, deposit_paid, created_at, payments')
    .eq('shop_id', shopId)
    .gte('created_at', prevDate.toISOString())
    .lte('created_at', nextDate.toISOString())
    .order('created_at', { ascending: false });

  const dayOrders = (rawOrders || []).filter((o: any) => {
    const datePart = typeof o.created_at === 'string' && o.created_at.includes('T') ? o.created_at.split('T')[0] : String(o.created_at).slice(0, 10);
    return datePart === date;
  });

  // Categorize payments
  const payments: PaymentEntrySummary[] = [];
  const processedOrderIds = new Set<string>();

  for (const p of paymentList) {
    const order = orderMap.get(p.order_id);
    const isPos =
      order?.metadata?.channel === 'pos_counter' ||
      order?.metadata?.sales_channel === 'pos_counter' ||
      order?.metadata?.order_type === 'rtw_counter_sale' ||
      (typeof p.reference_note === 'string' && p.reference_note.startsWith('POS Sale:'));

    processedOrderIds.add(p.order_id);

    payments.push({
      id: p.id,
      orderId: p.order_id,
      amount: Number(p.amount) || 0,
      method: (p.method as PaymentMethod) || 'cash',
      channel: isPos ? 'pos_counter' : 'bespoke',
      referenceNote: p.reference_note || undefined,
      customerName: order?.customer_name || 'Walk-in Customer',
      orderDetails: order?.order_details || undefined,
      createdAt: p.created_at || new Date().toISOString(),
    });
  }

  // Incorporate day orders that have deposit_paid > 0 but no entries in payments table
  for (const ord of dayOrders) {
    if (!processedOrderIds.has(ord.id) && ord.deposit_paid > 0) {
      const isPos =
        ord.metadata?.channel === 'pos_counter' ||
        ord.metadata?.sales_channel === 'pos_counter' ||
        ord.metadata?.order_type === 'rtw_counter_sale';

      const method: PaymentMethod = (ord.payments && ord.payments[0]?.method) || 'cash';

      payments.push({
        id: `ord-dep-${ord.id}`,
        orderId: ord.id,
        amount: Number(ord.deposit_paid) || 0,
        method,
        channel: isPos ? 'pos_counter' : 'bespoke',
        referenceNote: isPos ? 'POS Counter Checkout' : 'Initial Order Deposit',
        customerName: ord.customer_name || (isPos ? 'Walk-in Customer' : 'Client'),
        orderDetails: ord.order_details || undefined,
        createdAt: ord.created_at || new Date().toISOString(),
      });
    }
  }

  // Calculate Inflows
  let showroomCash = 0;
  let showroomTransfer = 0;
  let showroomPos = 0;
  let showroomCount = 0;

  let bespokeCash = 0;
  let bespokeTransfer = 0;
  let bespokePos = 0;
  let bespokeCount = 0;

  for (const p of payments) {
    if (p.channel === 'pos_counter') {
      showroomCount += 1;
      if (p.method === 'cash') showroomCash += p.amount;
      else if (p.method === 'transfer') showroomTransfer += p.amount;
      else showroomPos += p.amount;
    } else {
      bespokeCount += 1;
      if (p.method === 'cash') bespokeCash += p.amount;
      else if (p.method === 'transfer') bespokeTransfer += p.amount;
      else bespokePos += p.amount;
    }
  }

  const showroomTotal = showroomCash + showroomTransfer + showroomPos;
  const bespokeTotal = bespokeCash + bespokeTransfer + bespokePos;
  const drawerCashInflow = showroomCash + bespokeCash;
  const digitalInflow = showroomTransfer + showroomPos + bespokeTransfer + bespokePos;
  const totalInflow = showroomTotal + bespokeTotal;

  // Calculate Outflows
  let drawerCashOutflow = 0;
  let transferOutflow = 0;

  for (const exp of expenses) {
    const isCash = (exp.method || 'cash') === 'cash';
    if (isCash) {
      drawerCashOutflow += exp.amount;
    } else {
      transferOutflow += exp.amount;
    }
  }

  const totalOutflow = drawerCashOutflow + transferOutflow;
  const expectedCash = drawerCashInflow - drawerCashOutflow;

  return {
    date,
    inflows: {
      showroom: {
        cash: showroomCash,
        transfer: showroomTransfer,
        pos: showroomPos,
        total: showroomTotal,
        orderCount: showroomCount,
      },
      bespoke: {
        cash: bespokeCash,
        transfer: bespokeTransfer,
        pos: bespokePos,
        total: bespokeTotal,
        orderCount: bespokeCount,
      },
      total: totalInflow,
      drawerCashInflow,
      digitalInflow,
    },
    outflows: {
      drawerCashOutflow,
      transferOutflow,
      total: totalOutflow,
      count: expenses.length,
    },
    drawer: {
      expectedCash,
      cashInflow: drawerCashInflow,
      cashOutflow: drawerCashOutflow,
    },
    payments,
    expenses,
  };
}
