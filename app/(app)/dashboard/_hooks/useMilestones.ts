import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { getBalanceOwed } from '@/lib/types';

export interface Milestone {
  id: string;
  title: string;
  achieved: boolean;
  progress: number; // 0 to 1
  target: number;
  current: number;
  type: 'orders' | 'customers' | 'revenue';
}

export function useMilestones() {
  const { orders, customers } = useData();

  const milestones = useMemo(() => {
    // 1. Delivered Orders Milestone (Target: 10, then 50, then 100...)
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
    let orderTarget = 10;
    if (deliveredCount >= 10) orderTarget = 50;
    if (deliveredCount >= 50) orderTarget = 100;
    if (deliveredCount >= 100) orderTarget = 500;
    
    // 2. Customers with Full Measurements Milestone
    const customersWithMeasurements = customers.filter(c => c.measurements && Object.keys(c.measurements).length > 3).length;
    let customerTarget = 25;
    if (customersWithMeasurements >= 25) customerTarget = 100;
    if (customersWithMeasurements >= 100) customerTarget = 250;

    // 3. Closed Balances (Fully paid orders)
    const fullyPaidOrders = orders.filter(o => getBalanceOwed(o) <= 0).length;
    let paymentTarget = 10;
    if (fullyPaidOrders >= 10) paymentTarget = 50;
    if (fullyPaidOrders >= 50) paymentTarget = 100;

    const items: Milestone[] = [
      {
        id: 'orders_delivered',
        title: `${orderTarget} Completed Orders`,
        achieved: deliveredCount >= orderTarget,
        progress: Math.min(1, deliveredCount / orderTarget),
        target: orderTarget,
        current: deliveredCount,
        type: 'orders'
      },
      {
        id: 'customers_measured',
        title: `${customerTarget} Measured Clients`,
        achieved: customersWithMeasurements >= customerTarget,
        progress: Math.min(1, customersWithMeasurements / customerTarget),
        target: customerTarget,
        current: customersWithMeasurements,
        type: 'customers'
      },
      {
        id: 'payments_closed',
        title: `${paymentTarget} Fully Paid Orders`,
        achieved: fullyPaidOrders >= paymentTarget,
        progress: Math.min(1, fullyPaidOrders / paymentTarget),
        target: paymentTarget,
        current: fullyPaidOrders,
        type: 'revenue'
      }
    ];

    return items;
  }, [orders, customers]);

  return { milestones };
}
