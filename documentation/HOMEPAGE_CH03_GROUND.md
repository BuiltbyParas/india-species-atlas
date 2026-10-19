# Chapter 03 — the ground under the dome

18 Oct 2026. Follows the Survey pass (`HOMEPAGE_SURVEY_PASS.md`). Uncommitted.

## Concept

The survey's sheet comes back after the field studies, and this time all twelve species are on it. Ch.03 used to be a statement, an index and a photo dome on a flat dark ground. Now the dome stands on India's terrain and is made of the same records the terrain is marked with:

1. **The sheet.** The 500 m contours from the Survey plate (same ETOPO 2022 grid, same trace, shared through `home/surveyContours.ts`). The twelve species' 52 indicative localities are set on it species by species, in Red List order. The line under the statement names the species being set (`05 / 12 · Red Panda · 4 localities`).
2. **The ground.** The sheet lies back into a plane (one CSS transform, written per scroll frame; nothing redraws).
3. **The rise.** The dome comes up out of the ground band by band: first the lower band of localities, then the photographs, then the upper band (`DomeControl.rise`). The index takes the statement's place beside it.
4. **The hold.** The ground answers the dome. The species in front lights its own ground: the contours within about 80 km of each of its localities, plus a dashed traverse through them in the record's order. The sheet slides in its own plane so that ground lies under the dome. Hovering or focusing an index row previews another species' ground; choosing a row turns the dome to it.
5. **The choice.** Choosing the species in front (photo, Enter or "Open profile") is played for 640 ms: the sphere draws in, the rest of the dome dims, its marks sound, and a rule runs under the name. Then the existing profile dialog opens (`?species=…`). With reduced motion it opens at once. Dragging or the arrow keys cancel a pending choice.
6. **The exit.** The dome sinks back into its ground (upper band first), and the sheet lets go of the species and lifts back toward the whole-country view that Ch.04 opens on.

## Layouts

- **Wide (≥1180 × 680) with motion:** one pinned plate, 340svh, with a sticky 100svh stage. The register sits on the left, the dome on its ground on the right. Focusing the index or the dome before the plate has risen scrolls to the plate at rest.
- **Phones, narrow windows:** read in the flow. The same set → tilt → rise runs as the dome's box comes up the screen. Choosing a name scrolls to the dome, as before.
- **Reduced motion:** the flow layout, everything set and risen, the ground lit for the species in front. All interactions remain.
- **No WebGL:** nothing here uses WebGL. The ground is canvas 2D and the dome is CSS 3D.

## Honesty

- The marks are the dataset's indicative localities: named reserves and landscapes. Withheld coordinates are never printed. As on every other map in the atlas, the marks are drawn but no coordinate readout is added.
- The lit pools are stated as "about 80 km around each locality" in the ground key. They mean "the ground here", not a range.
- The caption's ground line ("On the ground · Grassland · 3 localities · ground ≈ 20–220 m") uses the record's habitats and the elevation grid's cell means read at the localities. It is omitted where the grid gives nothing above sea level.

## Files

- `src/components/cinema/SelectionChapter.tsx`: rewritten composition and scroll choreography.
- `src/components/cinema/SelectionGround.tsx`: new. The sheet: base canvas, two cross-fading lit canvases, a half-scale mask canvas and 52 DOM marks.
- `src/components/cinema/DomeGallery.tsx`: `rise`, `commit`, the lens wrapper, and the `ground` and `detail` slots.
- `src/components/home/surveyContours.ts`: new. Contour tracing moved out of GroundsPlate and memoised, so both plates share one trace.
- `src/components/cinema/GroundsPlate.tsx`: imports the shared trace (no behaviour change).
- `src/components/cinema/editorial.css`: the "Chapter 03 — the ground under the dome" block. The old sticky `.selection-lead` rule was removed.
- `src/index.css`: `.dome-card` and `.dome-place` read `--rise`, default 1.

## Checks (18 Oct)

- `tsc` clean. `npm run build` passes.
- oxlint: 17 warnings, the same baseline as before, none in the files above. The one parse error is in `video/src/scenes/himalaya.ts`, which this pass didn't touch.
- `data-integrity.mjs`: all PASS. `route-sweep.mjs` (GL=gpu, production build): 100/100.
- `hero-fallback.mjs`: no scroll jumps or errors, including at Ch.03.
- `scripts/audit/ch3-interact.mjs` at 1440, 1440 with reduced motion, 1440 with WebGL disabled, and 390. Covers focus-before-risen, hover preview, choose, rapid choices, commit → profile, Escape returning focus, arrows, and drag cancelling a commit. No console errors.
- `scripts/audit/ch3-perf.mjs` (production, GPU, two runs):

  | Span | fps |
  | --- | --- |
  | Survey plate (control) | 50 |
  | Ch.03 arrival | 32–38 |
  | Tilt + rise | 46–51 |
  | Hold + exit | 50–51 |
  | Turning the dome | 42–55 |

  Arrival measures the same with the ground hidden, so its cost is the floodplain world handing over, not this chapter.
- `src/world/field/stage.ts` and `src/components/field/useFieldStage.ts` are unchanged (sha256 `32cd817f…`, `d78d47f5…`).
