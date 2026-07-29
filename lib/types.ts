/* ============================================================
   SabiTailors Type Definitions
   ============================================================
   All shared TypeScript types and interfaces.
   ============================================================ */

export type Role = 'OrgAdmin' | 'BranchManager' | 'Staff' | 'Accountant';

/** OrgAdmin and BranchManager get every owner-level privilege the app's UI
 *  already gates behind `isOwner` — this is the one place that equivalence
 *  is defined, so every existing `isOwner` call site keeps its current
 *  meaning without being touched individually. */
export function isOwnerLikeRole(role: Role | undefined): boolean {
  return role === 'OrgAdmin' || role === 'BranchManager';
}

export interface Organization {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  ownerUid: string;
  createdAt: string;
  orgId: string;
  isPrimary: boolean;
  /** Shop-defined one-off garment styles beyond the built-in catalog —
   *  remembered across future orders once created, same as built-in styles.
   *  `measurementFields` is the shop's own named+ordered field list for
   *  this style (set via the field builder); absent/empty means the style
   *  still falls back to the generic DEFAULT_MEASURE_SPEC. */
  customStyles?: { name: string; photoUrl?: string; measurementFields?: { id: string; label: string }[] }[];
  /** Shown on receipts and the public portfolio, replacing the plain text
   *  name there once set. */
  logoUrl?: string;
  /** Prefills the "Reach Out" composer on the Customers page. Supports a
   *  {name} placeholder. Falls back to a generic default when unset. */
  outreachTemplate?: string;
  /** Per-stage WhatsApp update wording, keyed by OrderStatus. A missing key
   *  means "use the app's built-in default" (see getOrderProgressMessage). */
  stageMessageTemplates?: Partial<Record<OrderStatus, string>>;
  /** Which of the 3 visual templates the public portfolio (/studio/[shopId])
   *  renders. 'modern' is the original bento-grid design, kept as the default
   *  so existing shops see no change until they pick something else. */
  portfolioTemplate: 'modern' | 'editorial' | 'heritage';
  /** A curated palette id (e.g. 'indigo', 'coral', 'terracotta') — not a raw
   *  hex — so a non-technical owner can't land on an unreadable combination. */
  portfolioAccent: string;
  /** Free-form portfolio copy: tagline, bio/story, founding year. Absent keys
   *  fall back to no display of that element, not a placeholder string. */
  portfolioSettings: { tagline?: string; bio?: string; foundedYear?: number };
}

/** Owner-set visibility override for one photo (matched by URL) on the
 *  public portfolio — photos otherwise show automatically from order
 *  history with no curation. */
export interface PortfolioPhotoOverride {
  id: string;
  shopId: string;
  photoUrl: string;
  hidden: boolean;
  featured: boolean;
  consentConfirmed: boolean;
  consentConfirmedAt?: string;
  /** Owner-entered story/caption shown under the photo on the public
   *  portfolio — the fix for the gallery having no storytelling. */
  caption?: string;
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
  orgId: string;
  active?: boolean; // undefined/true = active, false = deactivated
  avatarUrl?: string;
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
  /** Custom garment styles collect their own shop-defined field keys
   *  (see lib/constants.ts buildCustomStyleSpec) — these don't have a
   *  fixed name on this interface, so an arbitrary key must be allowed
   *  alongside the fixed body-measurement fields above. */
  [key: string]: number | string | undefined;
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
  address?: string;
  createdAt: string;
}

/** A photo submitted for one of the built-in garment styles — either
 *  `pending` (visible shop-wide, awaiting the Owner's approve/discard) or
 *  `saved` (approved into the Owner's private outreach gallery). */
export interface StylePhotoSubmission {
  id: string;
  shopId: string;
  styleName: string;
  photoUrl: string;
  storagePath: string;
  status: 'pending' | 'saved';
  uploadedBy: string;
  uploadedByName: string;
  savedBy?: string;
  createdAt: string;
  savedAt?: string;
}

/** One outreach message sent (via the native share sheet) to a customer
 *  about a given style — powers the "Reached out X ago" badge. */
export interface OutreachLogEntry {
  id: string;
  shopId: string;
  customerId: string;
  styleName: string;
  contactedBy: string;
  contactedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: Record<string, unknown> | null;
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
  /** The garment style picked at intake (from the built-in/custom styles
   *  catalog) — persisted so cost data can eventually be aggregated per
   *  style, not just entered per order. */
  styleName?: string;
  materialSuppliedBy?: 'shop' | 'customer';
  materialCost?: number;
  otherCosts?: number;
  /** When a customer last clicked "Send a reminder" on the public tracking
   *  page — rate-limited server-side to once per calendar day per order. */
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Computed field — not stored, derived at read time */
export function getBalanceOwed(order: Order): number {
  return order.totalBill - order.depositPaid;
}

/** True once at least one cost figure has actually been entered — guards
 *  against a blank/zero cost silently reading as "100% margin". */
export function hasCostData(order: Order): boolean {
  return (order.materialCost || 0) > 0 || (order.otherCosts || 0) > 0;
}

/** Computed field — not stored, derived at read time. Only meaningful
 *  once hasCostData(order) is true. */
export function getMargin(order: Order): number {
  return order.totalBill - (order.materialCost || 0) - (order.otherCosts || 0);
}

/** True when a customer comment arrived that no one at the shop has opened yet. */
export function hasUnreadComment(order: Order): boolean {
  if (!order.lastCommentAt) return false;
  if (!order.commentsSeenAt) return true;
  return new Date(order.lastCommentAt) > new Date(order.commentsSeenAt);
}

/** The tracking-page "Send a reminder" button is rate-limited to once per
 *  calendar day per order — compares UTC date strings rather than a rolling
 *  24h window, so "today" means the same thing here as it does elsewhere
 *  in the app (e.g. the dashboard's "due today" tile). */
export function canSendReminder(order: Pick<Order, 'lastReminderAt'>): boolean {
  if (!order.lastReminderAt) return true;
  const todayStr = new Date().toISOString().split('T')[0];
  const lastStr = new Date(order.lastReminderAt).toISOString().split('T')[0];
  return lastStr !== todayStr;
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
