# Interaction engine

Branch `atlas/interaction`. The audit that led to it is [`LUSION_EXPERIENCE_AUDIT.md`](LUSION_EXPERIENCE_AUDIT.md).

The aim: the cursor, the line, the map, the typography, the photographs and the navigation should feel like **one physical system** — a survey sheet worked by one instrument — rather than a set of separate effects. That takes a small number of shared primitives, which components opt into with attributes. Components do not wire their own physics.

```
src/interaction/
  loop.ts               one frame loop; idles when nothing moves
  spring.ts             one spring model + named tunings + springDriver
  pointer.ts            one pointer store (position, velocity, type)
  velocity.ts           one scroll-velocity store; --atlas-velocity on opted-in elements
  events.ts             the interaction stream (sound-ready)
  targets.ts            what counts as interactive
  state.ts              delegated idle / hover / press / release (data-ix), touch marks
  magnetic.ts           data-magnetic
  depth.ts              data-depth
  parallax.ts           useParallax
  trail.ts              the ink trail and line tracing
  morph.ts              resample / interpolate / path-build lines
  ink.ts                the ink-bleed shutter edge
  routeCaption.ts       what the page-turn line says about a destination
  RouteTransition.tsx   the page turn
  InteractionProvider.tsx  installs state, magnetic, depth once
src/components/cinema/
  CustomCursor.tsx      the instrument (rebuilt on the engine)
  Magnetic.tsx          thin wrapper → data-magnetic
  LineTitle.tsx         a title written along a line that becomes its rule
```

---

## 1. Foundation

### Frame loop — `loop.ts`
`schedule(task)` runs `task(dt, now)` on one shared `requestAnimationFrame` until the task returns `false`. When the last task settles, the loop stops asking for frames, so an untouched page costs nothing. `dt` is in seconds and clamped to 1/24 s, which makes motion frame-rate independent (the old cursor and magnetic code moved faster on 120 Hz screens). The 3D scenes keep their own render-on-demand loops: this loop never draws WebGL.

### Spring — `spring.ts`
This is a damped harmonic oscillator, stepped semi-implicitly in fixed 1/240 s sub-steps, so it is stable at any frame rate. `springDriver(springs, render)` steps a group of springs and returns a `kick()`; the group stops by itself when every spring is at rest.

| Tuning | k | c | Used by |
|---|---|---|---|
| `cursor` | 420 | 36 | the reticle following the hand |
| `release` | 620 | 26 | press compression; one small rebound |
| `magnetic` | 240 | 26 | controls leaning to the pointer |
| `depth` | 150 | 22 | photographs and cards turning |
| `parallax` | 38 | 14 | whole-layer drift; almost subconscious |
| `line` | 90 | 19 | a line changing shape |

Damping is near or above critical everywhere except `release`: **the atlas settles; it does not bounce**. The rebound when a press is released is the only exception, and the line title's "pluck" uses its own loose string tuning.

### Pointer — `pointer.ts`
One passive `pointermove` on the window keeps `x, y`, normalised `nx, ny` (−1 → 1), the pointer `type`, `down` and `target`. It also keeps a time-smoothed velocity in px/s, which decays by itself once the hand stops. Subscribe with `onPointerMove` / `onPointerExit`; read the velocity with `pointerVelocity()`.

### Scroll velocity — `velocity.ts`
- **Source.** Lenis's own velocity where it runs (the documentary), otherwise the native scroll delta. Either way it is smoothed on a spring to a 0 → 1 `level` (3600 px/s counts as "fast"), and it settles when scrolling stops.
- **From JS:** `scrollVelocity()`, `scrollSpeed()`, `onScrollVelocity()`.
- **From CSS:** `bindVelocity(el)` / `useVelocityVar(ref)` writes `--atlas-velocity` (0 → 1) and `--atlas-velocity-dir` (±1) on that element only.
- **Never on `:root`.** An inherited property changed on the root every frame restyles the whole documentary. That was measured: binding it to the five scene maps alone added ~10 frames over 33 ms per scroll of the page, so it was removed from them.
- **Where it is used now:**
  - The curved loops run faster in the direction of a fling.
  - The route-progress map thickens the reader's route a hair, then settles.

### Interaction stream — `events.ts`
`emit(type, detail)` / `on(type, fn)`. Each event is also dispatched on `window` as `atlas:<type>`.

| Event | Emitted by |
|---|---|
| `interaction:hover` | `state.ts`: a control is newly under the pointer |
| `interaction:press` | `state.ts`: pointer down on a control (with pointer type) |
| `interaction:click` | `state.ts`: a control was activated (keyboard included) |
| `navigation:start` / `navigation:end` | `RouteTransition.tsx` |
| `chapter:start` | `motion/chapters.ts`: the running chapter changed |
| `species:enter` / `species:exit` | `SpeciesWorldPage.tsx` |

**Nothing plays audio.** A sound layer would subscribe here and nowhere else. The cursor already listens to `atlas:navigation:*` to re-target after a page change.

---

## 2. Control states and touch — `state.ts`

One delegated set of document listeners writes `data-ix` on whichever control (`targets.ts` → `INTERACTIVE`) the pointer is acting on:

| `data-ix` | Meaning | CSS response |
|---|---|---|
| *(none)* | idle | — |
| `hover` | pointer over it (mouse, pen) | e.g. `.ix-close` turns its cross 45° |
| `press` | held down | `scale: 0.955` (menu rows 0.985) |
| `release` | just let go (≈ 420 ms) | springs back through `--ix-scale`, with one small overshoot |

- **Focus** stays with `:focus-visible`.
- **Composition.** The press uses the individual `scale` property, so it composes with the magnetic `translate` and with a control's own `transform`. Controls with transitions of their own append `var(--ix-scale)` to them. Buttons from `buttonClasses()` carry `ix-press`.
- **Touch** has no cursor, so a press leaves a **touch mark** (`.touch-mark`): two contour rings where the finger landed, the touch twin of the reticle's splash. It is not shown with reduced motion.

## 3. Magnetic — `magnetic.ts`

`data-magnetic` (optional strength, default 0.3) makes a control lean towards the pointer on the `magnetic` spring. It holds on for 22 px past its edge and settles home on leave.

- **The pull is capped by size:** `min(14, 4 + 0.2 × min(w, h))` px, so a long link moves no further than a small button.
- **`data-magnetic-inner`** marks a child (usually the label) that travels 0.45× further. That gives the pull depth rather than a slide.
- **Mouse and pen only,** never with reduced motion. One delegated subscription; nothing runs while no control is engaged.
- **`magneticFocus()`** exposes the engaged control to the cursor.
- **`Magnetic.tsx`** is now only a span carrying the attribute.

**Applied to:** the menu button (with its label as the inner), the finale CTA and its three text links, each scene's "species page" and "Quick profile" links, the dome arrows and "Open profile", the species page's previous / next links, the profile close button, and the 404 buttons.

## 4. Hover depth — `depth.ts`

`data-depth` on an element that **does not move**. While the pointer is over it, the depth spring eases `--dx`, `--dy` (−0.5 → 0.5) and `--dh` (0 → 1) on it. CSS decides what responds:

- **Photographs** (`.photo-frame`):
  - the print drifts up to 16 px inside its frame and scales by 3.5%;
  - a soft-light highlight follows the pointer;
  - **crop marks** close in from 22 px to 12 px, the way a print is marked for the press;
  - the photograph is evidence, so every effect stays around it;
  - crop marks are hidden on contained (letterboxed) prints, where the frame's corners are not the print's.
- **Directory cards** (`.depth-card`):
  - the card turns at most 4° / 5°;
  - its photograph drifts the other way;
  - a light crosses it.

  The card's hover lift moved from `transform` to `translate`, so the tilt is never transitioned.

## 5. Pointer parallax — `parallax.ts`

`useParallax(ref, depth)` registers a layer. One slow spring follows the pointer's place in the viewport, and each **visible** layer (an IntersectionObserver) moves by up to `depth` px. Positive depth moves towards the hand, negative away from it.

| Layer | Depth |
|---|---|
| Chapter intro: the chapter label | −6 |
| Chapter intro: the statement | +5 |
| Species page: the blurred atmosphere | −18 |

The hero relief's camera parallax is unchanged (`heroScene.setPointer`).

## 6. The instrument — `CustomCursor.tsx`

The reticle has the same identity as before (the dot, the hairline ring, the four ticks). It is now an instrument with weight:

- **Physics.** The ring follows the hand on the `cursor` spring. It stretches along its own velocity, by up to 22%, rotated to the direction of travel, so the stretch eases away as it catches up. A press compresses it to 0.72 on the `release` spring, and it rebounds once on release.
- **States.**

  | State | When | Look |
  |---|---|---|
  | `idle` | over nothing | reticle and four ticks |
  | `hover` | over any control | reticle opens |
  | `label` | element names its action (`data-cursor`) | filled reticle carrying the word |
  | `lock` | a magnetic control | the ring leaves the hand and closes on the control as four corner marks, its word set at the top-right corner in contour |
  | `area` | `data-cursor-area="Explore"`, drag surfaces | small reticle, word set beside it in small caps; never hides the map |
  | `trace` | the ink trail has found an atlas line | contour reticle, "TRACE" |
  | `text` | a text field | steps aside for the system caret |

- **Vocabulary.** Discover, Enter, Trace, Locate, Turn, Define, Drag, plus **Explore** (atlas map, conservation view), **Open** (directory cards), **Follow** (the next species), **Return** (the previous species, breadcrumb).
- **Scroll.** When the page scrolls under a still hand, the browser does not re-target the pointer. The cursor re-checks what is under it at most every 140 ms, rather than hit-testing every frame (that cost frames, see §10). A page change re-targets it too.

## 7. The ink trail — `trail.ts`

Inside a `data-trail` region, moving the mouse leaves a thin ink line:

- **Fade:** it dries in 0.65 s.
- **Strength:** it gets fainter with slower movement, so reading with a hand on the mouse leaves nothing.
- **Ticks:** it carries **chainage ticks** every 56 px, the marks a surveyor rules along a traverse.
- **Scroll:** it moves with the page, as ink on paper would.
- **Controls:** it never draws over them.

**Tracing.** Near one of the atlas's own lines (any drawn `GeoLine`, within 26 px), the ink eases off the hand onto the line itself, in the contour colour, and lasts 1.1 s. The reticle says **Trace**.

- **Honesty.** The trail never invents a line. It only follows one already drawn: lines still being drawn (`--draw` < 0.98) or invisible are ignored.
- **Sampling.** Lines are sampled once per path in their own units (≤ 240 points, cached by `d`), and the pointer is mapped into each path's space through its CTM.
- **Implementation.** One canvas, DPR ≤ 2, stepped only while ink is visible.
- **Regions:** the hero, chapter intros, the bustard prologue, every species scene, the conservation chapter, the finale, the species page's map and chapters, and the 404.

## 8. Lines that change shape — `morph.ts`, `LineTitle.tsx`

`morph.ts` provides:
- `resample(d, n)`: any path to n points along its length;
- `sampleFn(fn, x0, x1, n)`;
- `lerpPoints`;
- `toPath` (Catmull–Rom to cubic Béziers);
- `toPolyline`.

Two shapes need not share commands.

**`LineTitle`** is CONTOUR → TYPOGRAPHIC PATH → RULE:
1. A pen draws a gentle, tapered contour under the title.
2. The letters are set onto it as the nib passes, each tilted to the slope and resolving out of a slight ink blur.
3. After about 1.15 s the contour straightens over 1.25 s (`atlas.cinema`), and the letters settle onto a level baseline.
4. What remains is a hairline rule.
5. Afterwards the rule stays a little alive. With a fine pointer, the hand near the baseline pulls it by up to 7 px, like a ruled string, and the letters above that point ride with it.

The contour is a typographic device and makes no claim about any place.

- **Accessibility.** The title is real text: an `sr-only` copy, with the split letters and the rule `aria-hidden`. The page-change announcement strips presentation copies.
- **Reduced motion:** level and ruled from the start.
- **Used on:** every species page's name, and the 404.

## 9. Photographs — shutter and ink — `SpeciesScene.Photo`, `ink.ts`

**`<Photo shutter />`** (species pages):
1. A contour rule draws across the middle of the frame.
2. The print opens from it, top and bottom (the bustard's way in, as the atlas's way of showing a print).
3. The rule fades.

**Ink bleed** (`useInkBleed`). While the shutter opens, the print's edges run like ink taken up by paper:
- A low-frequency SVG turbulence displaces the image. It is strongest as it opens and gone by the time it is open.
- The filter is then **removed**, so the photograph is never left distorted.
- Desktop only; never with reduced motion. Measured at 16.7 / 16.8 ms (p50 / p95) while active.

This is the atlas's one liquid effect. It is ink and paper: no glitch, no RGB split, no blob.

## 10. Page turn — `RouteTransition.tsx`

**LINE → SCREEN → PAGE:**
1. A plain same-site link click that changes the path is taken over.
2. A rule is drawn out from the point pressed, with two nibs running to the screen edges.
3. The sheet, with a faint 96 px graticule, unfolds from the rule above and below.
4. The destination is named on the rule (`routeCaption.ts`, every word from the dataset or the page): for a species, its number, name, anchor locality and coordinates; otherwise the page and what it holds.
5. Under cover the route changes, and the menu closes without its exit animation (`.is-turning`).
6. The new page's lazy chunk is waited for, until the fallback is gone (≤ 3 s).
7. The sheet parts from the same line, and the rule lifts.

- **Timing:** close 560 ms; open 760 ms.
- **Not taken over:** modified clicks, new tabs, downloads, `target`, hash-only and query-only changes (the `?species=` panel), `/documentary` (a separate shell), and back / forward. Clicks during a turn are ignored.
- **Keyboard:** a keyboard "click" draws from the link's centre.
- **Reduced motion:** no line; the sheet fades in (200 ms), names the page, and fades out (260 ms).
- **Accessibility (new):** after every page change, ours or the browser's, focus moves to `main` (`tabIndex=-1`, no scroll), and the new `h1` is announced in a polite live region.

---

## Responsive and reduced motion

| | Desktop (fine pointer) | Tablet / phone (touch) | Reduced motion |
|---|---|---|---|
| Cursor, trail, tracing | yes | no (system) | no (system) |
| Magnetic, depth, parallax | yes | no | no |
| Press / release scale | yes | yes | no |
| Touch marks | — | yes | no |
| Page turn | line + sheet | line + sheet from the tap | fade + caption |
| Line titles | written, straightened, plucked | written, straightened | level from the start |
| Photo shutter | yes + ink bleed | yes | opens at once |

## Performance — measured on the real GPU, production build

Scrolling the whole home page in 40 px steps, at 823 frames per pass (`scratch perf.mjs`; baseline = Gate 8 build):

| | p50 / p95 / p99 (ms) | frames > 33 ms per pass |
|---|---|---|
| Baseline, desktop | 16.7 / 16.7 / 16.8 | 1–3 |
| Interaction, desktop, mouse on page | 16.7 / 16.8 / 16.8 | 2–3 |
| Interaction, desktop, no mouse | 16.7 / 16.7 / 16.8 | 1 |
| Baseline, phone (390, touch) | 16.7 / 16.8 / 16.8 | 2 |
| Interaction, phone | 16.7 / 16.7 / 16.8 | 2–5 |

Two regressions were found during this work and fixed:
1. `--atlas-velocity` bound to the scene maps (+10–20 slow frames). It is now bound only to the small route-progress map.
2. The cursor hit-testing and sampling lines on every scroll frame (+20). It now re-checks at most every 140 ms and lays ink only on real pointer movement.

**Payload.** The entry plus its modulepreloads (gzip) went from 201.8 kB to 209.2 kB: +5.6 kB JS, +1.8 kB CSS. `LineTitle` lives in the species page chunk.

**Idle cost.** None added: no engine task is scheduled while nothing moves (`activeTasks()`). Counting `requestAnimationFrame` calls over 2 s of an idle page gives the same figure on the baseline and on this branch, about 64 per second on `/atlas`, `/species` and a species page. That steady loop is pre-existing and is not the engine's: it comes from inside GSAP's ScrollTrigger (a self-rescheduling rAF in the bundled library). It is noted as a candidate for a later fix, not changed here.

## Adding to it

- A control that should pull: `data-magnetic` (and `data-magnetic-inner` on its label).
- Something that should name its action: `data-cursor="Word"`. A region: `data-cursor-area="Word"`.
- A photograph or plate that should turn to the light: `data-depth`, with CSS reading `--dx/--dy/--dh`.
- A region where the hand draws: `data-trail`.
- A layer with depth: `useParallax(ref, ±px)`.
- A value that should feel the scroll: `useVelocityVar(ref)` on a **small** element, or `onScrollVelocity` in JS.
- A sound, an analytics hook or a test: `on('interaction:…')`.

Do not add a new `requestAnimationFrame` loop or a new spring: use `schedule` and `Spring`.
