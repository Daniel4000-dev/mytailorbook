/* ============================================================
   MyTailorBook Type Definitions
   ============================================================
   All shared TypeScript types and interfaces.
   ============================================================ */

export type Role = 'Owner' | 'Staff';

export type OrderStatus = 'Cutting' | 'Sewing' | 'Ready' | 'Completed';

export type Priority = 'normal' | 'urgent' | 'rush';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
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
  frontLength?: number;
  backLength?: number;
  shirtLength?: number;
  dressLength?: number;
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
  fullName: string;
  whatsappNumber: string;
  gender: 'male' | 'female';
  measurements?: Measurements;
  createdAt: string;
}

export interface StatusChange {
  from: OrderStatus | null;
  to: OrderStatus;
  changedBy: string;      // User uid
  changedByName: string;  // User display name
  timestamp: string;
}

export interface Order {
  id: string;
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
  images?: string[];         // URLs or base64 data URIs
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
