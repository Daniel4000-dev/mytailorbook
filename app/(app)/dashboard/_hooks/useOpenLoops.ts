import { useMemo } from 'react';
import { isOverdue, getBalanceOwed } from '@/lib/types';
import type { Order, Customer, ShopException } from '@/lib/types';
import { STYLE_MEASUREMENTS } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';
import { formatNumber, getWhatsAppLink } from '@/lib/formatters';

export interface OpenLoop {
  id: string;
  category: 'production' | 'measurements' | 'balances';
  title: string;
  actionText: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
  subtitle?: string;
  amountAtStake?: number;
  whatsappUrl?: string;
}

export function computeOpenLoops(
  orders: Order[],
  customers: Customer[],
  exceptions: ShopException[] = [],
  businessMode = 'bespoke',
  stockAlerts?: { lowStockCount?: number; outOfStockCount?: number },
  currencySymbol = '₦',
  shopName?: string
): OpenLoop[] {
  const loops: OpenLoop[] = [];

  // Filter out orders with active exceptions
  const now = new Date();
  const activeExceptionOrderIds = new Set(
    exceptions
      .filter(ex => !ex.endDate || new Date(ex.endDate) > now)
      .map(ex => ex.orderId)
      .filter(Boolean)
  );

  // RTW Store Priorities: Stockouts, Low Stock replenishment, and counter balances
  if (businessMode === 'rtw') {
    if (stockAlerts?.outOfStockCount && stockAlerts.outOfStockCount > 0) {
      loops.push({
        id: 'loop-rtw-out-of-stock',
        category: 'production',
        title: `${stockAlerts.outOfStockCount} garment style${stockAlerts.outOfStockCount === 1 ? ' is' : 's are'} sold out on your rack`,
        subtitle: 'Restock needed immediately',
        actionText: 'Restock Rack',
        href: '/stock?action=add',
        urgency: 'high',
      });
    }
    if (stockAlerts?.lowStockCount && stockAlerts.lowStockCount > 0) {
      loops.push({
        id: 'loop-rtw-low-stock',
        category: 'production',
        title: `${stockAlerts.lowStockCount} garment size${stockAlerts.lowStockCount === 1 ? ' has' : 's have'} 2 or fewer pieces left`,
        subtitle: 'Approaching stockout',
        actionText: 'View Rack',
        href: '/stock',
        urgency: 'medium',
      });
    }
    const deliveredOrdersWithBalance = orders.filter((o) => getBalanceOwed(o) > 0 && !activeExceptionOrderIds.has(o.id));
    if (deliveredOrdersWithBalance.length > 0) {
      const totalBalance = deliveredOrdersWithBalance.reduce((sum, o) => sum + getBalanceOwed(o), 0);
      loops.push({
        id: 'loop-balances',
        category: 'balances',
        title: `${deliveredOrdersWithBalance.length} customer${deliveredOrdersWithBalance.length === 1 ? '' : 's'} with unpaid counter balances`,
        subtitle: `${currencySymbol}${formatNumber(totalBalance)} total collectible`,
        actionText: 'Open Collections',
        href: '/collections',
        urgency: 'high',
        amountAtStake: totalBalance,
      });
    }
    return loops.slice(0, 3);
  }

  // 1. Production Loops (Prescriptive & Cash at Stake)
  const activeOrders = orders.filter((o) => o.status !== 'Delivered' && !activeExceptionOrderIds.has(o.id));
  const staleLimit = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const todayStr = now.toISOString().split('T')[0];

  const needsUpdateOrders = activeOrders.filter((o) => {
    // Overdue or Due Today
    if (isOverdue(o)) return true;
    if (o.dueDate && new Date(o.dueDate).toISOString().split('T')[0] === todayStr) return true;

    // Stale (No status change in 3 days)
    const lastStatus = o.statusHistory && o.statusHistory.length > 0 ? o.statusHistory[o.statusHistory.length - 1] : null;
    const lastUpdate = lastStatus ? new Date(lastStatus.timestamp).getTime() : Date.now();
    return lastUpdate < staleLimit;
  });

  if (needsUpdateOrders.length > 0) {
    const cashAtStake = needsUpdateOrders.reduce((sum, o) => sum + getBalanceOwed(o), 0);
    const sortedUrgent = [...needsUpdateOrders].sort((a, b) => {
      const aOver = isOverdue(a) ? 1 : 0;
      const bOver = isOverdue(b) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      return new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
    });
    const topOrder = sortedUrgent[0];
    const clientName = topOrder.customerName || customers.find((c) => c.id === topOrder.customerId)?.fullName || 'Client';
    const isLate = isOverdue(topOrder);
    const isDueToday = topOrder.dueDate && new Date(topOrder.dueDate).toISOString().split('T')[0] === todayStr;

    let title = '';
    if (isLate) {
      title = `${clientName}'s ${topOrder.styleName || 'outfit'} is overdue`;
    } else if (isDueToday) {
      title = `${clientName}'s ${topOrder.styleName || 'outfit'} is due for delivery today`;
    } else {
      title = `${clientName}'s ${topOrder.styleName || 'outfit'} needs an update`;
    }

    const subtitle = cashAtStake > 0
      ? `${currencySymbol}${formatNumber(cashAtStake)} balance ready to unlock upon delivery`
      : `${needsUpdateOrders.length} order${needsUpdateOrders.length === 1 ? '' : 's'} in queue`;

    loops.push({
      id: 'loop-production',
      category: 'production',
      title,
      subtitle,
      actionText: 'View Order',
      href: topOrder ? `${ROUTES.productionOrder(topOrder)}?from=dashboard` : ROUTES.production,
      urgency: 'high',
      amountAtStake: cashAtStake,
    });
  }

  // 2. Measurements Loops (1-Tap WhatsApp Request)
  const customersMissingMeasurements = activeOrders.filter((o) => {
    if (!o.styleName) return false;
    const customer = customers.find(c => c.id === o.customerId);
    if (!customer) return false;

    const styleSpec = STYLE_MEASUREMENTS[o.styleName];
    if (!styleSpec) return false;

    const requiredKeys = styleSpec.points.map(p => p.key);
    const measurements = o.measurements || {};

    // Check if any required key is missing or empty
    return requiredKeys.some(key => !measurements[key as keyof typeof measurements]);
  });

  if (customersMissingMeasurements.length > 0) {
    const firstCustomerOrder = customersMissingMeasurements[0];
    const customer = customers.find(c => c.id === firstCustomerOrder.customerId);
    const missingCount = customersMissingMeasurements.length;

    let whatsappUrl: string | undefined;
    if (customer?.whatsappNumber) {
      const clientFirst = (customer.fullName || 'there').trim().split(' ')[0];
      const shopTitle = shopName ? `*${shopName}*` : 'our workshop';
      const msg = `Hello ${clientFirst}, this is from ${shopTitle}. We are preparing to cut your ${firstCustomerOrder.styleName || 'outfit'}, but we still need a few body measurements to guarantee a perfect fit. When would you be free for a quick check?`;
      whatsappUrl = getWhatsAppLink(customer.whatsappNumber, msg);
    }

    loops.push({
      id: 'loop-measurements',
      category: 'measurements',
      title: missingCount === 1
        ? `${customer?.fullName || 'Customer'} is missing measurements`
        : `${missingCount} active clients are missing body measurements`,
      subtitle: `Needed before cutting ${firstCustomerOrder.styleName || 'garment'}`,
      actionText: whatsappUrl ? 'Message' : 'Record',
      href: customer ? ROUTES.customerDetail(customer.id) : '/customers',
      urgency: 'high',
      whatsappUrl,
    });
  }

  // 3. Uncut Fabrics Loop (Prescriptive Next in Queue)
  const uncutOrders = orders.filter((o) => {
    if (o.status !== 'Documented') return false;
    if (activeExceptionOrderIds.has(o.id)) return false;
    if (o.orderDetails?.includes('[Awaiting Sourcing]') || o.orderDetails?.includes('[Fabric Pending]')) return false;
    return true;
  });
  if (uncutOrders.length > 0) {
    const topUncut = uncutOrders[0];
    const clientName = topUncut.customerName || customers.find(c => c.id === topUncut.customerId)?.fullName || 'Client';
    loops.push({
      id: 'loop-fabrics',
      category: 'production',
      title: uncutOrders.length === 1
        ? `Cut ${clientName}'s ${topUncut.styleName || 'fabric'} next on the cutting table`
        : `Cut ${clientName}'s ${topUncut.styleName || 'fabric'} next (${uncutOrders.length} waiting)`,
      subtitle: 'Next up on cutting table',
      actionText: 'Cut Now',
      href: `${ROUTES.productionOrder(topUncut)}?from=dashboard`,
      urgency: 'medium',
    });
  }

  // 4. Balances Loops (Debt Recovery with Direct 1-Tap WhatsApp Reminder)
  const deliveredOrdersWithBalance = orders.filter((o) => o.status === 'Delivered' && getBalanceOwed(o) > 0 && !activeExceptionOrderIds.has(o.id));
  if (deliveredOrdersWithBalance.length > 0) {
    const totalBalance = deliveredOrdersWithBalance.reduce((sum, o) => sum + getBalanceOwed(o), 0);
    const topOrder = deliveredOrdersWithBalance[0];
    const topCustomer = customers.find((c) => c.id === topOrder.customerId);
    const topBalance = getBalanceOwed(topOrder);

    let whatsappUrl: string | undefined;
    if (topCustomer?.whatsappNumber) {
      const clientFirst = (topCustomer.fullName || 'there').trim().split(' ')[0];
      const shopTitle = shopName ? `*${shopName}*` : 'our workshop';
      const msg = `Hello ${clientFirst}, trust you are having a wonderful day! This is a gentle reminder from ${shopTitle} regarding the remaining balance of *${currencySymbol}${formatNumber(topBalance)}* on your delivered order. Please let us know when it is convenient to balance up. Thank you!`;
      whatsappUrl = getWhatsAppLink(topCustomer.whatsappNumber, msg);
    }

    const title = deliveredOrdersWithBalance.length === 1 && topCustomer
      ? `${topCustomer.fullName} has ${currencySymbol}${formatNumber(topBalance)} balance to clear`
      : `${currencySymbol}${formatNumber(totalBalance)} ready for collection across ${deliveredOrdersWithBalance.length} delivered orders`;

    loops.push({
      id: 'loop-balances',
      category: 'balances',
      title,
      subtitle: 'Delivered orders awaiting final settlement',
      actionText: whatsappUrl ? 'Remind' : 'Collect',
      href: '/collections',
      urgency: 'high',
      amountAtStake: totalBalance,
      whatsappUrl,
    });
  }

  // Limit to top 3 priority loops
  return loops.slice(0, 3);
}

export function useOpenLoops(
  orders: Order[],
  customers: Customer[],
  exceptions: ShopException[] = [],
  businessMode = 'bespoke',
  stockAlerts?: { lowStockCount?: number; outOfStockCount?: number },
  currencySymbol = '₦',
  shopName?: string
) {
  return useMemo(
    () => computeOpenLoops(orders, customers, exceptions, businessMode, stockAlerts, currencySymbol, shopName),
    [orders, customers, exceptions, businessMode, stockAlerts?.lowStockCount, stockAlerts?.outOfStockCount, currencySymbol, shopName]
  );
}
