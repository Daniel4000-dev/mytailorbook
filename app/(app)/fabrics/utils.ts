import { Order, OrderStatus } from '@/lib/types';

interface FilterOptions {
  activeFilter: OrderStatus | 'All';
  search: string;
  showNoPhoto: boolean;
}

export function filterFabricOrders(orders: Order[], options: FilterOptions): Order[] {
  const { activeFilter, search, showNoPhoto } = options;
  const lowerSearch = search.trim().toLowerCase();

  return orders.filter((o) => {
    // Exclude completed orders by default
    if (o.status === 'Completed') return false;

    // Exclude orders with no photo unless toggled on
    if (!showNoPhoto && (!o.images || o.images.length === 0)) return false;

    // Status filter
    if (activeFilter !== 'All' && o.status !== activeFilter) return false;

    // Search by customer, style, or details
    if (lowerSearch) {
      return (
        o.customerName.toLowerCase().includes(lowerSearch) ||
        (o.orderDetails?.toLowerCase().includes(lowerSearch) ?? false) ||
        (o.styleName?.toLowerCase().includes(lowerSearch) ?? false)
      );
    }

    return true;
  });
}
