# Home page — the atlas at night (one continuous journey)

11 October 2026 · branch `atlas/master-04-visual-quality` · uncommitted, on top of
`HOMEPAGE_NIGHT_TO_DAY.md`, which it reverses in art direction (not in engineering).

The brief: the paper / mist / stone second half reads as separate light templates
stitched to a dark first half. Make the whole home page one dark, spatial, WebGL-led
journey through India's geography, protect the field studies, keep every fact.

## 1. What was wrong (diagnosis)

The screencast of 11 Oct 17:03 (39.9 s, 1920 × 1080) and the code agree: the bright
second half is entirely the night-to-day pass (`HOMEPAGE_NIGHT_TO_DAY.md` §3–§7):

| Where | Introduced by | Mechanism |
|---|---|---|
| Ch. 03 index + dome on paper | night-to-day | `data-ground="paper"`, `.sel-mist`, `[data-ground='paper'] .dome-*` |
| Names loop on paper | night-to-day | `.names-ground[data-ground=paper]` |
| Ch. 04 plate on paper, dawn to mist | night-to-day | `data-ground` on the section + `.cons-ground` mixing to `--color-mist` on `--close` |
| Closing on stone, plaster relief | night-to-day | `data-ground="stone"`, `usePlasterRelief` |
| Colophon on stone-deep | night-to-day | `Footer` `data-ground="stone-deep"` on `/` |
| Header / cursor / route map in print ink | night-to-day | `data-under` / `data-env` paper/mist/stone rules |

Kept from that pass: the ink scale (`--ink`…`--rule`), Geist Mono for the instrument, the
motion tokens and `.mo-*` primitives, the field-stage `setMode('host')` fix, the
reversibility of every scrubbed value. The field studies' worlds are bright by their own
habitats and are **protected** (not changed here); the snow world is part of them.

## 2. References (browsed this session, GPU on, real wheel scrolling)

| Site | Seen | Taken (translated, not copied) |
|---|---|---|
| lusion.co | Aeonik + IBM Plex Mono; inset 3D panel with "+" marks; pale editorial middle; dark climax where the camera flies *through* giant letters inside a ring of light | the inset plate growing to full bleed; type standing **in** the world at the climax; mono for instrument labels |
| v2.lusion.co | GT Sectra (serif display 60–144 px) + NB Akademie; every dark section tinted its own hue; words set in 3D perspective | serif-led hierarchy (ours: Newsreader / Geist / Geist Mono); dark is a family of hues, never one black |
| webgl-scroll-sync | one-hue oxblood world; DOM-synced WebGL planes | one environment colour per act; DOM and WebGL laid in register |
| exp-ion | one object on a dark ground under one spotlight; text in the negative space; a light ring travelling over the ground | a single raking lamp on the relief; type where the object is not; rings on the ground |
| exp-gemini | object in a fogged, lit studio | atmosphere carries depth |
| vertex3d.asia | **3D not seen**: the PlayCanvas assets are blocked by this network's filter (`CONNECTION_ERROR_ASSET_BLOCKED`) | — |
| Dribbble video (6 s, from the earlier pass) | raking window light on matte matter; a coin travelling a track | light travelling along a line across terrain |

## 3. Direction

**One relief model of India, at night, lit by one lamp; the page is the room it stands in.**
Three acts are played on the *same* WebGL scene and renderer (the hero's), so the page
returns to the same country after the field studies rather than to new templates:

| Act | Sections | Camera | Light | What the ground carries |
|---|---|---|---|---|
| I · The map | hero, descent | top-down → low pass over the first anchor (unchanged) | NW key, warm as it lowers | 52 localities |
| — | Ch. 02, field studies (protected), Ch. 03, names | (field stage / DOM) | | |
| II · Pressure → response | Ch. 04 | rises out of the dark (inset plate grows to full bleed), oblique from the SSW, lifts for the statement | umber key under pressure, cool river rim for response | 12 species threads draped on the relief: broken under pressure, rejoined and river-blue under response; programme sites as survey rings; protected states glazed |
| III · What remains | closing + colophon | climbs back to the opening's plate, north up | lamp lowers, relief sinks into slate | every anchor's line run to one drawing point; the Tropic again, with the name set on it; the colophon printed on the relief's dark foot |

Grounds (all dark, a hue per job): night `#0b0e0c` (hero, Ch. 02), canopy `#0c110d`
(Ch. 03), umber `#130e0a` (Ch. 04 pressure), river `#091215` (Ch. 04 response),
slate `#0b0f11` (closing, colophon). Ivory ink on all; amber/terracotta for marks,
river for what is protected.

## 4. Architecture

- `components/home/atlasLayer.ts`: the hero's canvas moved to one fixed body layer
  (like the field stage's), following whichever **span** of the page is on screen —
  the hero's section, or Ch. 04 + the closing + the colophon as one span — with
  translate + clip + feather. One renderer, one loop, paused when no span is on screen.
- `heroScene.ts` gains acts (`setAct`): poses per act, the conservation layers (threads
  as screen-space ribbons on the relief, site rings, a protected-states mask sampled by
  the land shader), the closing's converging lines, and anchor screen positions for DOM
  labels. Built lazily the first time an act needs them.
- Chapters push state (`--draw/--frag/--prot/--close`, the trace) to the layer; no React
  state per frame. Without WebGL, with reduced motion, or after a too-slow verdict the
  chapters fall back to their SVG maps on the same dark grounds.

## 5. Motion (initial → range → final; reverse / jump)

Every scrubbed value is derived from the scroll position (GSAP ScrollTrigger with `scrub`), so it reverses
with the scroll and is right after a jump; the scene damps its own copy of each value at the hero's rate.

| Sequence | Initial | Range | Movement | Final |
|---|---|---|---|---|
| Hero → Ch. 02 | relief full screen | hero section's foot crosses the screen | the relief stays put; the layer's window closes upward as the next sheet rises over it | layer hidden |
| Field studies → Ch. 03 (protected section's exit only) | the floodplain world | its last screen | the world's own feather plus a canopy dusk (46 svh) rising into its foot (`.sel-dusk`) | canopy |
| Ch. 03 index | rows masked | arrival | line / meta / rule / tally (unchanged primitives) | the index; plays once |
| Ch. 04 arrival (`arrive`) | a plate inset 6 vw / 14 svh in the canopy, carrying the relief seen from high above; the light front over the Himalaya | section top from the screen's foot to its top | the plate travels in with its picture and grows to full bleed; the camera comes down to an oblique view from the SSW; the front draws the lines, then lights the land north → south; the column arrives at `draw` 0.32 as a staggered transition (and leaves at the same threshold) | pressure pose |
| Pressure (`frag`) | threads whole | pin 0.06 – 0.26 | threads break into dashes measured along the ground; low warm key from the west over umber | broken |
| Response (`prot`) | broken | pin 0.46 – 0.62 | the camera swings east of south; covered threads rejoin in river blue as a head of light runs along them; red panda and lion-tailed macaque (no programme on record) stay broken; programme sites ring on the ground; protected states take a river glaze; the light cools | rejoined |
| Statement (`close`) | response | pin 0.76 – 0.94 | the camera lifts towards top-down; unprotected ground steps down; threads stand down; the statement is set | statement |
| Ch. 04 exit (`--exit`) | statement | section foot from screen foot to 45 % | the statement and its shade step back | clear |
| Closing (`remain`) | statement pose | closing top 90 % → −45 % | the camera climbs back to the opening's view; each anchor's line is drawn to 79° E 22.5° N in turn; the Tropic is drawn; the name rides the parallel the scene reports (frame pinned 90 svh) | the opening's twin |
| Colophon (`sink`) | the closing | colophon arrival | the lamp lowers, the relief recedes into slate; the closing's type steps back; a slate wash rises under the colophon | colophon on the relief's dark foot |

Reduced motion: no world (the hero gives it up by design); Ch. 04 is stacked on umber with its SVG map; the
closing is the sheet version. Interaction: pointer parallax on the relief in every act (hero, Ch. 04, closing);
tracing a threat or programme in Ch. 04 lights its species' threads, localities and sites in 3D and sets their
names at their anchors (collision-stepped, flipped under their point where the legend is in the way).

## 6. Type

Kept and verified: Newsreader (display and narrative), Geist (interface), Geist Mono (instrument labels) — all
SIL OFL, loaded from Google Fonts in `index.html`. That is v2.lusion's serif-led pairing with Lusion's mono for
the instrument. Hierarchy unchanged in kind, extended into the scene: the closing's name rides the Tropic the
relief draws; traced species' names are set on the relief at their anchors (serif name, mono catalogue number).

## 7. What was built

| Where | Change |
|---|---|
| `index.css` `@theme`, grounds, environments | daylight tokens (paper, mist, stone, stone-deep, dusk, print, river-deep, terracotta-deep) and `.ink-print` removed; dark family canopy / umber / riverbed / slate + amber; `data-env` and header `data-under` rules for each; `[data-over-world]` makes a ground transparent over the world |
| `components/home/atlasWorld.ts` (new) | the fixed atlas layer: spans, clip, the travelling plate, activity via the scene registry, state pushed by chapters, anchor and Tropic reports back to the DOM |
| `components/home/atlasData.ts` (new) | the act's data from the dataset (threads via `threadRuns`, coverage, programme sites, protected states, drawing point) |
| `components/home/heroScene.ts` | acts (`setAct`); the atlas act: poses, threads and closing lines as screen-space ribbons on the relief (`THREAD_*`), site rings, protected-state glaze in the land shader (`ATLAS_GLAZE`), markers per trace, pose-driven light, air, water and grade; idle pre-build and compile; disposal |
| `components/home/HeroScrollScene.tsx` | draws into the layer; binds the scene; hero span; world data; pointer parallax in the atlas act; section transparent, stage above the layer |
| `cinema/ConservationMap.tsx` | world mode for the pinned chapter (no SVG map; values written only where read; traced labels; legend); uncovered species stay broken in the SVG too; key line for "rejoined" |
| `cinema/FinalChapter.tsx` | world mode (pinned frame, name on the reported Tropic, `remain`/`sink`); sheet version on the dark shaded relief (plaster cast removed) |
| `cinema/SelectionChapter.tsx`, `HomePage.tsx` | canopy ground and grain; nightfall over the floodplain (`.sel-dusk`); the atlas span |
| `layout/Footer.tsx`, `editorial.css` | colophon on slate, over the world's foot on the home page |
| `ChapterIntro.tsx`, `CinematicHero.tsx` | declared `data-env="atlas"`: coming back up from the field studies no longer leaves the hero's foot tinted with the Thar's sand (pre-existing) |
| removed | `cinema/usePlasterRelief.ts` (unused) |

Protected and not modified: the field studies (`FieldStudiesIndex`, `field.css`, `world/field/*`).

## 8. Checks (actually run)

- `tsc -b` passes; `oxlint src` exits 0 (warnings only, none new in kind); `npm run build` passes (23 route pages).
- GPU captures (dev server, `?hold=1` keeps the governor from stepping down on this loaded machine): 1440 × 900
  and 1920 × 1080 through the whole page; transitions at fine steps; traces (a threat, a programme).
- Reversibility: seven positions walked down to the colophon and back up give identical act, span, environment
  and values; a cold jump into the response lands in the same state.
- Reduced motion, no WebGL (`--disable-3d-apis`), and 390 × 844: dark throughout, no console or page errors.

## 9. Cost (measured)

Production builds, 1440 × 900, wheel 90 px every 45 ms, mean fps per zone (and share of frames over 33 ms).
Machine busy (swap in use, a browser and the live wallpaper running), governor active.

Interleaved A/B (first run): the pre-change working tree (backup) vs this build before the shader warm-up.

| Zone | Before (2 runs + 1) | This pass (2 runs) | This pass, after the restyle fix, standalone (2 runs) |
|---|---|---|---|
| Hero | 44.6 / 39.4 / 44.4 | 40.8 / 43.8 | 46.7 / 45.9 |
| Ch. 02 + field studies | 42.9 / 44.1 / 43.3 | 48.6 / 43.9 | 50.2 / 49.2 |
| Ch. 03 | 47.7 / 52.4 / 53.5 | 55.3 / 55.0 | 46.9 / 55.6 |
| Ch. 04 arriving | 37.1 / 39.6 / 33.2 | 26.2 / 45.7 | 38.1 / 41.3 |
| Ch. 04 pinned | 40.9 / 42.1 / 42.5 | 55.7 / 56.0 | 59.3 / 58.8 |
| Closing | 51.6 / 45.8 / 42.7 | 59.0 / 55.9 | 59.4 / 58.5 |
| Colophon | 57.7 / 51.3 / 45.6 | 59.3 / 55.7 | 60.0 / 60.0 |

Reading it: the second half is faster than before (the SVG sheets and the daylight layers cost more than one
relief drawn on demand); the hero and Ch. 03 are within run-to-run spread. Ch. 04's arrival is the one zone
still under 50 fps. Its first cut measured 27–33 fps; the cause was custom properties written on the whole
stage every scrubbed frame (≈520 elements restyled, then forced by later reads — Chrome trace). Values are now
written only where read (§7), which gave 38–48 fps. The one slow A/B run (26.2) showed a few very long frames
at the act's first frame, so the act is now also drawn once through the real post chain while idle; **that last
change was not measured** — the second A/B was stopped by the system for low memory and was not restarted.
Not measured: an idle machine, other GPUs, DPR 2, phones.

## 10. Limits and open

- The field studies are bright daylight worlds by their own design (Master 04) and are protected here; only
  their exit was touched. If the brief's "bright from the snow leopard" meant them, that is a separate decision.
- Vertex3D's 3D was not seen (network filter), as before.
- The dome stays CSS 3D, not WebGL: photographs stay real images with alt text and credits.
- Narrow screens, reduced motion and no-WebGL use the SVG versions on the same dark grounds.
- ETOPO 2022 is still not listed on `/sources` (open since `HOMEPAGE_TERRAIN.md`).
