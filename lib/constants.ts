/* ============================================================
   MyStitchBook Constants
   ============================================================
   Enums, mappings, and configuration constants.
   ============================================================ */

import type { OrderStatus, Role, NavItem, Priority } from './types';

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

export const USER_ROLES: readonly Role[] = ['OrgAdmin', 'BranchManager', 'Staff', 'Accountant'] as const;

export const PHONE_PREFIX = '234';

export interface CurrencyConfig {
  code: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'NGN', label: 'NGN (₦) - Nigeria' },
  { code: 'USD', label: 'USD ($) - United States' },
  { code: 'GBP', label: 'GBP (£) - United Kingdom' },
  { code: 'EUR', label: 'EUR (€) - Eurozone' },
  { code: 'GHS', label: 'GHS (₵) - Ghana' },
  { code: 'KES', label: 'KES (KSh) - Kenya' },
  { code: 'ZAR', label: 'ZAR (R) - South Africa' },
  { code: 'TZS', label: 'TZS (TSh) - Tanzania' },
  { code: 'UGX', label: 'UGX (USh) - Uganda' },
  { code: 'RWF', label: 'RWF (FRw) - Rwanda' },
  { code: 'CAD', label: 'CAD ($) - Canada' },
  { code: 'AUD', label: 'AUD ($) - Australia' },
  { code: 'INR', label: 'INR (₹) - India' },
  { code: 'XAF', label: 'XAF (FCFA) - Central Africa' },
  { code: 'XOF', label: 'XOF (CFA) - West Africa' },
  { code: 'EGP', label: 'EGP (E£) - Egypt' },
  { code: 'MAD', label: 'MAD (DH) - Morocco' },
  { code: 'ZMW', label: 'ZMW (ZK) - Zambia' },
  { code: 'ZWL', label: 'ZWL (Z$) - Zimbabwe' },
];
/** Maps each order status to its visual properties */
export const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bgColor: string; icon: string; label: string }
> = {
  Documented: {
    color: 'var(--sf-stage-documented)',
    bgColor: 'var(--sf-stage-documented-bg)',
    icon: 'assignment',
    label: 'Documented',
  },
  Cutting: {
    color: 'var(--sf-stage-cutting)',
    bgColor: 'var(--sf-stage-cutting-bg)',
    icon: 'content_cut',
    label: 'Cutting',
  },
  Sewing: {
    color: 'var(--sf-stage-sewing)',
    bgColor: 'var(--sf-stage-sewing-bg)',
    icon: 'settings',
    label: 'Sewing',
  },
  Ready: {
    color: 'var(--sf-stage-ready)',
    bgColor: 'var(--sf-stage-ready-bg)',
    icon: 'check',
    label: 'Ready',
  },
  Completed: {
    color: 'var(--sf-stage-completed)',
    bgColor: 'var(--sf-stage-completed-bg)',
    icon: 'check_circle',
    label: 'Delivered',
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
    icon: 'remove',
  },
  urgent: {
    color: 'var(--sf-warning)',
    bgColor: 'var(--sf-warning-bg)',
    label: 'Urgent',
    icon: 'error',
  },
  rush: {
    color: 'var(--sf-error)',
    bgColor: 'var(--sf-error-bg)',
    label: 'Rush',
    icon: 'local_fire_department',
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
 *  wear the shop's own best photo of that style. `gender` gates the catalog
 *  everywhere it's shown — a male customer only ever sees male styles and
 *  vice versa, no mixed picker. `photoUrl` is a permanent placeholder shot
 *  (studio mannequin, on-brand) used until the shop has taken its own photo
 *  of that style — `getStylePhotos` prefers the shop's real photo first. */
export interface GarmentStyle {
  name: string;
  subtitle: string;
  keywords: string[];
  gender: 'male' | 'female';
  photoUrl: string;
}

export const GARMENT_STYLES: GarmentStyle[] = [
  // ── Male ──────────────────────────────────────────────────
  { name: 'Agbada', subtitle: 'Traditional 3-piece set', keywords: ['agbada'], gender: 'male', photoUrl: '/images/garments/agbada-male.jpg' },
  { name: 'Senator', subtitle: 'Modern native', keywords: ['senator'], gender: 'male', photoUrl: '/images/garments/senator-male.jpg' },
  { name: 'Kaftan', subtitle: '2-piece suit', keywords: ['kaftan'], gender: 'male', photoUrl: '/images/garments/kaftan-male.jpg' },
  { name: 'Ankara Shirt', subtitle: 'Casual print shirt', keywords: ['ankara shirt'], gender: 'male', photoUrl: '/images/garments/ankara-shirt-male.jpg' },
  { name: 'Danshiki', subtitle: 'Casual native top', keywords: ['danshiki', 'dashiki'], gender: 'male', photoUrl: '/images/garments/danshiki-male.jpg' },
  { name: 'Two-Piece Suit', subtitle: 'Bespoke suiting', keywords: ['suit', 'blazer'], gender: 'male', photoUrl: '/images/garments/suit-male.jpg' },
  { name: 'Babariga', subtitle: 'Grand embroidered robe', keywords: ['babariga'], gender: 'male', photoUrl: '/images/garments/babariga-male.jpg' },
  { name: 'Isi Agu', subtitle: 'Chieftaincy/cultural wear', keywords: ['isi agu', 'isiagu'], gender: 'male', photoUrl: '/images/garments/isi-agu-male.jpg' },
  { name: 'Aso Ebi (Men)', subtitle: 'Matching event wear', keywords: ['aso ebi', 'asoebi'], gender: 'male', photoUrl: '/images/garments/aso-ebi-male.jpg' },
  { name: 'Two-Piece (Men)', subtitle: 'Matching top and trousers', keywords: ['two piece', 'two-piece'], gender: 'male', photoUrl: '/images/garments/two-piece-male.jpg' },

  // ── Female ────────────────────────────────────────────────
  { name: 'Ankara Gown', subtitle: "Women's tailored gown", keywords: ['ankara', 'gown'], gender: 'female', photoUrl: '/images/garments/ankara-gown-female.jpg' },
  { name: 'Buba & Iro', subtitle: "Traditional women's wear", keywords: ['buba', 'iro'], gender: 'female', photoUrl: '/images/garments/buba-iro-female.jpg' },
  { name: 'Boubou', subtitle: 'Flowing formal gown', keywords: ['boubou'], gender: 'female', photoUrl: '/images/garments/boubou-female.jpg' },
  { name: 'Skirt & Blouse', subtitle: 'Office/native combo', keywords: ['skirt', 'blouse'], gender: 'female', photoUrl: '/images/garments/skirt-blouse-female.jpg' },
  { name: 'Aso Ebi Gown', subtitle: 'Event/ceremony dress', keywords: ['aso ebi gown', 'asoebi gown'], gender: 'female', photoUrl: '/images/garments/aso-ebi-gown-female.jpg' },
  { name: 'Jumpsuit', subtitle: 'Modern tailored piece', keywords: ['jumpsuit', 'jump suit'], gender: 'female', photoUrl: '/images/garments/jumpsuit-female.jpg' },
  { name: 'Kaftan (Women)', subtitle: 'Relaxed flowing gown', keywords: ['kaftan'], gender: 'female', photoUrl: '/images/garments/kaftan-female.jpg' },
  { name: 'Senator (Women)', subtitle: 'Fitted native 2-piece', keywords: ['senator'], gender: 'female', photoUrl: '/images/garments/senator-female.jpg' },
  { name: 'Peplum & Wrapper', subtitle: 'Fitted top, wrapper skirt', keywords: ['peplum', 'wrapper'], gender: 'female', photoUrl: '/images/garments/peplum-wrapper-female.jpg' },
  { name: 'Two-Piece (Women)', subtitle: 'Matching top and trousers', keywords: ['two piece', 'two-piece'], gender: 'female', photoUrl: '/images/garments/two-piece-female.jpg' },
  { name: 'Gathers Dress', subtitle: 'Flared gathered dress', keywords: ['gathers', 'gather dress', 'gathered'], gender: 'female', photoUrl: '/images/garments/gathers-dress-female.jpg' },
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
  /** false skips rendering the body-diagram guide — used for custom
   *  garment styles, whose shop-defined fields don't correspond to a
   *  real body-diagram pin placement. */
  hasDiagram?: boolean;
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

  // ── New styles reuse their closest analog's exact guide coordinates —
  //    same silhouette region, same variant, only labels/hints change. ──
  'Ankara Shirt': {
    variant: 'tunic',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'stomach', label: 'Stomach', hint: 'Around the belly, relaxed', gx: 100, gy: 116 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 160, gy: 128 },
      { key: 'shirtLength', label: 'Shirt Length', hint: 'Shoulder to shirt hem', gx: 100, gy: 182 },
    ],
  },
  Danshiki: {
    variant: 'tunic',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to hem', gx: 100, gy: 182 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
    ],
  },
  Babariga: {
    variant: 'robe',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 141, gy: 50 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 92 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 163, gy: 92 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 176, gy: 122 },
      { key: 'shirtLength', label: 'Inner Top Length', hint: 'Shoulder to inner-top hem', gx: 66, gy: 160 },
      { key: 'gownLength', label: 'Babariga Length', hint: 'Shoulder to full hem', gx: 100, gy: 244 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 138, gy: 244 },
    ],
  },
  'Isi Agu': {
    variant: 'tunic',
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 100, gy: 36 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 100, gy: 84 },
      { key: 'stomach', label: 'Stomach', hint: 'Around the belly, relaxed', gx: 100, gy: 116 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to hem', gx: 100, gy: 182 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
    ],
  },
  'Aso Ebi (Men)': {
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
  Boubou: {
    variant: 'gown',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 80 },
      { key: 'underBust', label: 'Under Bust', hint: 'Just under the bust', gx: 100, gy: 100 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 133, gy: 48 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 128 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 158 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 88 },
      { key: 'gownLength', label: 'Boubou Length', hint: 'Shoulder to hem', gx: 100, gy: 256 },
    ],
  },
  'Skirt & Blouse': {
    variant: 'wrapper',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 82 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 50 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 156, gy: 90 },
      { key: 'shirtLength', label: 'Blouse Length', hint: 'Shoulder to blouse hem', gx: 100, gy: 148 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 168 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 196 },
      { key: 'dressLength', label: 'Skirt Length', hint: 'Waist to skirt hem', gx: 100, gy: 258 },
    ],
  },
  'Aso Ebi Gown': {
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
  Jumpsuit: {
    variant: 'suit',
    points: [
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 48 },
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 84 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 124 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 148 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 92 },
      { key: 'trouserLength', label: 'Leg Length', hint: 'Waist to ankle', gx: 100, gy: 262 },
      { key: 'inseam', label: 'Inseam', hint: 'Crotch to ankle', gx: 112, gy: 220 },
    ],
  },
  'Kaftan (Women)': {
    variant: 'gown',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 80 },
      { key: 'underBust', label: 'Under Bust', hint: 'Just under the bust', gx: 100, gy: 100 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 133, gy: 48 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 128 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 158 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 152, gy: 88 },
      { key: 'gownLength', label: 'Kaftan Length', hint: 'Shoulder to hem', gx: 100, gy: 256 },
    ],
  },
  'Senator (Women)': {
    variant: 'wrapper',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 82 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 50 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 156, gy: 90 },
      { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to top hem', gx: 100, gy: 148 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 168 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 196 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 258 },
    ],
  },
  'Peplum & Wrapper': {
    variant: 'wrapper',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 82 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 50 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 156, gy: 90 },
      { key: 'shirtLength', label: 'Peplum Top Length', hint: 'Shoulder to peplum hem', gx: 100, gy: 148 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 168 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 196 },
      { key: 'dressLength', label: 'Wrapper Length', hint: 'Waist to wrapper hem', gx: 100, gy: 258 },
    ],
  },
  'Two-Piece (Men)': {
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
  'Two-Piece (Women)': {
    variant: 'tunic',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 82 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 135, gy: 50 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 156, gy: 90 },
      { key: 'shirtLength', label: 'Top Length', hint: 'Shoulder to top hem', gx: 100, gy: 148 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 168 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 100, gy: 196 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 100, gy: 258 },
    ],
  },
  'Gathers Dress': {
    variant: 'gown',
    points: [
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 100, gy: 80 },
      { key: 'underBust', label: 'Under Bust', hint: 'Just under the bust', gx: 100, gy: 100 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 133, gy: 48 },
      { key: 'shoulderToBustPoint', label: 'Shoulder to Bust', hint: 'Shoulder to bust point', gx: 116, gy: 64 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 100, gy: 128 },
      { key: 'halfLength', label: 'Half Length', hint: 'Shoulder to waist (gathers start)', gx: 100, gy: 128 },
      { key: 'gownLength', label: 'Dress Length', hint: 'Shoulder to hem', gx: 100, gy: 256 },
    ],
  },
};

/** A shop-defined custom style with its own saved field list (from the
 *  measurement-field builder) builds its spec from those fields instead of
 *  falling back to DEFAULT_MEASURE_SPEC — no body-diagram since the
 *  fields have no meaningful pin placement. */
export function buildCustomStyleSpec(fields: { id: string; label: string }[]): StyleMeasureSpec {
  return {
    variant: 'tunic',
    hasDiagram: false,
    points: fields.map((f) => ({ key: f.id, label: f.label, hint: '', gx: 0, gy: 0 })),
  };
}

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

/** The full-body point set collected once during onboarding (or later
 *  from a customer's profile), gendered because the two genders' garments
 *  care about different landmarks (bust/underBust vs. chest/stomach).
 *  Field keys match MeasurementAnatomy.tsx's point lists exactly, so
 *  values collected here and values collected via the profile's Visual
 *  Anatomy tab land in the same Measurements keys. No body-diagram here —
 *  this step is the source those per-garment diagrams get their pins
 *  filled from, not a diagram itself. */
export const FULL_BODY_MEASUREMENTS: Record<'male' | 'female', StyleMeasureSpec> = {
  male: {
    variant: 'tunic',
    hasDiagram: false,
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 0, gy: 0 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 0, gy: 0 },
      { key: 'crossFront', label: 'Across Front', hint: 'Chest, armpit to armpit', gx: 0, gy: 0 },
      { key: 'crossBack', label: 'Across Back', hint: 'Back, armpit to armpit', gx: 0, gy: 0 },
      { key: 'chest', label: 'Chest', hint: 'Fullest part, arms down', gx: 0, gy: 0 },
      { key: 'stomach', label: 'Stomach', hint: 'Around the belly, relaxed', gx: 0, gy: 0 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 0, gy: 0 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 0, gy: 0 },
      { key: 'crotch', label: 'Crotch', hint: 'Waist to crotch, seated', gx: 0, gy: 0 },
      { key: 'armhole', label: 'Armhole', hint: 'Around the arm socket', gx: 0, gy: 0 },
      { key: 'bicep', label: 'Bicep', hint: 'Around the fullest part of the upper arm', gx: 0, gy: 0 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 0, gy: 0 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 0, gy: 0 },
      { key: 'backLength', label: 'Back Length', hint: 'Nape to natural waist', gx: 0, gy: 0 },
      { key: 'shirtLength', label: 'Shirt Length', hint: 'Shoulder to shirt hem', gx: 0, gy: 0 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 0, gy: 0 },
      { key: 'thigh', label: 'Thigh', hint: 'Widest part of the thigh', gx: 0, gy: 0 },
      { key: 'knee', label: 'Knee', hint: 'Around the knee', gx: 0, gy: 0 },
      { key: 'calf', label: 'Calf', hint: 'Around the fullest part of the calf', gx: 0, gy: 0 },
      { key: 'ankle', label: 'Ankle', hint: 'Around the ankle', gx: 0, gy: 0 },
      { key: 'inseam', label: 'Inseam', hint: 'Crotch to ankle', gx: 0, gy: 0 },
      { key: 'outseam', label: 'Outseam', hint: 'Waist to ankle, outer leg', gx: 0, gy: 0 },
    ],
  },
  female: {
    variant: 'gown',
    hasDiagram: false,
    points: [
      { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 0, gy: 0 },
      { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across the back', gx: 0, gy: 0 },
      { key: 'crossFront', label: 'Across Front', hint: 'Chest, armpit to armpit', gx: 0, gy: 0 },
      { key: 'crossBack', label: 'Across Back', hint: 'Back, armpit to armpit', gx: 0, gy: 0 },
      { key: 'bust', label: 'Bust', hint: 'Fullest part of the bust', gx: 0, gy: 0 },
      { key: 'underBust', label: 'Under Bust', hint: 'Just under the bust', gx: 0, gy: 0 },
      { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 0, gy: 0 },
      { key: 'hips', label: 'Hips', hint: 'Widest point', gx: 0, gy: 0 },
      { key: 'armhole', label: 'Armhole', hint: 'Around the arm socket', gx: 0, gy: 0 },
      { key: 'bicep', label: 'Bicep', hint: 'Around the fullest part of the upper arm', gx: 0, gy: 0 },
      { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 0, gy: 0 },
      { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 0, gy: 0 },
      { key: 'napeToWaist', label: 'Nape to Waist', hint: 'Base of neck to natural waist', gx: 0, gy: 0 },
      { key: 'frontLength', label: 'Front Length', hint: 'Shoulder to natural waist, front', gx: 0, gy: 0 },
      { key: 'dressLength', label: 'Dress Length', hint: 'Shoulder to hem', gx: 0, gy: 0 },
      { key: 'gownLength', label: 'Gown Length', hint: 'Shoulder to hem', gx: 0, gy: 0 },
      { key: 'trouserLength', label: 'Trouser Length', hint: 'Waist to ankle', gx: 0, gy: 0 },
      { key: 'thigh', label: 'Thigh', hint: 'Widest part of the thigh', gx: 0, gy: 0 },
      { key: 'knee', label: 'Knee', hint: 'Around the knee', gx: 0, gy: 0 },
      { key: 'calf', label: 'Calf', hint: 'Around the fullest part of the calf', gx: 0, gy: 0 },
      { key: 'ankle', label: 'Ankle', hint: 'Around the ankle', gx: 0, gy: 0 },
      { key: 'inseam', label: 'Inseam', hint: 'Crotch to ankle', gx: 0, gy: 0 },
      { key: 'outseam', label: 'Outseam', hint: 'Waist to ankle, outer leg', gx: 0, gy: 0 },
      { key: 'crotch', label: 'Crotch', hint: 'Waist to crotch, seated', gx: 0, gy: 0 },
      { key: 'halfLength', label: 'Half Length', hint: 'Shoulder to waist (gathers start)', gx: 0, gy: 0 },
      { key: 'shoulderToBustPoint', label: 'Shoulder to Bust Point', hint: 'Shoulder seam to bust point', gx: 0, gy: 0 },
      { key: 'nippleToNipple', label: 'Nipple to Nipple', hint: 'Across the bust points', gx: 0, gy: 0 },
      { key: 'shoulderToWaist', label: 'Shoulder to Waist', hint: 'Shoulder seam to natural waist', gx: 0, gy: 0 },
      { key: 'shoulderToHips', label: 'Shoulder to Hips', hint: 'Shoulder seam to widest hip point', gx: 0, gy: 0 },
    ],
  },
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'home' },
  { label: 'Production', href: '/production', icon: 'precision_manufacturing' },
  { label: 'Fabrics', href: '/fabrics', icon: 'checkroom' },
  { label: 'Customers', href: '/customers', icon: 'group', ownerOnly: true },
  { label: 'Settings', href: '/settings', icon: 'settings', ownerOnly: true, hideFromBottomNav: true },
];
