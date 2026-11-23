import { Order } from '@/lib/types';

export type FabricStageFilter = 'uncut' | 'cutting' | 'sewing' | 'production' | 'urgent' | 'all';

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
    // 'cutting': 'Cutting' stage (on the shears)
    // 'sewing': 'Sewing' stage (on the sewing floor)
    // 'urgent': Active orders flagged rush or urgent
    // 'production': 'Cutting' or 'Sewing' (active on the workshop floor)
    // 'all': Active atelier garments ('Documented', 'Cutting', 'Sewing', 'Ready')
    if (stageFilter === 'uncut') {
      if (o.status !== 'Documented') return false;
    } else if (stageFilter === 'cutting') {
      if (o.status !== 'Cutting') return false;
    } else if (stageFilter === 'sewing') {
      if (o.status !== 'Sewing') return false;
    } else if (stageFilter === 'urgent') {
      if (o.status === 'Delivered' || (o.priority !== 'rush' && o.priority !== 'urgent')) return false;
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
  }).sort((a, b) => {
    // 1. Rush/Urgent priority first on the cutting table
    const getPriorityWeight = (p?: string) => {
      if (p === 'rush') return 2;
      if (p === 'urgent') return 1;
      return 0;
    };
    const weightA = getPriorityWeight(a.priority);
    const weightB = getPriorityWeight(b.priority);
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 2. Earliest workshop due date first
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // 3. Fallback to newest created first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
