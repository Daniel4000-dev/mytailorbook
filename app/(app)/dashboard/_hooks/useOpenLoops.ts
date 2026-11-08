import { useMemo } from 'react';
import { isOverdue, getBalanceOwed } from '@/lib/types';
import type { Order, Customer, ShopException } from '@/lib/types';
import { STYLE_MEASUREMENTS } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';

export interface OpenLoop {
  id: string;
  category: 'production' | 'measurements' | 'balances';
  title: string;
  actionText: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

export function computeOpenLoops(
  orders: Order[],
  customers: Customer[],
  exceptions: ShopException[] = [],
  businessMode = 'bespoke',
  stockAlerts?: { lowStockCount?: number; outOfStockCount?: number }
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
        actionText: 'View Rack',
        href: '/stock',
        urgency: 'medium',
      });
    }
    const deliveredOrdersWithBalance = orders.filter((o) => getBalanceOwed(o) > 0 && !activeExceptionOrderIds.has(o.id));
    if (deliveredOrdersWithBalance.length > 0) {
      loops.push({
        id: 'loop-balances',
        category: 'balances',
        title: `${deliveredOrdersWithBalance.length} customer${deliveredOrdersWithBalance.length === 1 ? '' : 's'} with unpaid counter balances`,
        actionText: 'Open Collections',
        href: '/collections',
        urgency: 'high',
      });
    }
    return loops.slice(0, 3);
  }

  // 1. Production Loops
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
    loops.push({
      id: 'loop-production',
      category: 'production',
      title: `${needsUpdateOrders.length} order${needsUpdateOrders.length === 1 ? '' : 's'} need${needsUpdateOrders.length === 1 ? 's' : ''} an update today`,
      actionText: 'Open Production',
      href: '/production',
      urgency: 'high',
    });
  }

  // 2. Measurements Loops
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
    
    loops.push({
      id: 'loop-measurements',
      category: 'measurements',
      title: missingCount === 1 
        ? `${customer?.fullName || 'A customer'} is missing measurements`
        : `${missingCount} active customers are missing measurements`,
      actionText: 'Update Profile',
      href: ROUTES.customerDetail(customer || firstCustomerOrder.customerId || ''),
      urgency: 'high',
    });
  }

  // 3. Uncut Fabrics Loop
  const uncutOrders = orders.filter((o) => {
    if (o.status !== 'Documented') return false;
    if (activeExceptionOrderIds.has(o.id)) return false;
    // If flagged as awaiting fabric sourcing or client fabric drop-off, pause from urgent alert
    if (o.orderDetails?.includes('[Awaiting Sourcing]') || o.orderDetails?.includes('[Fabric Pending]')) return false;
    return true;
  });
  if (uncutOrders.length > 0) {
    loops.push({
      id: 'loop-fabrics',
      category: 'production',
      title: `${uncutOrders.length} uncut fabric${uncutOrders.length === 1 ? '' : 's'} waiting on the cutting table`,
      actionText: 'Cut Fabrics',
      href: '/fabrics',
      urgency: 'medium',
    });
  }

  // 4. Balances Loops (Debt Recovery)
  const deliveredOrdersWithBalance = orders.filter((o) => o.status === 'Delivered' && getBalanceOwed(o) > 0 && !activeExceptionOrderIds.has(o.id));
  if (deliveredOrdersWithBalance.length > 0) {
    loops.push({
      id: 'loop-balances',
      category: 'balances',
      title: `${deliveredOrdersWithBalance.length} client${deliveredOrdersWithBalance.length === 1 ? '' : 's'} with unpaid balances ready for recovery`,
      actionText: 'Open Collections',
      href: '/collections',
      urgency: 'high',
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
  stockAlerts?: { lowStockCount?: number; outOfStockCount?: number }
) {
  return useMemo(
    () => computeOpenLoops(orders, customers, exceptions, businessMode, stockAlerts),
    [orders, customers, exceptions, businessMode, stockAlerts?.lowStockCount, stockAlerts?.outOfStockCount]
  );
}
