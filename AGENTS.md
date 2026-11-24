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

## 2. Bespoke Workflow Verification Catalog

All alterations to the bespoke tailoring workflow must verify compatibility across the complete suite of bespoke surfaces:
- **Routes:** `/dashboard` (Cutting Table quick action), `/fabrics` (Cutting Table shears queue), `/orders/new` (Unified intake wizard), `/production` (Kanban workshop board), `/production/[orderId]` (Workshop dossier, stage selector, cutting slip, spec tabs), `/customers` (Client directory), `/customers/[id]` (Measurement history, style profiles, anatomy), `/track/[orderId]` (Customer live tracking portal), `/receipt/[orderId]` (Digital receipts).
- **Modals, Drawers & Sheets:**
  - `CuttingSlipModal`: Workshop cutting slip generation with measurements and yardage.
  - `FabricDetailSheet`: Fabric swatch review, urgent cutter queue, and stage progression.
  - `OrderMeasurementsSheet`: Quick adjustment and order-specific measurement correction.
  - `HandoverPaymentSheet`: Final delivery payment settlement (single and split payments).
  - `WhatsAppOptionsSheet`: Customer WhatsApp progress updates and event photo requests.
  - `ScheduleFittingPromptModal`: Appointment scheduling for garment fittings.
  - `AddCustomerSheet` & `EditCustomerSheet`: Customer intake with strict international/Nigerian phone validation.
  - `StyleProfileSheet`: Style profile and garment measurement template management.
  - `MeasurementHistorySheet`: Historical measurement snapshot comparison and restoration.
  - `UnifiedNewOrderForm`: Multi-step order creation and digital receipt generation.

## 3. Strict Development Constraints

- **No Emojis:** Do NOT use emojis anywhere in source code, component copy, commit messages, or replies (unless explicitly instructed for a specific system reminder header). Keep all UI clean, professional, and refined.
- **Forbidden Terminology:** Never use the words "atelier" or "specialist embellishment" in copy, code, or documentation. Use "workshop", "tailor shop", "craft room", or "beading / embroidery artisan".
- **Git Branch Target:** Always commit and push exclusively to the `staging` branch (`git push origin staging`). NEVER merge directly into `main`.
- **Pre-Commit Verification:** Run `npx tsc --noEmit` and `npm run test:unit` before committing any code changes. Ensure zero type errors and zero test failures.

