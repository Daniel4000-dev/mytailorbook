/* ============================================================
   MyTailorBook Type Definitions
   ============================================================
   All shared TypeScript types and interfaces.
   ============================================================ */

export type Role = 'Owner' | 'Staff';

export interface Shop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  ownerUid: string;
  createdAt: string;
  /** Shop-defined one-off garment styles beyond the built-in catalog —
   *  remembered across future orders once created, same as built-in styles. */
  customStyles?: { name: string; photoUrl?: string }[];
}

export type OrderStatus = 'Documented' | 'Cutting' | 'Sewing' | 'Ready' | 'Completed';

/** A garment photo tagged with the production stage it was taken at —
 *  lets the tracking page show an actual visual story, not one flat gallery. */
export interface OrderPhoto {
  url: string;
  stage: OrderStatus;
  uploadedAt: string;
}

/** A customer comment left on the public tracking page, tagged with
 *  whatever stage the order was in at the moment it was written. */
export interface OrderComment {
  id: string;
  orderId: string;
  message: string;
  stage: OrderStatus;
  createdAt: string;
}

export type Priority = 'normal' | 'urgent' | 'rush';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  shopId: string;
  active?: boolean; // undefined/true = active, false = deactivated
  createdAt: string;
}

export interface Measurements {
  neck?: number;
  shoulder?: number;
  chest?: number;
  bust?: number;
  underBust?: number;
  waist?: number;
  stomach?: number;
  hips?: number;
  armhole?: number;
  bicep?: number;
  armLength?: number;
  sleeveLength?: number;
  wrist?: number;
  crossFront?: number;
  crossBack?: number;
  napeToWaist?: number;
  shoulderToBustPoint?: number;
  nippleToNipple?: number;
  shoulderToWaist?: number;
  shoulderToHips?: number;
  halfLength?: number;
  frontLength?: number;
  backLength?: number;
  shirtLength?: number;
  dressLength?: number;
  gownLength?: number;
  trouserLength?: number;
  inseam?: number;
  outseam?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  crotch?: number;
  notes?: string;
}

/** A saved, named measurement snapshot for one garment style — lets a
 *  returning client's numbers for that exact style be recalled directly,
 *  instead of only via scanning their past orders. */
export interface StyleMeasurementProfile {
  measurements: Measurements;
  updatedAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  fullName: string;
  whatsappNumber: string;
  gender: 'male' | 'female';
  /** Styles this client usually commissions (chips in the new-client
   *  wizard) — e.g. ['Agbada', 'Senator']. */
  preferredStyles?: string[];
  measurements?: Measurements;
  /** Keyed by garment style name (matches GARMENT_STYLES / STYLE_MEASUREMENTS). */
  styleMeasurements?: Record<string, StyleMeasurementProfile>;
  createdAt: string;
}

export interface StatusChange {
  from: OrderStatus | null;
  to: OrderStatus;
  changedBy: string;      // User uid
  changedByName: string;  // User display name
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  note?: string;
  recordedBy: string;      // User uid
  recordedByName: string;  // User display name
  timestamp: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  orderDetails: string;
  totalBill: number;
  depositPaid: number;
  status: OrderStatus;
  assignedTo?: string;       // Staff uid
  assignedToName?: string;   // Staff display name
  dueDate?: string;          // ISO date string
  priority: Priority;
  /** Snapshot of the measurements this garment was cut to, frozen at
   *  intake — the customer's live profile may drift afterwards. */
  measurements?: Measurements;
  images?: OrderPhoto[];     // garment photos, each tagged with its production stage
  /** Reference photo(s) the CUSTOMER brought in of what they want made —
   *  separate from `images`, which shows the tailor's actual progress. */
  inspirationImages?: string[];
  /** Shared across every order created in the same multi-garment intake
   *  session — lets the UI show "N items from this visit" without
   *  forcing all garments from one drop-off to share a single kanban card. */
  batchId?: string;
  /** When the most recent customer comment was left (set by the public
   *  comment action). Compared against commentsSeenAt for an "unread" badge. */
  lastCommentAt?: string;
  /** When someone at the shop last opened this order's detail sheet. */
  commentsSeenAt?: string;
  payments?: PaymentRecord[];
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

/** Computed field — not stored, derived at read time */
export function getBalanceOwed(order: Order): number {
  return order.totalBill - order.depositPaid;
}

/** True when a customer comment arrived that no one at the shop has opened yet. */
export function hasUnreadComment(order: Order): boolean {
  if (!order.lastCommentAt) return false;
  if (!order.commentsSeenAt) return true;
  return new Date(order.lastCommentAt) > new Date(order.commentsSeenAt);
}

/** Check if an order is overdue */
export function isOverdue(order: Order): boolean {
  if (!order.dueDate || order.status === 'Completed') return false;
  return new Date(order.dueDate) < new Date();
}

/** Check if an order is due within N days */
export function isDueSoon(order: Order, days: number = 2): boolean {
  if (!order.dueDate || order.status === 'Completed') return false;
  const due = new Date(order.dueDate);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  ownerOnly?: boolean;
}

export interface StatCardData {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  accentColor?: string;
}

export interface ActivityItem {
  id: string;
  orderRef: string;
  customerName: string;
  action: string;
  performedBy: string;     // Who did the action
  timestamp: string;
}
