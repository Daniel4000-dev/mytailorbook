Build a 9:16 vertical (1080×1920) animated promo sequence for a tailoring SaaS called MyStitchBook. Follow `SCRIPT.md` beat-for-beat — exact timing, captions, and motion notes are all specified there, don't improvise a different structure. The core idea: this should look like watching someone actually use the app on their phone (real taps, real swipes, real screen-to-screen navigation), not a slideshow of screenshots.

Requirements:

1. **Total runtime ~41 seconds**, broken into the 11 timed beats in SCRIPT.md's timing table. Treat each beat as its own distinct scene/segment with a clear start and end — this will be rendered programmatically frame-by-frame afterward, not screen-recorded, so exact, deterministic timing per beat matters more than it would for a live capture.

2. **Everything from beat 1 through beat 9 happens inside one persistent iPhone chassis**, built natively in CSS/SVG — read the "Phone frame treatment" section in SCRIPT.md in full before building anything. Key points:
   - Match the bezel style in the attached reference images `iphone-frame-reference-1.png` and `iphone-frame-reference-2.png` exactly (black bezel, pill Dynamic Island with the small green camera dot, side buttons) — this is the same phone graphic MyStitchBook already uses in its own app, so it's a brand-consistency requirement, not a style suggestion.
   - Size the phone large and centered — roughly 85–92% of canvas width, not a small phone floating in empty space. Screen content must stay legible at real Reels viewing size.
   - Each of the 9 in-app screenshots masks into the phone's screen area.
   - Between beats, simulate real touch: a small tap-ripple at the exact screen-relative coordinate given per-beat in SCRIPT.md, screen-to-screen moves as an iOS-style slide transition, and scroll moments (the board, the tracking page, the portfolio) show a soft drag-gesture indicator actually dragging the content, not a jump-cut to a different scroll position.

3. **Captions are burned into the animation itself** — render the "On screen text" / "Caption" line for each beat as real animated text (fade/slide in, hold, out). Clean sans-serif, high contrast against whatever's behind it (scrim/gradient under text if it sits over a photo or the phone screen).

4. **Brand colors:** Adire indigo `#4338CA`, near-white `#F8F8FE`. Beats 0 and 10 (hook, CTA) have no phone/screenshot — pure typography per SCRIPT.md. Beat 1 is the book-shaped logo (`00-brand-logo.png`) opening like a book cover (two panels hinge open on a 3D rotateY, reveal the mark, wordmark settles in after) — then the phone rises and shows that same lockup on its screen as a splash moment, which is what establishes the chassis for the rest of the video.

5. **No audio** — don't generate or attempt to source music or voiceover, I'll add both separately afterward. Expose clear timestamp/scene markers in the output if that's easy, so I can line up music/voiceover later, but don't block on it.

**Deliver as a standalone HTML export (or full code handoff)** — not a screen-recorded video. I'm handing the exported code to Claude Code to render into a real MP4 frame-by-frame (headless browser + ffmpeg), so it needs to run cleanly on its own outside the Claude Design canvas: no dependency on the editor UI, animation autoplays from page load with no interaction required, and the sequence reaches a natural stop at ~41s rather than looping.
