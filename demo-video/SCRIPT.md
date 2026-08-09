# MyStitchBook Demo — Feature Walkthrough

**Format:** 9:16 vertical
**Target length:** ~26–30 seconds
**This is a product demo, not an ad.** No sales copy, no hook, no captions, no CTA. It's a silent, well-animated walkthrough of the app being used — the phone itself carries the whole video.

All assets referenced below are in `demo-video/screenshots/`. Hand this file + the screenshots folder to Claude Design as-is.

---

## The core rule

**No text on screen, anywhere, at any point — except what's natively part of the real app UI in the screenshots themselves.** No captions, no taglines, no CTA card, no "on screen text." If something needs to be understood, it's understood by watching the interaction happen (a tap, a swipe, a screen changing), not by reading a caption about it. The only exception is the brief logo moment at the very start and end — and even that is icon + wordmark only, no tagline, no sentence.

---

## Phone frame treatment

**The phone fills the full height of the canvas** — top of the chassis near the top edge of frame, bottom near the bottom edge, minimal margin. This is different from a typical "phone floating with room for captions above/below" treatment: there is no caption space to reserve, so the phone should be as large as it can be while still fully fitting in frame.

- Match the bezel style in `demo-video/reference/iphone-frame-reference-1.png` and `-2.png` (black bezel, pill Dynamic Island with the green camera dot, side buttons) — same as before, this doesn't change.
- Each screenshot masks into the phone's screen area, cropped to the screen's corner radius.
- Simulate real touch interaction between beats, same as before:
  - A small tap-ripple (soft indigo glow, expands and fades, ~400ms) at the exact screen-relative coordinate given per-beat below.
  - Screen-to-screen moves as an iOS-style slide transition, not a cross-fade.
  - Scroll moments show a soft drag-gesture indicator actually dragging the content.

---

## Beat-by-beat

### 0. Logo — 0:00–0:02
Icon + wordmark only (`00-brand-logo.png`), centered, no phone yet, no tagline, no sentence. In and out quickly — this is an identifier, not a moment to dwell on.

---

### 1. New Order — garment picked — 0:02–0:05
**Asset:** `02-new-order-garment-select.jpg`

Phone rises/scales into frame at full height, already showing this screen, or the logo shrinks directly into the Dynamic Island as the phone materializes — whichever reads as more continuous, your call. Tap-ripple at **(43%, 29%)** — the Aso Ebi Gown card — selection border and "1 Item Selected" bar animate in exactly as the real app does.

---

### 2. Order details — priced & photographed — 0:05–0:08
**Asset:** `03-new-order-details.jpg`

Slide-transition in from beat 1. Brief pan across Total Bill → Deposit Paid → the inspo photo thumbnail.

---

### 3. Production Board — 0:08–0:11
**Asset:** `04-production-board-light.jpg`

Slide-transition in. Horizontal swipe-drag gesture across the stage tab row (**y ≈ 30%**), dragging across Documented/Cutting/Sewing/Ready.

---

### 4. Order detail — stage advance — 0:11–0:14
**Assets:** `05-order-detail-timeline.jpg` → `05b-order-detail-timeline-full.jpg`

Tap-ripple at **(82%, 14%)** — "Move to Ready" — slide-transition into the full Activity Timeline (Documented ✓ → Cutting ✓ → Sewing current → Ready/Delivered pending).

---

### 5. Share & tracking link — 0:14–0:16
**Asset:** `06-share-tracking-link.jpg`

Tap-ripple at **(89%, 33%)** — the copy-link icon. A small "Copied" confirmation appears **anchored directly beside/above the icon itself** (not floating elsewhere on screen) and fades after ~1s.

---

### 6. Customer's tracking page, live — 0:16–0:20
**Assets:** `07-tracking-page-hero.jpg` → `07b-tracking-page-live-update.jpg`

The strongest beat — give it the most time. Vertical drag-scroll from the hero down into the "LIVE UPDATE" card with the real garment photo; let the "LIVE UPDATE" badge pulse once when it settles.

---

### 7. Light → Dark — 0:20–0:22
**Assets:** `08a-appearance-toggle.jpg` → `08b-production-board-dark.jpg`

Tap-ripple at **(50%, 89%)** — the "Dark" option — quick wipe from the light board (`04-production-board-light.jpg`) to `08b-production-board-dark.jpg`.

---

### 8. Portfolio + review — 0:22–0:26
**Assets:** `09-portfolio-hero.jpg` → `10-portfolio-review.jpg`

Vertical drag-scroll from the hero (full kaftan photo, no cropping) down into the "Real Reviews" card; the 5 stars animate in one at a time (~150ms apart) as it settles.

---

### 9. Logo — 0:26–0:28
Phone fades/dissolves away, icon + wordmark reappear centered, same brief treatment as the opening. No tagline, no CTA, no "link in bio." Just closes the loop.

---

## Timing summary

| Beat | Time | Duration |
|---|---|---|
| 0. Logo | 0:00–0:02 | 2s |
| 1. New order | 0:02–0:05 | 3s |
| 2. Price + inspo | 0:05–0:08 | 3s |
| 3. Board | 0:08–0:11 | 3s |
| 4. Stage advance | 0:11–0:14 | 3s |
| 5. Tracking link | 0:14–0:16 | 2s |
| 6. Live tracking (customer view) | 0:16–0:20 | 4s |
| 7. Light→dark | 0:20–0:22 | 2s |
| 8. Portfolio + review | 0:22–0:26 | 4s |
| 9. Logo | 0:26–0:28 | 2s |
| **Total** | | **~28s** |

If you need to cut for time, shorten beat 3 (board) first — never cut beat 6 (live tracking) or 8 (portfolio/review).

---

## Notes on the assets

- All screenshots (02–10) are genuine mobile-width captures (614px).
- Tap-ripple coordinates are percentages of the screen area, not raw screenshot pixels.
- The phone bezel style matches `demo-video/reference/iphone-frame-reference-1.png` / `-2.png` — the mockup graphics already used in the app's own Discover carousel. Build natively in CSS/SVG to match, don't composite into a photo.
- The data behind every screenshot is real, live in a Supabase-backed shop ("Baan Wears") — nothing is mocked UI.
