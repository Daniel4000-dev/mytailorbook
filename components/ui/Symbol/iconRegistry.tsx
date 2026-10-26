import React from 'react';

export type IconRenderer = (props: {
  size: number;
  fill?: boolean;
  strokeWidth?: number;
  color?: string;
}) => React.ReactElement;

/**
 * MyStitchBook Bespoke Atelier Icon Registry
 * 100% Native vector SVGs designed specifically for bespoke fashion tailors,
 * ready-to-wear ateliers, and fashion artisans. Zero external webfont dependencies.
 */
export const SVG_ICONS: Record<string, IconRenderer> = {
  // =========================================================================
  // 1. BESPOKE CRAFT & ATELIER ESSENTIALS
  // =========================================================================

  /** Slender tailor's needle with threaded eye and looping stitch */
  needle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.2 3.8C20.8 3.2 21.2 2.8 21.2 2.8C21.2 2.8 20.8 3.2 20.2 3.8L6.5 17.5C5.8 18.2 4.2 19.8 3 21C4.2 19.8 5.8 18.2 6.5 17.5L20.2 3.8Z" fill={color} />
      <path d="M20.5 3.5L5 19L3 21L5 19L20.5 3.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="18.5" cy="5.5" rx="1.2" ry="2.2" transform="rotate(45 18.5 5.5)" fill={fill ? '#fff' : 'none'} stroke={color} strokeWidth="1" />
      <path d="M17.5 4.5C16 3 13 3 12 5.5C11 8 13.5 10 16 9C18 8 20 10 20 12C20 14.5 17.5 16 15 16" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2.5 2" opacity="0.85" />
    </svg>
  ),

  /** Heavy-duty Japanese Tailor's Shears (asymmetric bow handles & pivot screw) */
  content_cut: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11.5" cy="11.5" r="1.5" fill={color} />
      <path d="M11.5 11.5L21.5 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11.5 11.5L20 19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6" cy="6.5" r="3.2" stroke={color} strokeWidth="2" fill={fill ? color : 'none'} />
      <path d="M8.5 8.5L11.5 11.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 15.5C4 13.5 5.5 12.5 7.5 12.5C9.5 12.5 10.5 14 10.5 16.5C10.5 19 8.5 20.5 6.5 20.5C4.5 20.5 4 17.5 4 15.5Z" stroke={color} strokeWidth="2" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Tailoring Thread Spool with layered winding lines & notched rim */
  thread: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 4C5 3.4 5.4 3 6 3H18C18.6 3 19 3.4 19 4V6H5V4Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M5 20C5 20.6 5.4 21 6 21H18C18.6 21 19 20.6 19 20V18H5V20Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <rect x="6.5" y="6" width="11" height="12" rx="1.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M6.5 8.5H17.5M6.5 11H17.5M6.5 13.5H17.5M6.5 16H17.5" stroke={fill ? '#fff' : color} strokeWidth="1.3" opacity="0.9" />
      <path d="M17.5 16C19 16.5 20.5 18 20 20C19.5 21.5 17 21 16 22" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),

  /** Direct-Drive Industrial Sewing Machine (Wheel, thread mast, needle bar, and bed) */
  dry_cleaning: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="18" width="20" height="3" rx="1" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M4 18V8C4 6.5 5.5 5.5 7 5.5H17.5C19 5.5 20 6.5 20 8V18" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill={fill ? color : 'none'} />
      <rect x="18.5" y="7" width="2.5" height="7" rx="1" fill={fill ? '#fff' : color} />
      <path d="M8 9H16V18H8V9Z" fill={fill ? 'var(--sf-bg-surface, #1e1e24)' : '#fff'} />
      <line x1="6.5" y1="9" x2="6.5" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.5 16H7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="5.5" x2="14" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="3" r="1" fill={color} />
    </svg>
  ),

  /** High-Speed Precision Manufacturing / Lockstitch Station */
  precision_manufacturing: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19h18" strokeWidth="2.2" />
      <path d="M5 19V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4h-5v7" fill={fill ? color : 'none'} />
      <circle cx="9" cy="11" r="2" fill={fill ? '#fff' : color} />
      <path d="M14 12v7" />
    </svg>
  ),

  /** Tailor's Tape Measure with brass clip & millimeter/inch graduation ticks */
  straighten: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="7" width="19" height="10" rx="2.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M2.5 7H5.5V17H2.5V7Z" fill={color} />
      <path d="M7.5 7V12M9.5 7V10M11.5 7V13M13.5 7V10M15.5 7V12M17.5 7V10M19.5 7V13" stroke={fill ? '#fff' : color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),

  /** Studio Rest Day — Tailor's Dimpled Thimble */
  spa: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 19C6.5 19 6 18.5 6.2 18L8.2 7.5C8.6 5.5 10.2 4 12 4C13.8 4 15.4 5.5 15.8 7.5L17.8 18C18 18.5 17.5 19 17 19H7Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 19H18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="9" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="8" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="14" cy="9" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="9.5" cy="12" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="11.5" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="14.5" cy="12" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="10" cy="15" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="14.5" r="0.8" fill={fill ? '#fff' : color} />
      <circle cx="14" cy="15" r="0.8" fill={fill ? '#fff' : color} />
    </svg>
  ),

  /** Contoured Wooden Suit Hanger */
  checkroom: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7a2.5 2.5 0 0 1 2.5-2.5c1.38 0 2.5 1.12 2.5 2.5 0 1.25-.8 2.2-1.9 2.45L12 10" />
      <path d="M12 10L2.5 16.5C1.8 17 2.2 18 3 18h18c.8 0 1.2-1 .5-1.5L12 10z" fill={fill ? color : 'none'} />
      <line x1="2" y1="18" x2="22" y2="18" strokeWidth="2" />
    </svg>
  ),

  /** Tailor's Dress Form Mannequin on Turn-Wood Tripod Stand */
  apparel: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8l1 4c0 3-2 5-2 8H9c0-3-2-5-2-8l1-4z" fill={fill ? color : 'none'} />
      <line x1="12" y1="15" x2="12" y2="21" strokeWidth="2" />
      <path d="M9 21l3-2 3 2" />
      <line x1="9" y1="7" x2="15" y2="7" strokeWidth="1.2" opacity="0.7" />
      <line x1="10" y1="11" x2="14" y2="11" strokeWidth="1.2" opacity="0.7" />
    </svg>
  ),

  /** Protective Garment Carrier Bag with window & zipper */
  inventory_2: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={fill ? color : 'none'} />
      <line x1="12" y1="4" x2="12" y2="18" strokeWidth="1.5" strokeDasharray="2 2" />
      <rect x="9" y="8" width="6" height="5" rx="1" fill={fill ? 'var(--sf-bg-surface, #1e1e24)' : '#fff'} />
      <circle cx="12" cy="3" r="1" fill={color} />
    </svg>
  ),

  /** Bolt of Woven Wool Fabric with visible selvedge edge */
  texture: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="6" cy="12" rx="3" ry="8" fill={fill ? color : 'none'} />
      <path d="M6 4h12c1.66 0 3 3.58 3 8s-1.34 8-3 8H6" fill={fill ? color : 'none'} />
      <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1.4" />
      <line x1="16" y1="4" x2="16" y2="20" strokeWidth="1.4" />
    </svg>
  ),

  /** Stacked Folds of Luxury Fabric Bolts */
  layers: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" fill={fill ? color : 'none'} />
      <polyline points="2 12 12 17 22 12" />
      <polyline points="2 17 12 22 22 17" />
    </svg>
  ),

  /** Atelier Fabric Color Swatch Fan / Artist Palette */
  palette: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 8 9 8 1.5 0 2.5-1 2.5-2.5 0-.7-.3-1.3-.7-1.8-.4-.5-.6-1.1-.6-1.7 0-1.4 1.1-2.5 2.5-2.5H17c2.76 0 5-2.24 5-5 0-4.42-4.48-6.5-10-6.5z" fill={fill ? color : 'none'} />
      <circle cx="7.5" cy="8.5" r="1.5" fill={color} />
      <circle cx="12" cy="6.5" r="1.5" fill={color} />
      <circle cx="16.5" cy="8.5" r="1.5" fill={color} />
      <circle cx="8" cy="13.5" r="1.5" fill={color} />
    </svg>
  ),

  /** Yardage & Fabric Cost Estimator */
  calculate: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" fill={fill ? color : 'none'} />
      <rect x="7" y="6" width="10" height="3.5" rx="1" fill={fill ? '#fff' : color} opacity="0.3" />
      <circle cx="8" cy="13" r="1" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="13" r="1" fill={fill ? '#fff' : color} />
      <circle cx="16" cy="13" r="1" fill={fill ? '#fff' : color} />
      <circle cx="8" cy="17" r="1" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="17" r="1" fill={fill ? '#fff' : color} />
      <circle cx="16" cy="17" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  // =========================================================================
  // 2. WORKSHOP ORDERS, FINANCE & RECEIPTS
  // =========================================================================

  /** Atelier Order Docket / Cutting Ticket */
  assignment: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="2" fill={fill ? color : 'none'} />
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" fill={color} />
      <line x1="8" y1="10" x2="16" y2="10" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="14" x2="14" y2="14" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  /** Order Intake Ticket with Plus Badge */
  assignment_add: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="17" rx="2.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M9 2H15C15.6 2 16 2.4 16 3V5H8V3C8 2.4 8.4 2 9 2Z" fill={color} />
      <line x1="8" y1="10" x2="16" y2="10" stroke={fill ? '#fff' : color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="13.5" x2="13" y2="13.5" stroke={fill ? '#fff' : color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4.5" fill={fill ? '#fff' : color} />
      <path d="M16 14V18M14 16H18" stroke={fill ? color : '#fff'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  /** Studio Cash Notes with Seal Watermark */
  payments: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="20" height="12" rx="2.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" stroke={fill ? '#fff' : color} strokeWidth="1.8" />
      <path d="M5.5 9.5H6.5M17.5 14.5H18.5" stroke={fill ? '#fff' : color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  /** Atelier POS Register Terminal */
  point_of_sale: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" fill={fill ? color : 'none'} />
      <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2" />
      <circle cx="7" cy="13" r="1" fill={color} />
      <circle cx="12" cy="13" r="1" fill={color} />
      <circle cx="17" cy="13" r="1" fill={color} />
      <circle cx="7" cy="16" r="1" fill={color} />
      <circle cx="12" cy="16" r="1" fill={color} />
      <circle cx="17" cy="16" r="1" fill={color} />
    </svg>
  ),

  /** Single Atelier Order Slip */
  receipt: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22l1-1V2H4z" fill={fill ? color : 'none'} />
      <line x1="8" y1="7" x2="16" y2="7" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="11" x2="16" y2="11" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="15" x2="12" y2="15" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  /** Itemized Atelier Bill of Quantities / Long Receipt */
  receipt_long: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2v20l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V2H5z" fill={fill ? color : 'none'} />
      <line x1="8" y1="6" x2="16" y2="6" stroke={fill ? '#fff' : color} strokeWidth="1.5" />
      <line x1="8" y1="10" x2="16" y2="10" stroke={fill ? '#fff' : color} strokeWidth="1.5" />
      <line x1="8" y1="14" x2="14" y2="14" stroke={fill ? '#fff' : color} strokeWidth="1.5" />
      <line x1="8" y1="17" x2="11" y2="17" stroke={fill ? '#fff' : color} strokeWidth="1.5" />
    </svg>
  ),

  /** Atelier Leather Wallet */
  account_balance_wallet: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="15" rx="3" fill={fill ? color : 'none'} />
      <path d="M2 9h20" />
      <circle cx="17.5" cy="14.5" r="1.5" fill={fill ? '#fff' : color} />
    </svg>
  ),

  /** Bank & Electronic Transfer Institution */
  account_balance: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 4L21 9.5H3Z" fill={fill ? color : 'none'} />
      <path d="M4 10V18M8 10V18M12 10V18M16 10V18M20 10V18" strokeWidth="1.8" />
      <path d="M2 18H22M1 21H23" strokeWidth="1.8" />
    </svg>
  ),

  /** Workshop Maintenance Tool / Spanner */
  build: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Atelier Order Dispatch / Logistics Van */
  local_shipping: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="14" height="11" rx="1.5" fill={fill ? color : 'none'} />
      <path d="M15 8h4.5l2.5 3v5h-7V8z" fill={fill ? color : 'none'} />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
    </svg>
  ),

  /** Payment Received / Inflow Diagonal Arrow */
  south_west: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <polyline points="15 19 5 19 5 9" />
    </svg>
  ),

  /** Expense Disbursed / Outflow Diagonal Arrow */
  north_east: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="9 5 19 5 19 15" />
    </svg>
  ),

  /** Atelier Boutique Storefront */
  storefront: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5v2a2 2 0 0 1-2 2v7H5v-7a2 2 0 0 1-2-2V9z" fill={fill ? color : 'none'} />
      <line x1="9" y1="13" x2="9" y2="21" stroke={fill ? '#fff' : color} />
      <line x1="15" y1="13" x2="15" y2="21" stroke={fill ? '#fff' : color} />
      <line x1="3" y1="9" x2="21" y2="9" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  /** Workshop Cutting Checklist */
  checklist: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6h11M10 12h11M10 18h11" strokeWidth="2.2" />
      <path d="M3 6.5l1.5 1.5L8 4M3 12.5l1.5 1.5L8 10M3 18.5l1.5 1.5L8 16" strokeWidth="2.2" />
    </svg>
  ),

  /** Workshop Kanban Pipeline Columns (Cutting, Sewing, Ready) */
  view_kanban: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 7v10M12 7v6M16 7v8" strokeWidth="2.2" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Atelier Chalk Notes */
  notes: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" fill={fill ? color : 'none'} />
      <line x1="7" y1="9" x2="17" y2="9" stroke={fill ? '#fff' : color} />
      <line x1="7" y1="13" x2="14" y2="13" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  /** Pinned Fitting Adjustment Slip */
  sticky_note_2: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l6-6V5a2 2 0 0 0-2-2z" fill={fill ? color : 'none'} />
      <path d="M14 21v-6h6" />
      <line x1="7" y1="9" x2="13" y2="9" stroke={fill ? '#fff' : color} />
      <line x1="7" y1="13" x2="11" y2="13" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  /** Unlinked Payment Method */
  credit_card_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
      <path d="M7 5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-.58 1.41M18 19H4a2 2 0 0 1-2-2V7c0-.53.21-1.02.56-1.38" />
      <line x1="2" y1="10" x2="12" y2="10" />
    </svg>
  ),

  // =========================================================================
  // 3. MILESTONES, URGENCY & BADGES
  // =========================================================================

  /** Equipment Grant Trophy with measuring tape ribbons */
  emoji_events: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 21H17M12 17V21" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 3H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V3Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" />
      <path d="M6 5H3.5C2.7 5 2 5.7 2 6.5V7C2 9.2 3.8 11 6 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 5H20.5C21.3 5 22 5.7 22 6.5V7C22 9.2 20.2 11 18 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <polygon points="12 6.5 13 8.5 15.2 8.8 13.6 10.3 14 12.5 12 11.5 10 12.5 10.4 10.3 8.8 8.8 11 8.5 12 6.5" fill={fill ? '#fff' : color} />
    </svg>
  ),

  /** Craft Competition Podium */
  leaderboard: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H8V21H3V12Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M9.5 6H14.5V21H9.5V6Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <path d="M16 15H21V21H16V15Z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="3" r="1.2" fill={color} />
    </svg>
  ),

  /** Artisan Wax Stamp Checkmark */
  task_alt: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" />
      <path d="M8 12.5L11 15.5L16.5 9" stroke={fill ? '#fff' : color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  /** Fast-Stitch Speed Needle Lightning Bolt */
  bolt: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="13.5 1.5 3.5 13.5 12 13.5 10.5 22.5 21.5 9.5 13 9.5 13.5 1.5" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),

  /** Brilliant Cut Diamond Gem Stone */
  diamond: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M2 9H22M12 22L7.5 9M12 22L16.5 9M6 3L7.5 9M18 3L16.5 9" stroke={fill ? '#fff' : color} strokeWidth="1.2" opacity="0.8" />
    </svg>
  ),

  /** Atelier Rush Order Flame (Urgent Delivery) */
  local_fire_department: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1 3.5 3.5 5 5 7.5 1.5 2.5 1.5 5.5 0 8s-4 3.5-5 3.5-3.5-1-5-3.5-1.5-5.5 0-8c1.5-2.5 4-4 5-7.5z" fill={fill ? color : 'none'} />
      <path d="M12 14c-.8 0-1.5.7-1.5 1.5 0 1.2 1.5 2.5 1.5 2.5s1.5-1.3 1.5-2.5c0-.8-.7-1.5-1.5-1.5z" fill={fill ? '#fff' : color} />
    </svg>
  ),

  /** Atelier Overdue Deadline Alert */
  running_with_errors: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M8 22l3-6 2 2v4" />
      <path d="M5 14l3-2 3 2 4-3" />
      <circle cx="19" cy="11" r="3" strokeWidth="2" />
      <line x1="19" y1="10" x2="19" y2="12" strokeWidth="2" />
    </svg>
  ),

  /** Order & Fitting History (Clock with rewind arrow) */
  history: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill={fill ? color : 'none'} />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 15" strokeWidth="2" />
    </svg>
  ),

  /** Pocket Countdown Timer */
  schedule: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8.5" fill={fill ? color : 'none'} />
      <polyline points="12 9 12 13 15 15" stroke={fill ? '#fff' : color} strokeWidth="2" />
      <line x1="12" y1="2" x2="12" y2="4.5" strokeWidth="2" />
    </svg>
  ),

  /** Sand Hourglass Measuring Fitting Appointments */
  hourglass_empty: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h14M5 22h14" strokeWidth="2" />
      <path d="M6 2v6a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2M6 22v-6a6 6 0 0 1 6-6 6 6 0 0 1 6 6v6" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Master Tailor Medal with Ribbon Sash */
  workspace_premium: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" fill={fill ? color : 'none'} />
      <polygon points="12 4.5 13 7 15.5 7 13.5 8.5 14.5 11 12 9.5 9.5 11 10.5 8.5 8.5 7 11 7 12 4.5" fill={fill ? '#fff' : color} />
      <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
    </svg>
  ),

  /** Hand-Stitched 5-Point Star */
  star: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Cluster of Artisan Stars */
  stars: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 14 7 19 8 15 12 16 17 12 14.5 8 17 9 12 5 8 10 7 12 2" fill={fill ? color : 'none'} />
      <polygon points="4 16 5 18 7 18.5 5.5 20 6 22 4 21 2 22 2.5 20 1 18.5 3 18 4 16" fill={fill ? color : 'none'} />
      <polygon points="20 16 21 18 23 18.5 21.5 20 22 22 20 21 18 22 18.5 20 17 18.5 19 18 20 16" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Scalloped Artisan Certification Badge */
  verified: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l2.4 2.1 3.2-.4 1.4 2.9 3 1.1-.3 3.2 2 2.5-2 2.5.3 3.2-3 1.1-1.4 2.9-3.2-.4L12 22l-2.4-2.1-3.2.4-1.4-2.9-3-1.1.3-3.2-2-2.5 2-2.5-.3-3.2 3-1.1 1.4-2.9 3.2.4L12 2z" fill={fill ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke={fill ? '#fff' : color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  /** Artisan Shield Badge */
  verified_user: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={fill ? color : 'none'} />
      <path d="m9 12 2 2 4-4" stroke={fill ? '#fff' : color} strokeWidth="2" />
    </svg>
  ),

  /** Craft Magic Embroidery Starbursts */
  auto_awesome: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" fill={fill ? color : 'none'} />
    </svg>
  ),

  /** Five-Star Client Feedback Badge */
  reviews: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
      <polygon points="12 6.5 13 8.5 15.2 8.8 13.6 10.3 14 12.5 12 11.5 10 12.5 10.4 10.3 8.8 8.8 11 8.5 12 6.5" fill={fill ? '#fff' : color} />
    </svg>
  ),

  /** Atelier Productivity & Performance Monitor */
  monitoring: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M19 9l-5 5-4-4-3 3" />
    </svg>
  ),

  /** Volume Column Bars */
  bar_chart: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  ),

  /** Ascending Growth Arrow */
  trending_up: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),

  /** Descending Trend Arrow */
  trending_down: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  ),

  // =========================================================================
  // 4. NAVIGATION, CHEVRONS & ACTIONS
  // =========================================================================

  menu: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),

  close: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  arrow_back: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),

  arrow_forward: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),

  arrow_downward: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),

  arrow_upward: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),

  arrow_forward_ios: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 4 16 12 8 20" />
    </svg>
  ),

  chevron_left: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),

  chevron_right: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),

  expand_more: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),

  expand_less: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),

  add: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  add_box: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" fill={fill ? color : 'none'} />
      <line x1="12" y1="8" x2="12" y2="16" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="12" x2="16" y2="12" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  add_circle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <line x1="12" y1="8" x2="12" y2="16" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="12" x2="16" y2="12" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  remove: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  check: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  check_circle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <path d="m8 12 3 3 6-6" stroke={fill ? '#fff' : color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  done_all: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 6 9 17 4 12" />
      <polyline points="22 10 13 21 11 19" />
    </svg>
  ),

  radio_button_unchecked: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),

  undo: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7 3 13 9 13" />
      <path d="M3 13a9 9 0 0 1 15-4 9 9 0 0 1 0 13" />
    </svg>
  ),

  drag_indicator: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="6" r="1.5" fill={color} />
      <circle cx="15" cy="6" r="1.5" fill={color} />
      <circle cx="9" cy="12" r="1.5" fill={color} />
      <circle cx="15" cy="12" r="1.5" fill={color} />
      <circle cx="9" cy="18" r="1.5" fill={color} />
      <circle cx="15" cy="18" r="1.5" fill={color} />
    </svg>
  ),

  open_in_new: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),

  ios_share: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  ),

  share: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" fill={fill ? color : 'none'} />
      <circle cx="6" cy="12" r="3" fill={fill ? color : 'none'} />
      <circle cx="18" cy="19" r="3" fill={fill ? color : 'none'} />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),

  send: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill={fill ? color : 'none'} />
    </svg>
  ),

  download: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),

  upload: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),

  print: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" fill={fill ? color : 'none'} />
      <rect x="6" y="14" width="12" height="8" rx="1" fill={fill ? '#fff' : 'none'} />
    </svg>
  ),

  picture_as_pdf: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={fill ? color : 'none'} />
      <polyline points="14 2 14 8 20 8" />
      <text x="7" y="16" fontSize="5" fontWeight="bold" fill={fill ? '#fff' : color} stroke="none">PDF</text>
    </svg>
  ),

  edit: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),

  delete: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),

  content_copy: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" fill={fill ? color : 'none'} />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),

  // =========================================================================
  // 5. PEOPLE, COMMUNICATION & LOOKBOOK
  // =========================================================================

  person: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill={fill ? color : 'none'} />
      <circle cx="12" cy="7" r="4" fill={fill ? color : 'none'} />
    </svg>
  ),

  person_add: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill={fill ? color : 'none'} />
      <circle cx="8.5" cy="7" r="4" fill={fill ? color : 'none'} />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),

  person_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M17 17a4 4 0 0 1-5 0M9 9a4 4 0 0 1 5.66-3.66M4.5 19.5A4 4 0 0 1 8 17h4a4 4 0 0 1 3.5 2" />
    </svg>
  ),

  group: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" fill={fill ? color : 'none'} />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" fill={fill ? color : 'none'} />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),

  group_add: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill={fill ? color : 'none'} />
      <circle cx="9" cy="7" r="4" fill={fill ? color : 'none'} />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),

  handshake: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 17l-4 4-5-5 7-7" />
      <path d="M13 7l4-4 5 5-7 7" />
      <path d="M9 11l4 4" />
      <path d="M7 13l2 2" />
      <path d="M13 7l2 2" />
    </svg>
  ),

  chat: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
    </svg>
  ),

  chat_bubble: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill={fill ? color : 'none'} />
    </svg>
  ),

  forum: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
      <path d="M17 17v2a2 2 0 0 1-2 2H6l-3 3V8a2 2 0 0 1 2-2h1" />
    </svg>
  ),

  call: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill={fill ? color : 'none'} />
    </svg>
  ),

  contact_phone: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" fill={fill ? color : 'none'} />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5 17c0-2 2-3 4-3s4 1 4 3" />
      <path d="M16 9v6m3-3h-6" />
    </svg>
  ),

  campaign: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12a7 7 0 0 0-7-7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h5a7 7 0 0 0 7-5z" fill={fill ? color : 'none'} />
      <path d="M7 15v4a2 2 0 0 0 2 2h1" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="20" y1="8" x2="22" y2="7" />
      <line x1="20" y1="16" x2="22" y2="17" />
    </svg>
  ),

  photo_library: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" fill={fill ? color : 'none'} />
      <circle cx="8" cy="8" r="1.5" />
      <path d="M17 12l-4-4-6 6" />
      <path d="M7 21h12a2 2 0 0 0 2-2V7" />
    </svg>
  ),

  image: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),

  add_a_photo: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
      <circle cx="12" cy="13" r="4" />
      <line x1="12" y1="11" x2="12" y2="15" strokeWidth="2" />
      <line x1="10" y1="13" x2="14" y2="13" strokeWidth="2" />
    </svg>
  ),

  photo_camera: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
      <circle cx="12" cy="13" r="4" fill={fill ? color : 'none'} />
    </svg>
  ),

  add_photo_alternate: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" fill={fill ? color : 'none'} />
      <circle cx="7" cy="7" r="1.2" />
      <polyline points="15 12 11 8 4 15" />
      <path d="M7 21h12a2 2 0 0 0 2-2V7" />
      <line x1="19" y1="11" x2="19" y2="17" strokeWidth="2" />
      <line x1="16" y1="14" x2="22" y2="14" strokeWidth="2" />
    </svg>
  ),

  broken_image: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M14 3l-3 5 4 4-3 5 2 4" strokeWidth="2" />
    </svg>
  ),

  collections: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="14" height="14" rx="2" fill={fill ? color : 'none'} />
      <circle cx="12" cy="8" r="1.5" />
      <path d="M21 13l-4-4-6 6" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </svg>
  ),

  collections_bookmark: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="14" height="14" rx="2" fill={fill ? color : 'none'} />
      <path d="M17 3v7l-2.5-1.5L12 10V3" fill={color} />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </svg>
  ),

  bookmark: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={fill ? color : 'none'} />
    </svg>
  ),

  flag: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={fill ? color : 'none'} />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),

  auto_stories: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6s3-2 6-2 6 2 6 2v14s-3-2-6-2-6 2-6 2V6z" fill={fill ? color : 'none'} />
      <path d="M22 6s-3-2-6-2-6 2-6 2v14s3-2 6-2 6 2 6 2V6z" fill={fill ? color : 'none'} />
    </svg>
  ),

  menu_book: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={fill ? color : 'none'} />
    </svg>
  ),

  favorite: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={fill ? color : 'none'} />
    </svg>
  ),

  // =========================================================================
  // 6. SYSTEM, CONNECTIVITY, SECURITY & THEME
  // =========================================================================

  settings: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill={fill ? color : 'none'} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),

  tune: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" strokeWidth="2.5" />
      <line x1="9" y1="8" x2="15" y2="8" strokeWidth="2.5" />
      <line x1="17" y1="16" x2="23" y2="16" strokeWidth="2.5" />
    </svg>
  ),

  apps: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={fill ? color : 'none'} />
    </svg>
  ),

  lock: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill={fill ? color : 'none'} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),

  lock_open: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill={fill ? color : 'none'} />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),

  lock_reset: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="11" width="12" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0" />
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  ),

  logout: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),

  search: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),

  search_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),

  notifications: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={fill ? color : 'none'} />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),

  notifications_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),

  notification_important: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={fill ? color : 'none'} />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2.5" />
      <circle cx="12" cy="14.5" r="0.7" fill={color} />
    </svg>
  ),

  cloud_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 2 20 20" />
      <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.954-.446" />
      <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
    </svg>
  ),

  cloud_sync: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="M12 12l2-2m0 0l2 2m-2-2v5" strokeWidth="2" />
    </svg>
  ),

  wifi: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
    </svg>
  ),

  visibility: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  visibility_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),

  dark_mode: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={fill ? color : 'none'} />
    </svg>
  ),

  light_mode: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" fill={fill ? color : 'none'} />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),

  contrast: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20z" fill={color} />
    </svg>
  ),

  toggle_on: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" fill={fill ? color : 'none'} />
      <circle cx="16" cy="12" r="4" fill={fill ? '#fff' : color} />
    </svg>
  ),

  smartphone: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2.5" fill={fill ? color : 'none'} />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
    </svg>
  ),

  home: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10L12 3L20 10V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V10Z" fill={fill ? color : 'none'} />
      <path d="M9 21V12H15V21" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  dashboard: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="14" y="3" width="7" height="5" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="14" y="12" width="7" height="9" rx="1.5" fill={fill ? color : 'none'} />
      <rect x="3" y="16" width="7" height="5" rx="1.5" fill={fill ? color : 'none'} />
    </svg>
  ),

  cake: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" fill={fill ? color : 'none'} />
      <path d="M4 21h16" strokeWidth="2" />
      <path d="M4 16c2 1 4-1 6 0s4-1 6 0" />
      <line x1="12" y1="7" x2="12" y2="11" strokeWidth="2" />
      <circle cx="12" cy="4.5" r="1" fill={color} />
    </svg>
  ),

  event: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  event_note: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
      <line x1="7" y1="14" x2="12" y2="14" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  event_busy: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="15" y1="14" x2="9" y2="18" strokeWidth="2" />
      <line x1="9" y1="14" x2="15" y2="18" strokeWidth="2" />
    </svg>
  ),

  calendar_month: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
      <circle cx="8" cy="14" r="1" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="14" r="1" fill={fill ? '#fff' : color} />
      <circle cx="16" cy="14" r="1" fill={fill ? '#fff' : color} />
      <circle cx="8" cy="18" r="1" fill={fill ? '#fff' : color} />
      <circle cx="12" cy="18" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  calendar_today: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
      <rect x="7" y="13" width="4" height="4" rx="0.5" fill={fill ? '#fff' : color} />
    </svg>
  ),

  date_range: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
      <line x1="7" y1="14" x2="17" y2="14" stroke={fill ? '#fff' : color} strokeWidth="2.5" />
    </svg>
  ),

  warning: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={fill ? color : 'none'} />
      <line x1="12" y1="9" x2="12" y2="13" stroke={fill ? '#fff' : color} strokeWidth="2.5" />
      <circle cx="12" cy="17" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  priority_high: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <line x1="12" y1="7" x2="12" y2="13" stroke={fill ? '#fff' : color} strokeWidth="2.5" />
      <circle cx="12" cy="17" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  error: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <line x1="12" y1="8" x2="12" y2="12" stroke={fill ? '#fff' : color} strokeWidth="2.5" />
      <circle cx="12" cy="16" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  info: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <line x1="12" y1="16" x2="12" y2="12" stroke={fill ? '#fff' : color} strokeWidth="2.5" />
      <circle cx="12" cy="8" r="1" fill={fill ? '#fff' : color} />
    </svg>
  ),

  front_hand: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a1.5 1.5 0 0 0-3 0v4a1.5 1.5 0 0 0-3 0V4a1.5 1.5 0 0 0-3 0v6a1.5 1.5 0 0 0-3 0V7.5a1.5 1.5 0 0 0-3 0v7.5a7 7 0 0 0 7 7h2a7 7 0 0 0 7-7v-4a1.5 1.5 0 0 0-3 0z" fill={fill ? color : 'none'} />
    </svg>
  ),

  location_on: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill={fill ? color : 'none'} />
      <circle cx="12" cy="10" r="3" fill={fill ? '#fff' : 'none'} />
    </svg>
  ),

  radar: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill={color} />
      <line x1="12" y1="12" x2="19" y2="5" strokeWidth="2" />
    </svg>
  ),

  progress_activity: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.6" />
    </svg>
  ),

  all_inclusive: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.26-8-12.355-8-5.096 0-5.096 8 0 8 5.095 0 7.26-8 12.355-8z" />
    </svg>
  ),

  engineering: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={fill ? color : 'none'} />
      <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M10 2h4" strokeWidth="2.5" />
    </svg>
  ),
};
