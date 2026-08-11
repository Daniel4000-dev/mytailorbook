import { Order, OrderStatus } from '@/lib/types';

interface FilterOptions {
  search: string;
  showNoPhoto: boolean;
}

export function filterFabricOrders(orders: Order[], options: FilterOptions): Order[] {
  const { search, showNoPhoto } = options;
  const lowerSearch = search.trim().toLowerCase();

  return orders.filter((o) => {
    // The Fabric Board is exclusively for identifying raw/uncut fabrics.
    // Once an order moves out of the 'Documented' stage, it should disappear from here.
    if (o.status !== 'Documented') return false;

    // Exclude orders with no photo unless toggled on
    if (!showNoPhoto && (!o.images || o.images.length === 0)) return false;

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
