<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mandatory AI Engineering & Testing Protocol

This repository enforces strict operational rules for ALL AI assistants (Antigravity, Cursor, GitHub Copilot, Claude Code, and other LLM agents) working on the MyTailorBook codebase.

## 1. Mandatory Component Mount & Integration Testing for All Features and Fixes

Whenever you build a new feature, fix a bug, or modify any user interface component (pages, modals, bottom sheets, drawers, action dialogs, wizards, or cards):
- **NEVER rely solely on pure unit tests of isolated logic functions.** Unit tests on utility functions alone (such as string formatters or regex checkers) do NOT catch runtime DOM rendering crashes, prop desynchronization, context provider crashes, or button event failure.
- **You MUST write or update component mount integration tests** using Vitest (`environment: 'happy-dom'`) and `@testing-library/react`.
- **Three Data States are Required:** Every UI test suite must mount and verify the component under:
  1. **Rich / Full Data:** All fields populated (photos, full customer records, detailed measurements, active stage histories, priority flags).
  2. **Sparse / Minimal Data:** Minimal viable records (missing images, unassigned staff, blank notes, unselected style profiles, empty measurements).
  3. **Edge-Case / Corrupted Data:** Missing optional fields, unhandled status values, malformed inputs (incomplete phone numbers, unparseable numbers).
- **Interactive Verification:** Test actual DOM actions (`fireEvent.click`, `fireEvent.change`, form submissions) and assert that callbacks, route dispatches, and validation error messages trigger correctly.
- **Context Wrapping:** Always wrap mounted components with required context providers (e.g., `<ToastProvider>`, `<DataContext>`, or mock providers) to verify that context consumers execute safely.

## 2. Complete Application Architecture & Bespoke Verification Catalog

All alterations, features, and bug fixes across MyTailorBook must verify compatibility across the entire operational ecosystem. The application is organized across 10 functional domains and 62 distinct routes:

### Complete Route Catalog (62 Routes)
1. **Tailoring Workshop Core (8 routes):**
   - `/dashboard`: Primary workshop dashboard, KPI metrics, rapid customer intake, and Cutting Table quick action.
   - `/fabrics`: Dedicated Cutting Table, cloth shears queue, bolt allocation, yardage consumption, and urgency flags.
   - `/orders/new`: Unified bespoke intake wizard (multi-step client selection, style profile, measurements, down payment, receipt generation).
   - `/production`: Workshop Kanban board (Documented, Cutting, Sewing, Fitting/Ready, Delivered).
   - `/production/[orderId]`: Comprehensive workshop dossier, stage progression, cutter assignment, cutting slip modal, spec tabs.
   - `/customers`: Comprehensive client directory, search, tier filters, VIP indicators.
   - `/customers/[id]`: 360-degree client file (measurement history snapshots, style profile preferences, posture/anatomy adjustments).
   - `/calendar`: Appointment scheduler, fitting slots, garment try-on sessions, fitting verdicts.

2. **Stockroom & Inventory (2 routes):**
   - `/inventory`: Materials stockroom (fabric bolts, satin linings, interfacing/canvas, thread cones, invisible zippers, restock alerts).
   - `/stock`: Rapid stock tally, material audits, low-stock notifications.

3. **Financials, Sales & Expenses (4 routes):**
   - `/reconciliation`: Daily payment settlements, cash drawer reconciliations, POS terminal verifications.
   - `/reports`: Executive financial insights, revenue vs expense breakdown, garment category velocity.
   - `/collections`: Outstanding debt collections, overdue customer balances, payment plan tracking.
   - `/quotes`: Bespoke price estimations, yardage calculators, quote sharing and approval.

4. **Portfolio, Outfits & Catalogues (5 routes):**
   - `/portfolio`: Visual showcase, client lookbooks, finished garment galleries.
   - `/catalogues`: Custom digital catalogues and seasonal collections.
   - `/catalogues/[catalogueId]`: Dedicated catalogue collection manager and pricing rules.
   - `/styles`: Global style catalog (Senator suits, Agbada, Kaftan, Safari, 2-piece sets).
   - `/styles/[styleName]`: Style specification, fabric recommendations, standard measurement points.

5. **Settings & Workshop Configuration (11 routes):**
   - `/settings`: Settings navigation hub.
   - `/settings/account`: User identity, password, security credentials.
   - `/settings/activity`: Audit log of workshop actions, stage transitions, deletions.
   - `/settings/billing`: Subscription management, invoice history, workshop tiers.
   - `/settings/messages`: WhatsApp, SMS, and automated client notification templates.
   - `/settings/portfolio`: Outfit builder, angle curation (Front, Back, Side, Detail), story mode publishing.
   - `/settings/reports`: Custom report scheduling, automated weekly summaries.
   - `/settings/size-charts`: Standardized garment sizing matrices and brand grading.
   - `/settings/staff`: Staff administration, roles (Cutter, Machinist, Finisher), and automated piece-rate payroll runs.
   - `/settings/studio`: Public studio profile, brand colors, typography, currency preferences.
   - `/settings/styles`: Workshop style profile defaults and measurement requirements.

6. **Administration & Platform Governance (8 routes):**
   - `/admin`: Superadmin system dashboard.
   - `/admin/active-users`: Platform session tracking and active workshop metrics.
   - `/admin/activity`: Global activity telemetry.
   - `/admin/affiliates`: Referral partner tracking and commission settlement.
   - `/admin/broadcasts`: Global push notices and announcements.
   - `/admin/organizations`: Tenant directory and enterprise accounts.
   - `/admin/organizations/[id]`: Multi-branch organization drill-down.
   - `/admin/settings`: Global feature flags and system configurations.

7. **Collaboration & Operational Utilities (3 routes):**
   - `/circle`: Tailor network, community sharing, peer artisan advice.
   - `/notes`: Workshop scratchpad, quick cloth specs, chalk notes.
   - `/notifications`: Real-time alerts (stage progressions, urgent cutter queues, fitting reminders, payments).

8. **Public Storefronts & Client Portals (7 routes):**
   - `/studio/[slug]`: Public artisan digital storefront, brand portfolio, booking inquiry.
   - `/catalogue/[slug]`: Public client-facing style lookbook.
   - `/track/[orderId]`: Customer live order tracking portal (stage timeline, order details, direct WhatsApp artisan link).
   - `/receipt/[orderId]`: Digital receipts with printable slips and graphic share cards.
   - `/portfolio-examples`: Curated bespoke showcases.
   - `/blog`: Bespoke tailoring guides, fabric knowledge, fashion journalism.
   - `/blog/[slug]`: Long-form styling and tailoring articles.

9. **Authentication & Onboarding (5 routes):**
   - `/login`: Secure user authentication.
   - `/signup`: New workshop registration.
   - `/forgot-password`: Password recovery request.
   - `/reset-password`: Token-based credential reset.
   - `/onboarding`: Multi-step interactive workshop wizard (studio name, currency, first garment, size charts).

10. **Marketing, Static & Utility (9 routes):**
    - `/`: Modern bespoke marketing landing page.
    - `/about`, `/contact`, `/features`, `/pricing`, `/privacy`, `/terms`, `/offline`, `/test-suite`.

---

### Interactive Modals, Drawers & Sheets Catalog
Every interactive surface in this catalog must be covered by integration tests simulating Rich, Sparse, and Edge-Case data states:
- **Core Intake & Cutting:**
  - `CuttingSlipModal`: Workshop cutting slip generation with measurements and yardage.
  - `FabricDetailSheet`: Fabric swatch review, urgent cutter queue, and stage progression.
  - `OrderMeasurementsSheet`: Quick adjustment and order-specific measurement correction.
  - `UnifiedNewOrderForm`: Multi-step order creation, customer linking, and digital receipt generation.
- **Client & Payment Settlements:**
  - `HandoverPaymentSheet`: Final delivery payment settlement (single and split payments).
  - `WhatsAppOptionsSheet`: Customer WhatsApp progress updates and event photo requests.
  - `ScheduleFittingPromptModal`: Appointment scheduling for garment fittings.
  - `AddCustomerSheet` & `EditCustomerSheet`: Customer intake with strict international/Nigerian phone validation.
  - `StyleProfileSheet`: Style profile and garment measurement template management.
  - `MeasurementHistorySheet`: Historical measurement snapshot comparison and restoration.
- **Workshop Operations & Administration:**
  - `FittingVerdictModal`: Chalk pinning, alterations recording, and fit sign-off.
  - `InventoryDetailSheet`: Material addition/updating, stock quantity steppers, and restock alert levels.
  - `RunPayrollSheet`: Auto-computation of team payout for salary and piece-rate based on completed orders.
  - `OutfitBuilder`: Portfolio pool photo selection, angle tagging (Front, Back, Side, Detail), and story mode publishing.
  - `NotificationDetailSheet`: Notification category filtering, read status, and workshop order navigation dispatch.

## 3. Strict Development Constraints

- **No Emojis:** Do NOT use emojis anywhere in source code, component copy, commit messages, or replies (unless explicitly instructed for a specific system reminder header). Keep all UI clean, professional, and refined.
- **Forbidden Terminology:** Never use the words "atelier" or "specialist embellishment" in copy, code, or documentation. Use "workshop", "tailor shop", "craft room", or "beading / embroidery artisan".
- **Git Branch Target:** Always commit and push exclusively to the `staging` branch (`git push origin staging`). NEVER merge directly into `main`.
- **Pre-Commit Verification:** Run `npx tsc --noEmit` and `npm run test:unit` before committing any code changes. Ensure zero type errors and zero test failures.

