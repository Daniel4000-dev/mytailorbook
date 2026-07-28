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
} as const;
