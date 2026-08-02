/** Toggles which UI surfaces are shown to tailors. Every feature below is
 *  fully built and working — flipping a flag to `true` reveals it again
 *  with no other code changes needed. Nothing listed here is deleted,
 *  only conditionally rendered. */
export const FEATURE_FLAGS = {
  costMarginTracking: false,
  profilePictures: false,
  customerAddress: false,
  trackingPageReminder: false,
  financialReporting: false,
  stylePhotoApprovalNotification: false,
  dataExport: false,
  auditLog: false,
  photoConsentTracking: false,
  orgBranchMultiTenancy: false,
  /** The schematic body-diagram guide above a style's measurement list —
   *  hidden until it's replaced with proper per-style illustrations. */
  measureGuideDiagram: false,
  /** Lets a customer have a DIFFERENT saved measurement snapshot per
   *  garment style (customer.styleMeasurements), distinct from their one
   *  body profile (customer.measurements) — e.g. different "Agbada"
   *  numbers than their general body profile. While this stays false, the
   *  garment-style measurement screen and the order wizard/edit sheet all
   *  read and write the customer's single body profile instead, so the
   *  customer profile, the garment-style screen, and every order all show
   *  the same numbers. The per-style storage/actions
   *  (updateCustomerStyleProfileAction, StyleProfileSheet, etc.) stay
   *  fully in place underneath — flipping this to true re-enables the
   *  split with no further code changes. */
  perStyleMeasurements: false,
} as const;
