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

/** Garment style catalog: order-wizard cards and new-client preference
 *  chips. `keywords` match against past orders' details so each card can
 *  wear the shop's own best photo of that style. */
export interface GarmentStyle {
  name: string;
  subtitle: string;
  keywords: string[];
}

export const GARMENT_STYLES: GarmentStyle[] = [
  { name: 'Agbada', subtitle: 'Traditional 3-piece set', keywords: ['agbada'] },
  { name: 'Kaftan', subtitle: '2-piece suit', keywords: ['kaftan'] },
  { name: 'Senator', subtitle: 'Modern native', keywords: ['senator'] },
  { name: 'Ankara Gown', subtitle: "Women's tailored gown", keywords: ['ankara', 'gown'] },
  { name: 'Buba & Iro', subtitle: "Traditional women's wear", keywords: ['buba', 'iro'] },
  { name: 'Two-Piece Suit', subtitle: 'Bespoke suiting', keywords: ['suit', 'blazer'] },
];

/* ── Style-specific measurement intake ─────────────────────────
   Each garment style measures different points, in the order a tailor
   actually works. `hint` is plain language so a non-tailor can follow;
   gx/gy place the numbered marker on that style's guide silhouette
   (200×300 canvas in MeasureGuide). */

export type GuideVariant = 'robe' | 'tunic' | 'gown' | 'wrapper' | 'suit';

export interface StyleMeasurePoint {
  key: string;       // key into Measurements
  label: string;
  hint: string;
  gx: number;
  gy: number;
}

export interface StyleMeasureSpec {
  variant: GuideVariant;
  points: StyleMeasurePoint[];
}

export const STYLE_MEASUREMENTS: Record<string, StyleMeasureSpec> = {
  Agbada: {
    variant: 'robe',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 141, gy: 50 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 92 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 163, gy: 92 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 176, gy: 122 },
      { key: 'shirtLength', label: 'Inner Top Length', hint: 'Shoulder to inner-top hem', gx: 66, gy: 160 },
      { key: 'gownLength', label: 'Agbada Length', hint: 'Shoulder to full hem', gx: 100, gy: 244 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 138, gy: 244 },
    ],
  },
  Kaftan: {
    variant: 'tunic',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'stomach', label: 'Stomach', hint: 'Around the belly, relaxed', gx: 100, gy: 116 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 160, gy: 128 },
      { key: 'shirtLength', label: 'Kaftan Length', hint: 'Shoulder to hem', gx: 100, gy: 182 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
      { key: 'thigh', label: 'Thigh', hint: 'Widest part of the thigh', gx: 82, gy: 210 },
      { key: 'ankle', label: 'Ankle', hint: 'Around the ankle', gx: 118, gy: 268 },
    ],
  },
  Senator: {
    variant: 'tunic',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'stomach', label: 'Stomach', hint: 'Around the belly, relaxed', gx: 100, gy: 116 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to hem', gx: 100, gy: 182 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
      { key: 'thigh', label: 'Thigh', hint: 'Widest part of the thigh', gx: 82, gy: 210 },
      { key: 'ankle', label: 'Ankle', hint: 'Around the ankle', gx: 118, gy: 268 },
    ],
  },
  'Ankara Gown': {
    variant: 'gown',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 80 },
      { key: 'underBust', label: 'Under Bust', hint: 'Just under the bust', gx: 100, gy: 100 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 133, gy: 48 },
      { key: 'shoulderToBustPoint', label: 'Shoulder to Bust', hint: 'Shoulder to bust point', gx: 116, gy: 64 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 128 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 158 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 88 },
      { key: 'gownLength', label: 'Gown Length', hint: 'Shoulder to hem', gx: 100, gy: 256 },
    ],
  },
  'Buba & Iro': {
    variant: 'wrapper',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 82 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 50 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 156, gy: 90 },
      { key: 'shirtLength', label: 'Buba Length', hint: 'Shoulder to blouse hem', gx: 100, gy: 148 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 168 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 196 },
      { key: 'dressLength', label: 'Iro Length', hint: 'Waist to wrapper hem', gx: 100, gy: 258 },
    ],
  },
  'Two-Piece Suit': {
    variant: 'suit',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 124 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 148 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'shirtLength', label: 'Jacket Length', hint: 'Shoulder to jacket hem', gx: 100, gy: 166 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
      { key: 'inseam', label: 'Inseam', hint: 'Crotch to ankle', gx: 112, gy: 220 },
      { key: 'thigh', label: 'Thigh', hint: 'Widest part of the thigh', gx: 82, gy: 210 },
    ],
  },
};

/** Fallback point set for custom garments — the classic full pass. */
export const DEFAULT_MEASURE_SPEC: StyleMeasureSpec = {
  variant: 'tunic',
  points: [
    { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
    { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
    { key: 'chest', label: 'Chest / Bust', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
    { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 120 },
    { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 150 },
    { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
    { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to hem', gx: 100, gy: 182 },
    { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
  ],
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'FaHouse' },
  { label: 'Production', href: '/production', icon: 'FaTableColumns' },
  { label: 'Customers', href: '/customers', icon: 'FaUsers', ownerOnly: true },
  { label: 'Settings', href: '/settings', icon: 'FaGear', ownerOnly: true },
];
