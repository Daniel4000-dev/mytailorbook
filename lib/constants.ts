/* ============================================================
   MyTailorBook Constants
   ============================================================
   Enums, mappings, and configuration constants.
   ============================================================ */

import type { OrderStatus, Role, NavItem, Priority } from './types';
import { APP_CONFIG } from './config';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'Documented',
  'Cutting',
  'Sewing',
  'Ready',
  'Completed',
] as const;

/** Production pipeline statuses (excludes Documented intake stage) */
export const PRODUCTION_STATUSES: readonly OrderStatus[] = [
  'Cutting',
  'Sewing',
  'Ready',
  'Completed',
] as const;

export const USER_ROLES: readonly Role[] = ['Owner', 'Staff'] as const;

export const PHONE_PREFIX = '234';

/** Maps each order status to its visual properties */
export const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bgColor: string; icon: string; label: string }
> = {
  Documented: {
    color: 'var(--sf-stage-documented)',
    bgColor: 'var(--sf-stage-documented-bg)',
    icon: 'FaClipboardList',
    label: 'Documented',
  },
  Cutting: {
    color: 'var(--sf-stage-cutting)',
    bgColor: 'var(--sf-stage-cutting-bg)',
    icon: 'FaScissors',
    label: 'Cutting',
  },
  Sewing: {
    color: 'var(--sf-stage-sewing)',
    bgColor: 'var(--sf-stage-sewing-bg)',
    icon: 'FaGears',
    label: 'Sewing',
  },
  Ready: {
    color: 'var(--sf-stage-ready)',
    bgColor: 'var(--sf-stage-ready-bg)',
    icon: 'FaCheck',
    label: 'Ready',
  },
  Completed: {
    color: 'var(--sf-stage-completed)',
    bgColor: 'var(--sf-stage-completed-bg)',
    icon: 'FaCircleCheck',
    label: 'Completed',
  },
};

/** Priority configuration */
export const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; bgColor: string; label: string; icon: string }
> = {
  normal: {
    color: 'var(--sf-text-secondary)',
    bgColor: 'transparent',
    label: 'Normal',
    icon: 'FaMinus',
  },
  urgent: {
    color: 'var(--sf-warning)',
    bgColor: 'var(--sf-warning-bg)',
    label: 'Urgent',
    icon: 'FaExclamation',
  },
  rush: {
    color: 'var(--sf-error)',
    bgColor: 'var(--sf-error-bg)',
    label: 'Rush',
    icon: 'FaFireFlameCurved',
  },
};

/** Measurement field labels for display */
export const MEASUREMENT_LABELS: Record<string, string> = {
  bust: 'Bust',
  waist: 'Waist',
  hips: 'Hips',
  shoulder: 'Shoulder',
  sleeveLength: 'Sleeve Length',
  inseam: 'Inseam',
  outseam: 'Outseam',
  neck: 'Neck',
  chest: 'Chest',
  armLength: 'Arm Length',
  dressLength: 'Dress Length',
  trouserLength: 'Trouser Length',
};

/** Gets the next status in the pipeline, or null if completed */
export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUSES.indexOf(current);
  if (index === -1 || index === ORDER_STATUSES.length - 1) return null;
  return ORDER_STATUSES[index + 1];
}

/** Gets the previous status in the pipeline, or null if at the beginning */
export function getPreviousStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUSES.indexOf(current);
  if (index <= 0) return null;
  return ORDER_STATUSES[index - 1];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'FaHouse' },
  { label: 'Production', href: '/production', icon: 'FaTableColumns' },
  { label: 'Customers', href: '/customers', icon: 'FaUsers', ownerOnly: true },
  { label: 'Settings', href: '/settings', icon: 'FaGear', ownerOnly: true },
];
