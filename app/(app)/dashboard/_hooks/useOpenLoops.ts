import { useMemo } from 'react';
import { isOverdue, getBalanceOwed } from '@/lib/types';
import type { Order, Customer, ShopException } from '@/lib/types';
import { STYLE_MEASUREMENTS } from '@/lib/constants';

export interface OpenLoop {
  id: string;
  category: 'production' | 'measurements' | 'balances';
  title: string;
  actionText: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

export function useOpenLoops(orders: Order[], customers: Customer[], exceptions: ShopException[] = []) {
  return useMemo(() => {
    const loops: OpenLoop[] = [];
    
    // Filter out orders with active exceptions
    const now = new Date();
    const activeExceptionOrderIds = new Set(
      exceptions
        .filter(ex => !ex.endDate || new Date(ex.endDate) > now)
        .map(ex => ex.orderId)
        .filter(Boolean)
    );

    // 1. Production Loops
    const activeOrders = orders.filter((o) => o.status !== 'Delivered' && !activeExceptionOrderIds.has(o.id));
    // eslint-disable-next-line react-hooks/purity
    const staleLimit = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const todayStr = now.toISOString().split('T')[0];

    const needsUpdateOrders = activeOrders.filter((o) => {
      // Overdue or Due Today
      if (isOverdue(o)) return true;
      if (o.dueDate && new Date(o.dueDate).toISOString().split('T')[0] === todayStr) return true;
      
      // Stale (No status change in 3 days)
      const lastStatus = o.statusHistory && o.statusHistory.length > 0 ? o.statusHistory[o.statusHistory.length - 1] : null;
      // Note: order might not have updatedAt mapped in types if it's missing, but let's assume it exists or fallback
      // Since `updatedAt` is not in `Order` type based on `types.ts` inspection, we use the status history.
      // eslint-disable-next-line react-hooks/purity
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
        href: `/customers/${firstCustomerOrder.customerId}`,
        urgency: 'high',
      });
    }

    // 3. Balances Loops
    const deliveredOrdersWithBalance = orders.filter((o) => o.status === 'Delivered' && getBalanceOwed(o) > 0 && !activeExceptionOrderIds.has(o.id));
    if (deliveredOrdersWithBalance.length > 0) {
      const totalOverdue = deliveredOrdersWithBalance.reduce((sum, o) => sum + getBalanceOwed(o), 0);
      loops.push({
        id: 'loop-balances',
        category: 'balances',
        title: `₦${totalOverdue.toLocaleString()} in overdue balances still need follow-up`,
        actionText: 'View Orders',
        href: '/production',
        urgency: 'high',
      });
    }

    // Limit to top 3 priority loops
    return loops.slice(0, 3);
  }, [orders, customers, exceptions]);
}
