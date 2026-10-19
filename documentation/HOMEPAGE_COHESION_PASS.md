# Homepage cohesion pass (18 October 2026)

The homepage was walked end to end on the production build (1440 × 900 and 390 px; reduced motion; WebGL off) to judge
the hand-overs rather than the chapters. Most of it already reads as one journey: the opening into Chapter 02 is a
deliberate breath, the floodplain's light goes out into the canopy before Chapter 03, and the closing reassembles the
name over the relief. Two seams broke it, and those are what changed.

## 1. The Survey's dive lands in the Thar

**Before.** The camera dived to the first survey mark and the Thar warmed, then the whole plate (a brown slab with a hard
lower edge) scrolled off over an empty dusk sky, and the bustard's title arrived clipped at the foot of the screen.

**Now.** The field studies begin one screen earlier, under the plate's last screen (`.grounds.is-pinned + .fs-index`,
`margin-top: -100svh`), and while their section is still coming up its stage is held at the top of the screen
(`FieldStudiesIndex`, a transform kept on the scroll event and on ScrollTrigger's update, which Lenis drives), so the
Thar world is already whole beneath the plate. The plate keeps the page's ground and sits above (z 3); the dive now
ends at `DIVE_TO` (0.88), the camera keeps sinking, and over the last `DISSOLVE` (0.45 screen) the sheet fades into the
world, its words ahead of its lines. The plate is 420vh (was 380vh) so the dive keeps its length; the page is still
shorter overall.

The plate also re-measures on body resize and wakes on scroll as well as by its observer: a landing straight on
`/#field-studies` could otherwise leave the sheet standing over the first world.

## 2. Chapter 03 ends on its ground

**Before.** After the dome sank, the index, caption and sheet scrolled away together, followed by about a screen of
empty canopy carrying only the scientific names, before Chapter 04's plate rose.

**Now.** Past `EXIT_FROM` (0.87) the chapter is `is-leaving`: the words step back, the dome's caption and controls wait
(the existing `is-waiting` path), and the ground lets go of the species. The scientific names' band overlaps the
selection's last 45svh (z 3, clear over the sheet, the canopy closing over the sheet's foot before the chapter ends), so
the names cross the flattened sheet and Chapter 04's plate is cut in about a quarter-screen sooner. Focus or a choice in
the faded index returns the reader to the hold; the names' line takes the pointer only once the index has stepped back.

## 3. Detail

The field-studies list stands over the Thar's low sun; its veil is deeper for that world only (`field.css`).

## Checks

Production build, one browser at a time (`scripts/audit/cohesion-seams.mjs`, `cohesion-perf.mjs`, `ch3-interact.mjs`,
`review-journey.mjs`, `route-sweep.mjs`, `data-integrity.mjs`).

| Span (14 px/frame, GPU) | Before | After |
| --- | --- | --- |
| Survey dive → Thar world | 38 fps | 41–43 fps |
| Chapter 03 exit → Chapter 04 plate | 48 fps | 48–50 fps |
| Survey plate to the dive | 48–53 fps | 59 fps |

The field stage's one-time load moved with its section: it now falls while the contours draw (that span reads 44 fps on
first pass, 60 before) instead of while the marks are set.

Selection (preview, choose, rapid choices, played commit to the profile, Escape, arrows, drag-cancel) unchanged; route
sweep 100/100; data integrity 10/10; lint at its 17-warning baseline. `src/world/field/stage.ts` and
`src/components/field/useFieldStage.ts` are unchanged.

## Left alone

The opening already ends over the Thar ("Desert National Park") before the Survey pulls back to the whole country and
dives there again; that is an act break between the atlas and the five grounds, not a seam. On phones, "Into the
grassland" still meets the Himalayan contours during the dive.
