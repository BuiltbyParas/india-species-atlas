# Interaction experience audit

Branch `atlas/interaction`, cut from `atlas/premium` at `949ebd1` (after Gate 8). Audited on 8 Oct 2026, before any change.

Lusion and XIX3D are a **quality benchmark** for interaction density, spatial feedback and polish. They are not a template. Everything below is judged against one question: does the Atlas behave like one physical system — a toposheet printed at night and drawn by one pen — or like a website with animations?

---

## 1. Current architecture

| Layer | What is there |
|---|---|
| Build | Vite 8, React 19, TypeScript 6, Tailwind 4 (CSS-first tokens in `src/index.css`), oxlint. `postbuild` writes a real `index.html` for every route and species page. |
| Routing | `react-router-dom` 7, `BrowserRouter`. Home (`/`) is eager; every other page is a lazy chunk with a full-height fallback. `/documentary` renders outside the shell. `ScrollToTop` jumps instantly on a path change. |
| Shell (`App.tsx`) | Skip link → `SmoothScroll` (home only) → `CustomCursor` → `Loader` (once per session, home only) → `Navbar` + `FlowingMenu` → routes → `Footer`. `SpeciesProfileProvider` wraps everything (the `?species=` panel). |
| Data | `src/data/*` only: 12 species, regions, programmes, threats, status info, sources. Headline numbers are computed at runtime. Nothing is hard-coded in components. |
| Geography | `src/geo/india.ts` (one projection, `PROJECTION_LAT` 22°), `src/geo/line/*` (the GeoLine primitive, path geometry, the screen-scale watcher). |
| Motion | `src/motion/`: `gsap.ts` (one instance, three registered eases), `SmoothScroll.tsx` (Lenis, home only, ticked by `gsap.ticker`), `preferences.ts` (reduced motion, fine pointer, wide layout as external stores), `useInView.ts`, `chapters.ts` (running chapter title), `intro.ts` (loader → hero hand-off). |

## 2. Current interaction systems

| System | File | State |
|---|---|---|
| Cursor | `cinema/CustomCursor.tsx` | Survey reticle: a dot plus a lagging ring with four ticks. Three states (idle, hover, label). A seven-word vocabulary through `data-cursor`. Splash rings on press. Lerp 0.2 per frame, which is **frame-rate dependent**. Its own rAF, which sleeps when settled (good). Mouse only; it is never mounted for touch or reduced motion (good). |
| Magnetic | `cinema/Magnetic.tsx` | Wrapper span with its own listeners and rAF; lerp 0.18 per frame. Used in **two places** (the finale CTA and the scene's "species page" link). The nav menu button, dome arrows, close buttons and markers are not magnetic. |
| Photo tilt | inline in `SpeciesScene.tsx` | Writes `--px`/`--py` on pointer move, with no smoothing: the image jumps when the pointer enters. This is a one-off; there is no shared primitive. |
| Dome gallery | `cinema/DomeGallery.tsx` | Drag with inertia, its own rAF, sleeps when settled. Good. |
| Curved loops | `cinema/CurvedLoop.tsx` | Text on a path, driven by Lenis velocity, draggable. Its own rAF, paused off screen by an IntersectionObserver. |
| Menu | `layout/FlowingMenu.tsx` | Folding sheet, rows flow in from the edge the pointer entered. Focus trap, Escape. Strong. |
| Atlas map | `map/AtlasMap.tsx` | Leaflet. Survey markers, thread layer, a coordinate readout written straight to the DOM. |
| Buttons | `ui/buttonClasses.ts`, `.cta`, `.text-link` | One button system. Hover underline and CTA line redraw exist. **No press state, no release, no magnetic default.** |
| Page change | `App.tsx` | **None.** A route change is an instant cut to an empty full-height fallback, then the page. This is the single weakest moment of the site: it feels like unrelated pages. |

## 3. Current 3D systems

| Scene | File | Loop | Pointer |
|---|---|---|---|
| Hero relief (home) | `home/heroScene.ts` + `HeroScrollScene.tsx` | Render on demand: `invalidate()` → one rAF → it keeps going only while the pose is still easing. Pauses off screen and in a background tab. Adaptive quality, then a flat fallback via `onTooSlow`. Bloom post chain (`heroPost.ts`). | Pointer parallax already exists (`setPointer`, yaw ±0.12, pitch ±0.09, falling off with descent). |
| Species gallery (`/species`) | `species/galleryScene.ts` | Render on demand, adaptive. | Camera parallax with a touch of roll, hover, drag. |
| Conservation view | `map/conservationScene.ts` | Render on demand. | Pointer hover. |

All three dispose their geometry, materials, textures and renderer. **This is excellent and must not be replaced.** No permanent loop exists anywhere on the site, and the interaction engine must keep it that way.

## 4. Current motion systems

- **Eases.** Three curves shared by CSS and GSAP: `atlas.out`, `atlas.cinema`, `atlas.emphasis`.
- **Durations.** Four tokens: quick, reveal, draw, cinema.
- **The line.** `--draw` is a registered property, so a line can be drawn by scroll, by a transition or by a clock. The nib is the pen.
- **Scroll.** Lenis on home only, ticked by GSAP. ScrollTrigger scrubs are used for pinned scenes (prologue, species scenes, conservation).
- **Reveals.** `RevealText` (word mask), `Reveal` (wipe). Both are CSS transitions keyed off one class, and the text is real.
- **Reduced motion.** It is a real alternate composition, not a disabled one: still prologue, drawn lines, no loader, no cursor.

## 5. Performance constraints (from `PERFORMANCE.md`)

- The home page scrolls at 16.7 / 16.8 ms (p50/p95) on desktop and phone, on a real GPU.
- On a 4×-slowed phone CPU, TBT is dominated by building the relief.
- Main bundle: 95.7 kB gzip. three.js is lazy (136 kB gzip).
- **Known hazard:** writing inherited custom properties on `:root` every frame recalculates style for the whole documentary DOM. Global motion values must be written to the few elements that use them, or read from JS. They must not be broadcast through `:root`.
- **Known hazard:** a second always-on rAF. Each existing loop sleeps when settled; new ones must too.

## 6. Responsive behaviour

- Breakpoints: 640 / 1024 px, and a "wide cinematic" query of 1180 × 680 px. Below that query the pinned layouts become stacked compositions.
- Phones have their own compositions: a map band, a still prologue, a three-column phase key, a recomposed loader.
- No custom cursor, magnetic pull or tilt on coarse pointers. **There is no touch feedback at all**, apart from the native tap.

## 7. Accessibility

- Skip links, landmarks, focus-visible outlines on every control, a dialog focus trap, WAI-ARIA tabs, a captioned locality table, and status never shown by colour alone.
- The cursor and decorative SVGs are `aria-hidden`.
- **Gap:** a route change does not announce the new page or move focus. Screen-reader users stay where they clicked.

## 8. Existing reusable primitives (keep, extend)

`GeoLine` (+ `paths.ts`, `scale.ts`), `RevealText` / `Reveal`, `useInView`, `preferences.ts`, the three eases, `buttonClasses`, `.text-link` / `.cta`, `Magnetic` (API kept, internals to be replaced), the cursor's markup and vocabulary, `lockScroll` / `scrollToTarget` / `getLenis`.

## 9. What is already excellent (do not touch)

- The 3D scenes' render-on-demand loops, adaptive quality and disposal.
- The documentary's chapters, timings and pinned scenes; the bustard prologue; the dome; the finale.
- The GeoLine role vocabulary and its honesty rules: schematic is always labelled, and threads are reading devices.
- The data layer and every on-screen claim.
- The reduced-motion and phone compositions.
- The loader-as-opening.

## 10. What is weak

1. **Route changes are cuts.** There is no continuity between the documentary and the working pages, and no announcement.
2. **The cursor is a follower, not an instrument.** It has no velocity, no direction, no magnetism and no awareness of photographs or lines. Lerp per frame makes it run faster on 120 Hz screens.
3. **Physics are reimplemented four times** (cursor, magnetic, dome, curved loop), each with its own constants. Most are frame-rate dependent.
4. **Magnetism is used twice.** Most important controls are inert until clicked.
5. **No press / release state** on any control. Nothing compresses, so clicks feel weightless.
6. **The photo tilt is unsmoothed and one-off.** Directory cards have only a CSS lift.
7. **Typography is static** apart from the word mask. The chapter titles — the most editorial moment — have no relationship to the line.
8. **The line cannot change shape.** It can be drawn, but never morphs, so "line becomes route becomes rule" cannot be expressed.
9. **No interaction event stream.** Sound or analytics would have to patch every component.
10. **No touch feedback.**

## 11. Opportunities, ranked by effect ÷ risk

| # | Opportunity | Where | Risk |
|---|---|---|---|
| 1 | **Survey-sheet route transition**: a ruled line crosses the screen with its nib, the sheet closes on it, the route changes under cover, and the sheet opens from the line. Focus and an announcement move to the new page. | every route | Low; isolated in the shell. |
| 2 | **One spring + one frame loop** under the cursor, magnetic, tilt, parallax and morph. Time-based, sleeps when settled. | engine | Low |
| 3 | **Cursor as instrument**: spring ring, velocity stretch along the direction of travel, press compression, snap to magnetic targets, auto words (photos → View, lines → Trace), ink trail. | global | Low; mouse only. |
| 4 | **Ink trail that snaps to the line it traces**: over a GeoLine, the trail eases onto the path itself. | scenes, maps | Medium; must sleep. |
| 5 | **Delegated magnetic + hover depth** through `data-magnetic` / `data-depth`: no wrappers, no per-component listeners. | controls, cards, photos | Low |
| 6 | **Press / release / touch feedback** through one delegated state machine (`data-ix-state`), which also emits the sound-ready events. | all controls | Low |
| 7 | **Line titles**: a chapter title is set along a contour, and the contour straightens into the chapter rule. | chapter intros, species pages | Medium; must keep real text. |
| 8 | **Path morphing** (`morph.ts`): resample any two lines and interpolate; spring driven. | titles, transition, onward leg | Low |
| 9 | **Scroll velocity** as a shared store, written only to opted-in elements (`--atlas-velocity`). | loops, threads, cursor | Low |
| 10 | **Photograph as evidence**: crop marks and a shutter reveal around the image, never on it. | species pages, scenes, cards | Low |

## 12. Risks

- **Performance regressions** from global CSS variables or a new permanent loop. Mitigation: per-element writes, one shared loop that stops when idle, scroll-perf re-measured.
- **Gimmick creep.** Every effect must answer to the survey metaphor, and anything that reads as "a website with animations" is cut.
- **Route-transition failure modes:** lazy chunks that are slow to load; query-only changes (`?species=`); hash links; new-tab clicks; the menu closing at the same time; the browser back button. Mitigation: intercept only plain same-origin path changes, wait for the new page's first paint under cover, and never block back / forward.
- **Accessibility:** split letters must stay one word to assistive tech, and the transition must never trap focus.
- **The reel work** on `reel-60` in the main checkout. This branch never touches `video/`, `reel/` or `scripts/video/`.

## 13. Systems that must remain untouched

`heroScene.ts`'s pose and descent maths, `galleryScene.ts`, `conservationScene.ts`, `BustardPrologue`'s beats, `SpeciesScene`'s scrubbed choreography, `DomeGallery`'s physics, the data in `src/data/`, the GeoLine roles and honesty labels, the loader sequence, Leaflet's own interaction on `/atlas` (no smoothing or magnetism on the map canvas), and the reduced-motion compositions.

---

## Plan

Build the engine first (`src/interaction/`), then apply it:

1. `loop.ts`: one frame loop, time-based, idle when nothing moves.
2. `spring.ts`: one spring model (stiffness, damping, mass; semi-implicit, dt-clamped).
3. `pointer.ts`: one pointer store (position, smoothed velocity, speed, type, pressed).
4. `velocity.ts`: one scroll-velocity store (Lenis or native), `--atlas-velocity` on opted-in elements.
5. `events.ts`: a typed event bus for sound-ready events.
6. `state.ts`: delegated idle / hover / focus / press / release state and touch feedback.
7. `magnetic.ts`, `depth.ts`, `parallax.ts`: delegated, attribute-driven.
8. The cursor engine and the ink trail.
9. `transition/`: the route-transition controller and the survey-sheet cover.
10. `morph.ts` and `LineTitle`: line-to-typography.
11. Photograph primitives: crop marks and the shutter.

Then: the full regression pass (1920 / 1440 / 1280 / tablet / 390 / 430; mouse, touch, keyboard, reduced motion), scroll-perf re-measured against Gate 8, and documentation in `documentation/INTERACTION_ENGINE.md`.
