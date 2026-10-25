import { Order } from '@/lib/types';

export type FabricStageFilter = 'uncut' | 'production' | 'all';

export interface FilterOptions {
  search: string;
  stageFilter?: FabricStageFilter;
  showNoPhoto: boolean;
}

export function filterFabricOrders(orders: Order[], options: FilterOptions): Order[] {
  const { search, stageFilter = 'uncut', showNoPhoto } = options;
  const lowerSearch = search.trim().toLowerCase();

  return orders.filter((o) => {
    // Stage Filter:
    // 'uncut': Only 'Documented' (raw bolts awaiting cutting)
    // 'production': 'Cutting' or 'Sewing' (active on the workshop floor)
    // 'all': Active atelier garments ('Documented', 'Cutting', 'Sewing', 'Ready')
    if (stageFilter === 'uncut') {
      if (o.status !== 'Documented') return false;
    } else if (stageFilter === 'production') {
      if (o.status !== 'Cutting' && o.status !== 'Sewing') return false;
    } else if (stageFilter === 'all') {
      // Show all active garments in progress, omit delivered
      if (o.status === 'Delivered') return false;
    }

    // Exclude orders with no photo unless toggled on
    if (!showNoPhoto && (!o.images || o.images.length === 0)) return false;

    // Search by customer, style, details, or order reference ID
    if (lowerSearch) {
      const matchCustomer = (o.customerName || '').toLowerCase().includes(lowerSearch);
      const matchDetails = (o.orderDetails?.toLowerCase().includes(lowerSearch) ?? false);
      const matchStyle = (o.styleName?.toLowerCase().includes(lowerSearch) ?? false);
      const cleanRefSearch = lowerSearch.replace(/^#/, '');
      const matchRef = o.id.toLowerCase().includes(cleanRefSearch);
      return matchCustomer || matchDetails || matchStyle || matchRef;
    }

    return true;
  });
}
