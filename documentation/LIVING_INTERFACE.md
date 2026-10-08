# Living interface

Branch `atlas/living-interface`, cut from `atlas/final-polish` at `0148ef1`. Not merged and not pushed.

The brief named five weaknesses:

1. Route changes feel like hard page swaps.
2. `/atlas` sits apart from the 3D world.
3. Photographs are flat.
4. The 3D hero is driven only by scroll.
5. Typography is static.

It asked for one interaction language rather than more effects. Two transitions were to be proved first: HOME → ATLAS and ATLAS → ONE SPECIES.

## The minimum architecture

Most of what the brief lists already existed:

- springs, pointer, scroll velocity, magnetic controls and the cursor states (`src/interaction/`);
- the journeys (`src/world/`).

What was missing was a set of **joins**, so nothing was rewritten. In particular, there is still no global Three.js canvas.

| Join | Where | What it makes possible |
|---|---|---|
| `Pausable.toSheet(cam, t)` + `sceneNamed()` + `keepAwake()` | `world/sceneRegistry.ts` | A journey can drive a live WebGL scene with that scene's own renderer, and keep it awake while every other scene pauses |
| `heroScene.toSheet` | `components/home/heroScene.ts` | The hero camera blends from its scroll pose to straight down, north up, with a 16° lens, at exactly the scale the journey's 2D sheet draws (one projection, checked by overlaying the true outline) |
| `heroScene.setProbe` / `onProbe` | same | The hand surveys the relief (see D below) |
| `heroScene.setMomentum` | same | The shared scroll-velocity signal reaches the hero camera |
| `registerAtlasCamera` / `liveAtlasCamera` | `world/journeys.ts`, `AtlasMap.tsx` | A journey can move the real Leaflet camera before taking over |
| `geoThread.ts` | `src/interaction/` | Any `data-geo` element becomes a measurable place |
| `photoContours.ts` | `src/interaction/` | A photograph's own iso-luminance lines |

New WebGL contexts: **none**. New permanent `requestAnimationFrame` loops: **none**. Everything steps on the shared `schedule()` loop, or on the hero's existing render-on-demand loop, and stops when it settles.

## What was built, by system

### I · G — Spatial continuity (the two prototypes)

**HOME → ATLAS** (the hero is on screen; the trigger is the menu, the new "Or open the working map" link, or any `/atlas` link) is TERRAIN → MAP → INSTRUMENT:

1. The menu folds away if it is open.
2. The hero's own camera turns straight down over the framing it was showing:
   - the whole country, or
   - the Thar region once the descent has come down.
3. The relief lies flat as a map, the graticule returns, depth of field opens and the copy steps back (1.05 s).
4. The journey's sheet comes up over it at the identical projection. The relief's fills give way to the sheet's lines.
5. The camera rises into the atlas map's panel, and the 52 localities gather on the sheet as it goes.
6. Leaflet's own markers are underneath when the sheet lifts.

**ATLAS → SPECIES** is MARKER → COORDINATE → CAMERA → TERRAIN → LINE → PHOTOGRAPH → SPECIES:

1. "Enter its world" folds the popup away.
2. The real map leans in to the marker (Leaflet `flyTo`, 0.8 s).
3. Only then does the journey pick up, from the framing the map settled on.
4. The existing descent follows: states of record lifted ("not elevation"), the rule, the shutter, and the FLIP of the photograph.

**Species → species** travel now sets the leg's real length ("1,093 km") along the line as it is drawn.

**Fallbacks:**
- If the hero is not filling the screen, the existing ascend runs.
- With reduced motion, the page turn fades.

### A — Contextual geographic cursor

The survey reticle is unchanged, with its springs, velocity stretch, press rebound and magnetic lock. Added to it:

- **Geographic reading.** Over anything that stands for a place (`data-geo`), the reticle carries the place's coordinates as a margin note:
  - directory cards;
  - links to a species' page;
  - next and previous species.

  Where the element already prints them (atlas markers, register rows), it stays quiet (`data-geo-quiet`).
- **Geographic snapping.**
  - Atlas markers are now magnetic. The reticle locks onto one as corner marks with "Open".
  - On the hero, the probe closes onto lit localities (see D).
- **Temporary geographic thread.** Moving from one place to another within 4 s rules a bowed survey chord between the two on screen:
  - chainage ticks every 48 px;
  - survey marks at both ends;
  - the great-circle distance between the two anchors, set along the chord ("1,093 km apart").

  It dries in about 2 s. It measures and never draws a route. It works:
  - between directory cards;
  - between atlas markers;
  - down the locality register, where it bows into the left margin between row dots;
  - from a register row to the next-species link.
- **Keyboard.** Tabbing between places rules the same thread.

### B — Shared magnetic / spring system

These controls now opt in to the existing engine (`data-magnetic`): atlas markers, the map's mode switch, the Map / 3D toggle, "Reset to India view", and the wordmark. They join the 21 controls that already used it. No new physics was added.

### C — Scroll velocity

The global signal (`velocity.ts`) now also drives:

- **The hero camera.** A fast scroll widens its lens by up to 3.2° and it settles as the page does: momentum, not a scrubbed timeline.
- **Photographs.** While on screen, a print lags up to 16 px behind the scroll inside its frame and swells 3%. The velocity variable is bound to a frame only while it intersects the viewport.

Lines (the curved loops) and the route map already used it. Particles were not given velocity: the hero dust is tied to scroll position by design, so that the hero renders only on demand.

### D — Pointer-reactive 3D (the survey probe)

The hand over the relief sets the reticle down on the ground:

- **Footprint.** A hairline ring and four ticks lie in perspective on the terrain plane.
- **Reading.** It shows the coordinates under the hand, limited to the sheet's extent.
- **Snapping.** Within 34 px of a lit locality, it tightens onto the marker's foot in the species' status colour and names the place and the species.
- **Light.** The key light turns towards the hand, a raking light that catches the walls of the relief and the water.

The existing camera parallax is kept. There is no drag, no orbit and no zoom: scroll is still the way through the descent.

**Touch.** A tap (not a scroll) sets the probe down for 2.2 s. On a phone, the label flips to the ring's left when it is near the right edge.

### E — Kinetic / geographic typography

- **Every page's `h1`** is now written along a contour that straightens into its rule. This is the species page's `LineTitle`, applied through `SectionHeading` and the atlas page:
  - Directory;
  - Compare;
  - Conservation;
  - About;
  - Sources;
  - Interactive map.
- **Words that follow geographic lines,** honestly sourced:
  - the cursor thread's distance;
  - the travel leg's distance;
  - both are set along the line they measure.

### F · H — Photo depth and the generalised shutter

- **Contours of the print** (`photoContours.ts`). Each photograph is measured once, at 112 cells across, on idle time. Lines of equal brightness are traced at five levels by marching squares. They are a reading of the image (what a densitometer would trace), never of the ground.
- **LINE → CONTOURS → PRINT.** The species-page shutter is now this sequence:
  1. the rule is drawn;
  2. the print's contours spread from the rule;
  3. the photograph develops under them.

  The same `Photo shutter` now also opens the documentary's stacked (tablet and phone) species photographs.
- **Hover.** Under the hand, the contours return faintly in contour ink, beside the existing drift, light and crop marks.
- **Velocity displacement:** see C.

## What stayed the same

The visual identity, palette and type are unchanged, as are:

- the loader;
- the hero descent;
- the bustard prologue;
- the documentary's rhythm;
- the menu;
- the page turn for non-geographic routes;
- every data page's layout;
- the Leaflet controls;
- all data and copy, except one hero link.

## Scientific integrity

| Element | What it claims |
|---|---|
| Distances | Great-circle (haversine) between dataset coordinates, labelled "apart". They are not routes. |
| Probe coordinates | The relief's own affine projection inverted. Readings are limited to the sheet's extent; snapped names come from the dataset. |
| Photo contours | The image's luminance. No geography is implied, and none is drawn on maps. |
| The lift | Still labelled "not elevation". No elevation data was added. |

## Responsive and reduced-motion behaviour

| | Desktop (fine pointer) | Tablet / phone (touch) | Keyboard | Reduced motion |
|---|---|---|---|---|
| HOME → ATLAS flatten | yes | yes (phone framing) | yes (Enter on any `/atlas` link) | fade page turn |
| Atlas leans in, then descends | yes | yes (tap marker → popup → Enter) | yes | fade page turn |
| Hero probe | follows the hand, snaps | tap to survey | — (decorative; the sr-only summary lists every locality) | hero is the flat map |
| Cursor reading / snapping | yes | no cursor | — | no cursor |
| Geographic thread | hover | — | Tab between places | — |
| Magnetic controls | yes | no | — | no |
| Hero momentum | yes | yes | — | no 3D |
| Photo velocity lag | yes | yes | — | static |
| Photo contours | shutter + hover | shutter | — | none |
| Line titles | written, straightened, plucked | written, straightened | — | level from the start |

## Performance (real GPU, production builds side by side)

- **Baseline:** `0148ef1`, built from a clean export.
- **Home scroll:** the whole page in 40 px steps.

| Measure | Baseline | Living interface |
|---|---|---|
| Home scroll, 1440 × 900: p50 / p95 / p99 | 16.7 / 16.7–16.8 / 16.8 ms | 16.7 / 16.7–16.8 / 16.8 ms |
| Home scroll, 1440 × 900: frames > 33 ms per 831-frame pass (5 interleaved runs) | 4, 1, 3, 1, 2 (mean 2.2) | 3, 4, 4, 1, 4 (mean 3.2) |
| Home scroll, 390 × 844 touch: frames > 33 ms per 574-frame pass (3 runs) | 2, 1, 2 | 3, 1, 2 |
| Hero, pointer sweeping the relief (probe active) | p95 16.7 ms, 1 slow frame | p95 16.7 ms, 2 slow frames |
| HOME → ATLAS journey | p50/p95 16.7/16.7, 3 slow frames | 16.7/16.8, 5 (the flatten adds 1.4 s on the hero) |
| ATLAS → SPECIES journey | 16.7/16.8, 2 | 16.7/16.8, 2 |
| Idle rAF callbacks on `/atlas`, `/species`, a species page, `/about`, `/compare`, `/sources` | 0 | 0 |
| First load: entry + modulepreloads + CSS, gzip -9 | 225.1 kB | 229.0 kB (+3.9 kB: thread, contours, probe wiring, `LineTitle` now shared by every page). The bundler re-split its shared chunk, so the entry file alone reads 170 → 129 kB, which is not a saving. |
| WebGL contexts | 1 per 3D page | unchanged |

An early comparison showed +12 slow frames per pass. Re-measured with the machine idle, it was load on the test machine, not the build: all three builds, including a variant without hero momentum, measured 1–4. The table gives the idle-machine runs.

The QA matrix ran at 1920, 1440, 1280, 1024 tablet, 768, 430 and 390, plus reduced motion on desktop and phone. It covered 110 route × viewport checks after milestone 1 and again on the final tree. All pass: no horizontal overflow, console errors, failed requests or broken images, and one `h1` per page.

## Honest assessment

**What now feels different:**

- Leaving the documentary for the map no longer cuts. The ground you were looking at lies down and becomes the map.
- Entering a species from the map starts on the map itself.
- The hero answers the hand with a measurement, not a wobble.
- Moving between places on any page leaves a measured line.
- Photographs develop from lines.

Together these give the site one grammar: instrument, line, measurement.

**What is not there yet,** and would be needed before calling it a single continuous world:

- **No reverse flatten.** `/atlas` → home lands on the page turn. It does not rise back into the relief.
- **A visible swap on the atlas.** The Leaflet basemap (Mercator raster) still cross-fades to the equirectangular sheet. The relief and the sheet now share a projection; Leaflet does not, so a visible material change remains there.
- **Species pages have no 3D ground.** The "terrain" is still lifted layers labelled "not elevation", because there is no elevation data.
- **Wrapped titles share one contour.** Each line of a wrapped page title follows the same wave rather than its own.

## Remaining opportunities

1. ATLAS → HOME as the reverse of the flatten: sheet → relief standing up.
2. An equirectangular basemap for `/atlas`, for example tiles rendered from the same boundary file, so the hand-off to the sheet has no material change.
3. The species → species thread on `/compare`'s sheet (the marks already carry places).
4. Sourced elevation, so the descent's lift can become real terrain and the probe can read height.
5. A per-line contour for wrapped `LineTitle`s.
