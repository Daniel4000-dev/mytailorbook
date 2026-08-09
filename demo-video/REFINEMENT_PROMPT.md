I want to change direction on this — not a bug-fix pass, a structural change. `SCRIPT.md` in this project has been rewritten to match; re-read it in full before making changes, the beat structure and timing are different now.

What's changing:

1. **Remove every caption and all sales copy, everywhere.** No hook line, no "That's why we built MyStitchBook," no "Stop losing customers to silence," no "link in bio" CTA card. This is a product demo, not an ad — nothing should be read, everything should be watched. The only text in the entire video is the logo/wordmark at the very start and end, and even that has no tagline or sentence with it — just the mark.

2. **Drop the hook beat and the sales-pitch turn beat entirely.** Go straight from a brief logo moment into the app itself.

3. **The phone should fill the full height of the canvas.** Previously there was space reserved above/below the phone for captions — remove that reservation entirely and make the phone chassis as large as it can be while still fully fitting in the 1080×1920 frame, top and bottom bezel close to the frame edges.

4. **Keep everything else that was already working**: the phone bezel matching the reference images, the tap-ripple interactions, the slide transitions between screens, the scroll-drag gestures, the light→dark board swap, the portfolio/review payoff at the end. Those don't need to be rebuilt, just re-timed to the new beat table in SCRIPT.md and freed from the caption space that's no longer needed.

5. **Still fix this from before, it's still relevant:** the "Copied" toast in the tracking-link beat was floating disconnected from the actual copy icon — anchor it directly beside/above the icon.

6. New total runtime is ~28 seconds per the updated timing table in SCRIPT.md — shorter than before now that there's no hook/CTA padding.

Once done, re-export the standalone HTML handoff (`MyStitchBook-Promo-standalone.html`) for rendering.
