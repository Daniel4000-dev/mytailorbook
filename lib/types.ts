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
  /** Short line shown at the top of the public portfolio page, e.g. "Bespoke agbada & senator wear since 2015" */
  tagline?: string;
  /** Longer free-text description shown on the public portfolio page. */
  bio?: string;
  ownerUid: string;
  createdAt: string;
}

/** A photo the owner has chosen to feature on the public portfolio page —
 *  independent of any specific order, so it never implicitly identifies a customer. */
export interface PortfolioPhoto {
  id: string;
  shopId: string;
  url: string;
  caption?: string;
  sortOrder: number;
  createdAt: string;
}

export type OrderStatus = 'Documented' | 'Cutting' | 'Sewing' | 'Ready' | 'Completed';

/** A garment photo tagged with the production stage it was taken at —
 *  lets the tracking page show an actual visual story, not one flat gallery. */
export interface OrderPhoto {
  url: string;
  stage: OrderStatus;
  uploadedAt: string;
}

/** One line item within an order's itemized breakdown, e.g. "Agbada — ₦25,000". */
export interface OrderItem {
  id: string;
  description: string;
  price: number;
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

export interface Customer {
  id: string;
  shopId: string;
  fullName: string;
  whatsappNumber: string;
  gender: 'male' | 'female';
  measurements?: Measurements;
  /** ISO date string (YYYY-MM-DD) — optional, powers the birthday nudge. */
  dateOfBirth?: string;
  /** Another customer's id — who referred this customer to the shop. */
  referredBy?: string;
  /** Fit/style preferences that persist across orders, e.g. "prefers loose sleeves". */
  styleNotes?: string;
  createdAt: string;
}

/** A previous measurement set for a customer, kept when measurements are
 *  edited instead of being silently overwritten. */
export interface MeasurementHistoryEntry {
  id: string;
  customerId: string;
  measurements: Measurements;
  recordedAt: string;
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
  /** Optional itemized breakdown — additive; orderDetails/totalBill remain
   *  the source of truth for orders that don't use this. */
  items?: OrderItem[];
  totalBill: number;
  depositPaid: number;
  status: OrderStatus;
  assignedTo?: string;       // Staff uid
  assignedToName?: string;   // Staff display name
  dueDate?: string;          // ISO date string
  priority: Priority;
  images?: OrderPhoto[];     // garment photos, each tagged with its production stage
  rating?: number;           // 1-5, set once by the customer after delivery
  ratingSubmittedAt?: string;
  /** Frozen copy of the customer's measurements at the moment this order was created —
   *  immune to later edits to the customer's profile, so a completed order always
   *  reflects what it was actually cut/sewn against. */
  measurementsSnapshot?: Measurements;
  payments?: PaymentRecord[];
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

/** Computed field — not stored, derived at read time */
export function getBalanceOwed(order: Order): number {
  return order.totalBill - order.depositPaid;
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
