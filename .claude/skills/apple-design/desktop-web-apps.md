# Apple Design for Desktop Web Apps

Companion to `SKILL.md`, which is sourced almost entirely from gesture/motion WWDC talks (Fluid Interfaces, Audio-Haptic, Typography, Principles of Great Design) — all mobile/touch-flavored. This file covers the structural, mouse-and-keyboard, information-dense side of Apple's design language: **macOS HIG**, not iOS HIG. Load this file whenever the work is a desktop web app shell, sidebar, toolbar, data table, settings pane, or multi-step wizard — `SKILL.md` alone under-specifies these.

Sourced from Apple's macOS Human Interface Guidelines (Sidebars, Toolbars, Layout, Typography sections, developer.apple.com/design/human-interface-guidelines) plus cross-referenced against Linear's public redesign write-ups and macOS reference apps (Finder, System Settings, Notes, Mail).

**Brand constraint, non-negotiable:** every color value below is illustrative of Apple's *system* palette (their blue, their grays) to show the mechanism. This app's accent is Adire indigo — `--sf-accent-emerald` (`#4338CA` light / `#6366F1` dark) — already defined in `styles/tokens.css`. Never substitute Apple's system blue or introduce a second hue; every `--accent` reference below means *that* indigo, in both light and dark mode.

## 1. The desktop app shell

Apple's own dense-information apps (Finder, Mail, Notes, System Settings, Music) share one skeleton:

```
┌──────────────┬─────────────────────────────────────┐
│              │  Toolbar (title / nav / actions)     │  ~52px
│   Sidebar    ├─────────────────────────────────────┤
│  (nav tree)  │                                       │
│  200–260px   │        Content                        │
│              │                                       │
│              │                                       │
└──────────────┴─────────────────────────────────────┘
```

- **Sidebar** — leading edge always. 200–260px, resizable in real Mac apps; on the web, pick one fixed width per breakpoint rather than user-resizable unless the tool genuinely needs it (a kanban board or table view does not). Collapsible via a toolbar button, and the collapsed state persists (localStorage / user pref) — HIG is explicit that this state must be remembered, not reset per session.
- **Toolbar** — sits directly above content, not floating. Height ~48–52px. Three zones only: **leading** (sidebar toggle, back/forward, view title — never customizable, always present), **center** (context-appropriate actions, may collapse into overflow as width shrinks), **trailing** (search, inspector toggle, the one primary/`.prominent` action — always visible regardless of width).
- **Content** — the star. Chrome exists to support it, not frame it. Don't add a second nested toolbar/header inside content that duplicates the outer one.

**Grouping rule from HIG Toolbars:** aim for a maximum of **three groups** of controls in a toolbar. More reads as clutter even with desktop's extra width. Insert fixed space between a text-labeled button and an icon button sitting next to it — otherwise they visually fuse into one control.

**One primary action per toolbar**, `.prominent`-styled (tinted with the accent, not just bolded), on the trailing edge. Every other action is neutral. This is how HIG creates a single focal point instead of five buttons of equal visual weight competing for attention — a common failure mode in SaaS dashboards that give "Export," "Filter," "New Order," and "Settings" identical button styling.

```css
.toolbar {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--sf-border-hairline, rgba(0,0,0,.08));
  /* materialize per SKILL.md §12, not opaque */
  background: rgba(248,248,254,0.72);
  backdrop-filter: blur(20px) saturate(180%);
}
.toolbar__leading, .toolbar__trailing { display: flex; align-items: center; gap: 8px; }
.toolbar__center { flex: 1; display: flex; justify-content: center; gap: 12px; }

.toolbar__primary-action {
  background: var(--sf-accent-emerald);
  color: var(--sf-text-on-accent);
  border-radius: 6px;
  padding: 6px 14px;
  font-weight: 600;
}
```

## 2. Sidebar conventions

- Rows: 28–32px tall, 6–8px horizontal inner padding, icon (16–20px, monoline, `currentColor`) + label with a 6px gap.
- Section headers: small-caps or uppercase, 11px, `--sf-text-tertiary`-weight, extra top margin (16–20px) to separate groups — proximity implies relationship (SKILL.md §16 "grouping & mapping").
- **Selected state:** a soft filled pill/row using the accent at low opacity (e.g. `rgba(67,56,202,0.12)` light / equivalent in dark), with the accent itself only on the icon or a thin leading bar — never a loud solid indigo block filling the row. HIG explicitly favors a "subtle highlight, not a loud color block."
- Background one level down from the window body (`--sf-bg-secondary`-equivalent), not the same flat white as content — hierarchy through background level, not borders. Borders, when used at all, are ~0.5–1px and low-opacity.

## 3. Dense data tables & lists

Neither `SKILL.md` nor stock HIG covers tables in depth — this is the biggest gap for a dashboard/kanban tool. Practical conventions from Apple-quality desktop software (Finder list view, Mail) and best-in-class web apps (Linear):

- **Offer density, don't pick one.** Comfortable row ≈ 44–52px with generous padding; compact/dense row ≈ 32–36px. A tailor scanning 40 orders wants dense; a first-time user wants comfortable. If you only have time for one, default to **compact (36–40px)** for a business/ops tool — MyStitchBook's dashboard is a working tool, not a marketing surface.
- **Row hover state must be instantaneous** (background-color transition ≤100ms, no easing delay) — this is SKILL.md §1's "respond on pointer-down" principle applied to table rows: a table that doesn't visibly react to hover reads as inert/dead before the user even clicks.
- **Sort affordance lives in the column header**, not a separate toolbar control — click header to sort, click again to reverse, small chevron indicates direction and is only rendered on the active column (don't show idle chevrons on every column; that's noise).
- **Selection uses a checkbox that appears on hover / when any row is selected**, not a permanently-visible checkbox column — progressive disclosure (SKILL.md §16, HIG Layout "progressive disclosure").
- **Alignment:** numeric/currency columns right-align; text left-aligns; a single status/badge column can center. Right-aligned numbers in a vertical list let the eye compare magnitudes instantly — this is a table-specific instance of HIG's "align components to make them easier to scan."
- **Zebra striping is not an Apple pattern** — Finder/Mail use hover + selection states and a hairline row divider (or no divider, just spacing) instead of alternating background bands. Prefer that.
- **Sticky header** uses HIG's "scroll edge effect," not a hard 1px border: a soft blur/shadow gradient appears only once content has actually scrolled underneath it, not a permanent border.

```css
.table-row {
  height: 38px; /* compact, business-tool default */
  display: grid;
  grid-template-columns: 28px 1fr 120px 100px 80px; /* checkbox, name, date, amount, status */
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--sf-border-hairline, rgba(0,0,0,.06));
  transition: background-color 100ms ease-out;
}
.table-row:hover { background: var(--sf-surface-hover, rgba(0,0,0,.03)); }
.table-row .amount { text-align: right; font-variant-numeric: tabular-nums; }
.table-row .checkbox { opacity: 0; }
.table-row:hover .checkbox,
.table-row.selected .checkbox { opacity: 1; }
```

## 4. Multi-step wizard / setup-flow layout — desktop, not mobile

This directly targets the "New Order" 4-step wizard (customer → garment → measurements → details).

**The mobile-style anti-pattern to move away from:** full-page single column, a top progress bar (or dots), one "Next" button, prior steps invisible once passed. That is an iOS pattern (justified there — one hand, one thumb, narrow viewport) that most SaaS tools cargo-cult onto desktop where it wastes 70% of the horizontal space and hides context the user actually has room to see.

**How Apple-quality setup flows look on a large canvas** (macOS Setup Assistant, Installer.app, and well-regarded third-party preference/onboarding flows converge on this):

- **All steps are visible at once**, in a slim leading-edge list (a specialized sidebar), each row showing: order number, label, and a status glyph (done ✓ / current ● / upcoming ○). This is the "wayfinding" principle from SKILL.md §16 made literal: *where am I, where can I go, what's left* answered by one glance, permanently on screen — not reconstructed from a progress bar's percentage.
- **Completed steps stay clickable.** The user can jump back to "Customer" from "Measurements" without a Back button chain, because the step list is a navigation surface, not a decoration. This is HIG's Agency principle (SKILL.md §16.2) — don't force a single linear path when the data model doesn't require it (a tailor often fills in garment before locking a customer, or edits a measurement after seeing the price estimate).
- **The step list is a static-width rail (~220px), not full-bleed.** The remaining width is the actual form — meaning at desktop widths you have room for the form to run two columns (e.g., measurement fields in a grid) instead of one skinny centered mobile-width column marooned in a sea of whitespace. Cap the form's own content width for readability (~640–760px) but let it use real desktop layout (labeled groups, inline field pairs), not a stacked mobile form stretched taller.
- **Primary action ("Continue"/"Create Order") lives bottom-right of the form pane, always in the same screen position across all 4 steps** — spatial consistency (SKILL.md §7) applied to a wizard: your hand shouldn't have to relearn where "next" is each step.
- **No modal-trapping full-page takeover unless the task is genuinely a single focused commitment** (HIG materials guidance: "dim to focus, separate to keep flow" — SKILL.md §12). A New Order wizard inside a working dashboard is closer to a "parallel, non-blocking panel" than a modal task — consider it living in a large panel/sheet over the dashboard (with the dashboard dimmed/pushed back per §12) rather than navigating away to its own full route. That preserves "where am I" — the tailor can still see they're inside their dashboard, not on an unrelated page.

```
┌────────────┬──────────────────────────────────────────┐
│ ① Customer │                                            │
│ ✓ done     │           Form for current step            │
│            │        (multi-column where it helps,       │
│ ② Garment  │         max-width ~720px, real desktop      │
│ ● current  │         field density — not one column      │
│            │         stretched to fill the whole pane)   │
│ ③ Measure  │                                            │
│ ○ upcoming │                                            │
│            │                                            │
│ ④ Details  │                                            │
│ ○ upcoming │            [Cancel]      [Continue →]       │
└────────────┴──────────────────────────────────────────┘
   ~220px                    remaining width
```

```css
.wizard {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 520px;
}
.wizard__steps { padding: 24px 12px; border-right: 1px solid var(--sf-border-hairline); }
.wizard__step {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 6px;
  color: var(--sf-text-secondary);
  cursor: pointer; /* completed + upcoming both navigable */
}
.wizard__step[data-state="current"] {
  background: var(--sf-accent-emerald-glow); /* accent tint, not solid fill */
  color: var(--sf-text-primary);
  font-weight: 600;
}
.wizard__step[data-state="done"] .wizard__step-glyph { color: var(--sf-accent-emerald); }
.wizard__form {
  padding: 32px 40px;
  max-width: 760px;
  display: flex; flex-direction: column; gap: 20px;
}
.wizard__actions {
  margin-top: auto; padding-top: 24px;
  display: flex; justify-content: flex-end; gap: 12px;
}
```

## 5. Settings-pane conventions

Applies to any "Shop settings" / preferences area.

- **Two-pane, not accordion-in-a-single-column.** Sidebar lists categories (Profile, Billing, Notifications, Staff, Portfolio…); the right pane shows only the selected category's controls. This is exactly System Settings' Ventura-era redesign — categorical sidebar + detail pane replaced the old flat icon-grid control panel because it scales far better past ~6 sections, which MyStitchBook's settings already exceeds.
- **Group controls into labeled sections within a category**, each section a distinct card/inset area with its own small-caps header — never one long undifferentiated scroll of label/control pairs.
- **Inline validation and instant apply where safe** (a toggle takes effect immediately; no separate "Save" button for simple preference flips) — reserve an explicit Save/Cancel footer only for a bounded multi-field group (e.g. business address) where partial-apply would be confusing.
- **Search at the top of the settings sidebar**, above the category list — HIG moved System Settings' search from top-right of the window into this exact position for discoverability across two dozen+ panes.

## 6. Typography at desktop information density

macOS's own built-in text styles run smaller than this app's current mobile-derived scale — because a mouse-driven, close-viewing-distance desktop surface can and should pack more information per screen than a phone held at arm's length.

| Style | Weight | Size | Line height |
|---|---|---|---|
| Large Title | Regular (emphasized: Bold) | 26px | 32px |
| Title 1 | Regular (Bold) | 22px | 26px |
| Title 2 | Regular (Bold) | 17px | 22px |
| Title 3 | Regular (Semibold) | 15px | 20px |
| Headline | Bold (Heavy) | 13px | 16px |
| Body | Regular (Semibold) | 13px | 16px |
| Callout | Regular (Semibold) | 12px | 15px |
| Subheadline | Regular (Semibold) | 11px | 14px |
| Footnote | Regular (Semibold) | 10px | 13px |
| Caption 1/2 | Regular/Medium (Semibold) | 10px | 13px |

- **macOS default body text is 13pt** (minimum legible 10pt) — HIG's own stated default, versus iOS's 17pt default. Don't port a mobile 15–16px body size onto a dense desktop table/sidebar; it forces everything else (row height, information per screen) to bloat with it.
- Reserve anything above Title 2 (17px) for page-level headers, not card titles or table headers — a dashboard with too many 20px+ headings loses hierarchy because everything competes at "important."
- macOS does **not** support Dynamic Type / user-adjustable system text scaling the way iOS does — don't over-engineer a runtime type-scale switcher for this surface; do still respect the user's OS-level browser zoom (relative units, not px-locked layouts) for accessibility.

## Quick reference — when SKILL.md alone is insufficient

| Need | Use this file's section |
|---|---|
| App shell (sidebar/toolbar/content regions) | §1 |
| Sidebar row/selection/grouping styling | §2 |
| Orders table, customer list, any dense list | §3 |
| New Order 4-step wizard redesign | §4 |
| Shop settings / preferences redesign | §5 |
| Any font-size decision on desktop surfaces | §6 |

`SKILL.md` remains authoritative for: motion/springs, gesture handling, materials/vibrancy mechanics, reduced-motion, and the 8 design-principle vocabulary (Purpose/Agency/Responsibility/etc.) — all still fully applicable to desktop, just not desktop-specific.
