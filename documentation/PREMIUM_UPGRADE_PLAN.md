# India Species Atlas: premium upgrade plan

Gate 0 (repository audit). Written 8 October 2026 on branch `atlas/premium`, which was branched from `487c5fb`.

This document records the state of the Atlas before the premium upgrade begins. It covers:

- what exists;
- what must be kept;
- what needs work;
- the measured baseline;
- the order the later gates will follow.

Nothing in `src/` was changed in this gate.

> **Base commit.** `main`, the live GitHub Pages build, is three fixes behind the newest site code: the political-map J&K merge, the Esri basemap, and the loader/header fix. `487c5fb` contains all three, so it is the starting point. The 60-second reel work still in progress on `reel-60` is untouched: the upgrade runs in its own worktree (`../india-species-atlas-premium`).

---

## 1. Current architecture

### Stack
- **App and build:** React 19, Vite 8, TypeScript 6.
- **Styling:** Tailwind 4. Tokens sit in `@theme` inside `src/index.css`, which is 1,803 lines long.
- **Routing:** react-router 7.
- **Motion:** GSAP 3 with ScrollTrigger, and Lenis for smooth scrolling. Lenis runs on the home page only.
- **3D:** three.js 0.182. It is a lazy chunk, used by the home hero, the species gallery and the opt-in 3D Conservation view.
- **Maps:** Leaflet with react-leaflet. The basemap is Esri World Ocean Base, with state outlines drawn from `public/india-states.geojson`.
- **Other:** `qrcode` and `lucide-react`. There is no charting library; the charts are custom.
- **Deploy:** `.github/workflows/deploy.yml` builds on every push to `main` with `VITE_BASE=/<repo>/`.

### Routes (`src/App.tsx:70-77`)

| Route | Page | Loading |
|---|---|---|
| `/` | HomePage, the scroll documentary | eager (`App.tsx:10`) |
| `/atlas` | Leaflet map: Species, Threats and Conservation modes, density shading, opt-in 3D view | lazy, and `AtlasMap`/`ConservationView` are lazy inside it |
| `/species` | 3D photographic gallery and a grid, with search and filters | lazy |
| `/compare` | 2–3 species side by side (`?ids=`) | lazy |
| `/conservation` | IUCN ladder, charts, timeline, programmes | lazy |
| `/about`, `/sources` | project and references | lazy |
| `/documentary` | five-minute deterministic presentation, rendered outside the site shell | lazy (`App.tsx:46-52`) |

Species profiles are a slide-in dialog opened with `?species=<id>` on any route (`src/components/species/SpeciesProfileProvider.tsx`). There is no `/species/:id` route. `public/_redirects` and the postbuild 200-fallback mean a new path route would be served correctly.

### Home page, the documentary (`src/pages/HomePage.tsx:27-80`)
1. **CinematicHero (chapter 1, "The map").** A three.js relief of India (`components/home/heroScene.ts`, `heroPost.ts`, `heroTerrain.ts`) scrubbed by a `--p` CSS variable. Captions run on CSS `calc()` (`index.css:991-1009`). Without WebGL it falls back to `FlatIndia` (SVG).
2. **CurvedLoop.** Region names on a text path.
3. **ChapterIntro 2.** Three `InteractiveStat` counters computed from the data.
4. **Five SpeciesScenes.** Bustard → tiger → dolphin → snow leopard → rhino (`HomePage.tsx:20`).
   - Each scene is a 440vh sticky pin. A ScrollTrigger scrub writes `--range`, `--threat`, `--cons` and `--zoom` (`SpeciesScene.tsx:214-243`).
   - Each drives a three-layer SVG map, `SpeciesMap`: where it lives / what cuts through it / what protects it.
5. **ChapterIntro 3 + DomeGallery.** A draggable CSS-3D dome, not WebGL.
6. **CurvedLoop.** Scientific names.
7. **ConservationChapter.** Every species' thread on one map, broken and then rejoined. It is a 320vh pin scrubbing `--frag`, `--prot` and `--draw` (`ConservationMap.tsx:201-216`).
8. **FinalChapter (chapter 5).** The lines converge on India.
9. **GeoProgress.** A fixed route-line overlay: a small India with a line visiting each species' anchor as you scroll.

**How the pieces are driven:**
- **Pinning:** CSS `position: sticky`. ScrollTrigger only scrubs timelines that write CSS variables.
- **Hero:** its own window scroll listener (`HeroScrollScene.tsx:152-163`).
- **Chapter tracking:** `src/motion/chapters.ts`, a scroll listener plus a `getBoundingClientRect` store that feeds the Navbar title.
- **One-shot reveals:** `src/motion/useInView.ts`, an IntersectionObserver.

### Geography (`src/geo/india.ts`)
- **`project()` (`:26`):** a fixed equirectangular projection, cos 22°, into a 1000-wide `MAP_VIEWBOX` (`:24`).
- **`smoothPath()` (`:146`):** Catmull-Rom to cubic Béziers.
- **`useIndiaGeo()` (`:113`):** the state `d` strings, `byName` and bounds, cached.
- **The 3D relief uses its own fit** (`utils/geoExtrude.ts:146`, `LAT0 = 22.5`). It is close to `project()` but not identical.

### Motion preferences and capability
- **`src/motion/preferences.ts`:** `useReducedMotion`, `useFinePointer`, `useWideLayout` (minimum 1180×680), and plain getters.
- **`src/utils/canRender3D.ts`:** returns false under reduced motion, Save-Data, 2g, `deviceMemory ≤ 2` or `cores ≤ 2`; otherwise it runs a real WebGL probe.
- **Layout switch:** SpeciesScene and Conservation fall back from Pinned to Stacked when the layout is not wide or reduced motion is set.
- **Hero fallback:** the hero drops to the flat map when `canRender3D` fails, when `onTooSlow` fires, on context loss, or when reduced motion is turned on mid-session.

### Data (`src/data/`)
- **Contents:** 12 species in `species.ts`, plus `programmes.ts`, `threats.ts` (8 categories), `sources.ts`, `statusInfo.ts` and `regions.ts`. The regions are 8 coarse outlines, explicitly *not* biogeographic boundaries.
- **The `Species` type (`src/types/index.ts:211-249`):**
  - names, IUCN status, assessed year and status history;
  - regions, states and habitat tags;
  - prose fields;
  - `majorThreats`, actions, programme ids, protected-area *names*;
  - `distributionPoints` (`lat`, `lng`, `label`);
  - a credited `image`, plus sources and `lastVerified`.
- **No numeric population, range area or altitude field exists.** Numbers appear only inside cited prose.
- **Every headline figure on the site is computed from this data at runtime** (`src/utils/stats.ts` and others).

### Images
- **What ships:** 12 credited Wikimedia Commons JPGs in `src/assets/species/`, imported as ES modules. Each is 1400 px wide and between 30 and 607 kB.
- **Rendering:** `SpeciesImage.tsx` uses `loading="lazy" decoding="async"` and falls back to a placeholder if a photo fails.
- **Credits:** `PhotoCredit.tsx` renders them on the profile, gallery, species scene and dome.

---

## 2. What is already excellent (preserve)

- **The concept.** "Lines on the map": the home page argues one idea from the hero to the finale. This is the identity the upgrade builds on, not something to replace.
- **The species scene's three-layer map.**
  - The layers are: where it lives (states of record, indicative localities, a thread), what cuts through it (one hatch per recorded threat), and what protects it (programme sites).
  - All of it is scroll-scrubbed through CSS variables rather than per-frame React updates.
- **Data honesty in every drawing.**
  - Shaded states are states of record, never range polygons.
  - Threads are labelled as a reading device.
  - A threat's hatch covers the species' states evenly, and the map says so.
  - No figure is typed by hand.
- **Real, credited photography.** The photographs are never presented as anything else.
- **The three.js hero.**
  - It renders on demand and pauses when off-screen or when the tab is hidden.
  - DPR is capped at 1.5, with adaptive degradation (DPR 0.85 → 0.62, then no DoF, then no bloom).
  - Fallbacks cover context loss and too-slow devices.
  - It has thorough `dispose()`.
- **The loader concept.** A survey line, the country's extent written at its ends, state boundaries drawing in, and a 01–05 checklist tied to real loading work. This is already the right language for the Gate 6 intro.
- **Typography and palette.**
  - Typefaces: Newsreader (serif, optical sizing) and Geist.
  - Palette: forest 950–200, canvas `#e8e1cf`, parchment, contour/clay `#b07a52`, river `#7ea3b5`.
  - IUCN status colours are always paired with text.
- **Cursor discipline.** The custom cursor is off on touch and under reduced motion, and its RAF loop stops once the cursor settles.
- **Working-page features.** Compare with URL state, saved lists shared by link, density shading that counts species rather than pins, a timeline that names its own gaps, profile tabs with full keyboard support, and a skip link.

## 3. What should not be touched

- **Facts and sources.** `src/data/*`, the source/credit system, and the rule that figures are computed rather than typed.
- **Geography.** The `project()` coordinate system and `india-states.geojson`, now drawn as one continuous political J&K.
- **Leaflet on `/atlas`.** Its role as the working map: the data-first pages stay legible and are not turned into scroll theatre.
- **Home chapter order and concept.** Map → species → selection → fragmentation to protection → what remains.
- **The opt-in 3D Conservation view** and every non-WebGL fallback.
- **`video/`, `reel/` and `scripts/video/`.** These belong to the film and reel pipelines.

---

## 4. What needs polish

Evidence comes from the code audit and from screenshots at 1440×900, 390×844 and with reduced motion.

### Typography and spacing system
- **Font sizes.**
  - There are 112 arbitrary `text-[…]` uses with **46 distinct values**. The commonest are 13px ×22, 11px ×13 and 10px ×8, and some go down to 7–9px.
  - There are also 17 different `clamp()` display sizes and one-off rem values (`1.18rem`, `1.15rem`, `1.3rem`…).
- **Tracking:** 14 distinct values. Uppercase eyebrows use 0.12 / 0.14 / 0.16 / 0.18 / 0.2em, and display headings use −0.01 to −0.045em on top of a global −0.012em.
- **Line height:** 11 distinct `leading-[…]` values.
- **Missing tokens:**
  - There are no type, spacing or z-index tokens.
  - z-index values are ad hoc: 500, 1500, 1600, 2000.
  - 22 hard-coded `font-size` declarations live in component CSS.
- **Two visual dialects.**
  - The cinematic layer speaks in light serif with hairlines.
  - `/atlas`, `/species` and `/conservation` use semibold serif headings and rounded, bordered card boxes, which read as generic app UI next to the documentary.

### Defects seen on screen
- **Desktop species scene.** The map captions at the top of the map column cross-fade on top of each other, so two notes are legible at once.
- **Phone header.** Body text scrolls visibly through the "India Species Atlas" wordmark: the scrim does not fully back the header.
- **Phone phase tabs.** "1 Where it lives / 2 What cuts through it / 3 What protects it" wraps onto two uneven rows.
- **GeoProgress breakpoint.** GeoProgress shows from 1024px (`index.css:1658`), but the pinned layout starts at 1180px, so between those widths the route line sits over the stacked layout.
- **Loader.** Step "05 Sheet ready" is only a minimum timer, not a real signal. The comment at `Loader.tsx:23` ("documentary page only") is stale.
- **Smooth scroll.** `html { scroll-behavior: smooth }` (`index.css:60`) conflicts with Lenis, and the Lenis CSS is not imported.
- **Stale comment.** `SpeciesImage.tsx:11-16` still says the atlas "ships with no bundled photographs".
- **Missing credits.** Photo credits are absent on `SpeciesCard` and on `/compare`.
- **Hard-coded label.** "Chapter 04" is literal text (`ConservationMap.tsx:224, 271`) rather than coming from the chapter store.

### Accessibility
- **Profile dialog:** no focus trap, and focus does not move into it or return afterwards (`SpeciesProfileProvider.tsx:61-72`).
- **Mode and view tabs:** `ModeSwitch` and the `/species` Gallery/Grid tabs have `role="tab"` but no arrow keys, roving tabindex or `aria-controls`.
- **`/documentary`:** no skip link and no landmarks.
- **Inconsistent queries:** reduced motion and pointer type are queried directly with `matchMedia` in places (`SpeciesScene.tsx:158`, `HeroScrollScene.tsx:249`, which uses a different pointer query). `CurvedLoop` reads reduced motion once and does not react if it changes.

### Tokens and duplication
- `--color-contour` and `--color-clay` are the same hex.
- `src/theme.ts` repeats the `@theme` palette by hand.
- There are three CSS easing tokens plus three GSAP easing defaults.
- **Magic numbers.** Scene timeline offsets (0.17/0.22/0.5/0.74), phase thresholds (0.2/0.48/0.72) and jump targets (0.36/0.6/0.86) are duplicated in `SpeciesScene.tsx:218-249`.

### The six line systems (input to Gate 2)

| System | Geometry | Driver | Stroke |
|---|---|---|---|
| Loader survey line | a `div` with scaleX keyframes (not a path) | CSS keyframes | n/a |
| CurvedLoop | hard-coded path in a 1440×200 viewBox, not geographic | `textPath startOffset` on every RAF frame | hairline |
| GeoProgress route | `project()` anchors, bowed `smoothPath` legs | scroll handler writes `strokeDashoffset` | 1.2 |
| Species thread | `threadPath()`/`chain()`, broken at gaps over 5° | CSS `calc(1 - var(--range))` | 1.4 |
| Conservation threads | reuses `threadPath` | CSS dasharray from `--frag`, colour from `--prot` | 1.4 |
| Final converge | `smoothPath([anchor, mid, CENTRE])` with an inline perpendicular mid point | class transition `.is-shown` | 1.6 |

- **Shared:** `project`, `smoothPath`, and the `pathLength=1` + `stroke-dashoffset` + `vector-effect: non-scaling-stroke` convention.
- **Not shared:** each system has its own CSS class, stroke weight and driver.
- **Duplicated maths:** the bow/mid-point maths appears twice (GeoProgress and FinalChapter).
- **Misplaced helpers:** `threadPath`/`chain` are exported from a component file (`SpeciesMap.tsx:51-91`).

The upgrade's "one line" is therefore *mostly a consolidation*. These systems already exist and already mean the right things. They need one primitive, one stroke vocabulary and one driver.

---

## 5. Performance baseline

Measured on 8 October 2026 against a production build (`vite build`) served locally. The client was headless Chromium (Playwright 1.63) with SwiftShader WebGL. Desktop was 1440×900; the phone was emulated at 390×844 with DPR 2 and touch. These are **lab numbers on a fast local connection, not field data**. GPU-dependent frame times under SwiftShader are indicative only. Gate 1 adds a Lighthouse mobile run for LCP, CLS and TBT.

### Bundles

| Chunk | Raw | Gzip | Notes |
|---|---|---|---|
| `index` (main) | 464 kB | 155.7 kB | includes HomePage, GSAP, Lenis, router and the shell. Every route pays for the home page. |
| `three.module` | 536 kB | 136.2 kB | lazy |
| `AtlasMap` (Leaflet) | 158 kB | 47.0 kB | lazy, `/atlas` only |
| `heroScene` | 27 kB | 11.3 kB | lazy |
| `AboutPage` | 33 kB | 12.3 kB | lazy |
| CSS | 119 kB | 25.3 kB | one file |

### Assets
- **Photographs:** 12 JPGs, 3.2 MB in total. The largest are nilgiri-tahr (607 kB), indian-rhinoceros (367 kB), asian-elephant (311 kB) and bengal-tiger (294 kB). There are no WebP/AVIF versions, no `srcset`/`sizes`, and no intrinsic `width`/`height`.
- **Fonts:** from Google Fonts, through a render-blocking stylesheet `<link>`. Newsreader roman and italic are about 270 kB; Geist is 29 kB.
- **`india-states.geojson`:** 132 kB. It is fetched **twice** on `/atlas`.

### Page loads (local)

| Page | Transfer | Requests | FCP | Notes |
|---|---|---|---|---|
| `/` desktop | 1.68 MB | 12 | 1.28 s (cold, first run) | three.js + bustard photo + geojson |
| `/` phone | 1.83 MB | 13 | 0.46 s | **three.js is fetched on phones too.** `canRender3D` passes on capable phones, and the hero has no `useWideLayout` gate. |
| `/` reduced motion | 1.28 MB | 10 | 0.46 s | no three.js, flat map |
| `/atlas` | 1.74 MB | 34 | 0.36 s | map tiles; geojson twice |
| `/species` | **4.23 MB** | 29 | 0.37 s | the 3D gallery loads all 12 photos plus three.js up front |
| `/conservation` | 1.08 MB | 12 | 0.38 s | |
| `/compare` | 1.07 MB | 12 | 0.33 s | |

### Runtime
- **Home scroll frame times** (scripted scroll through the first half of the page): p50 16.7 ms and p95 16.8 ms on desktop and phone. No long frames were observed.
- **`/species` gallery:** p50 50 ms and p95 67 ms under SwiftShader. This is a WebGL software-rasteriser artefact and needs confirming on a real GPU, but the gallery is the heaviest view on the site.
- **Errors:** no console errors on any route.
- **Overflow:** no horizontal overflow at 1440 or 390.
- **Hazards found in code:**
  - two **continuous** CurvedLoop RAF loops while on screen;
  - four window scroll listeners plus ScrollTrigger's own (`chapters.ts`, GeoProgress, HeroStage and Navbar). The HeroStage listener is not RAF-throttled;
  - `setState` called inside ScrollTrigger `onUpdate` (SpeciesScene `setPhase`), in GeoProgress `setShown`, and in DomeGallery `setCenter` on every frame. React bails out of the re-render, but the calls still run;
  - `chapters.ts` reads `getBoundingClientRect` for every chapter on every scroll frame;
  - around 36 dome tiles animate `filter: saturate() brightness()` per frame while dragging;
  - `blur(60px)` on the dome atmosphere, `filter: blur()` transitions on `.phase-panel` and `.reveal-fade`, and `backdrop-filter` on `.map-tip`;
  - InteractiveStat calls `setState` every frame for 1.4–1.9 s per counter;
  - the hero builds the plate atlas even though plates are disabled on the home page;
  - in dev StrictMode the hero can create two WebGL contexts, because `forceContextLoss()` is never called.

---

## 6. Scientific-data constraints for later gates

The brief asks for annotations, ranges and map layers. This is what the data can support **today**.

**Supported:**
- `lat`/`lon` of every distribution point, already used as `formatDeg` labels;
- counts of states/UTs and of localities;
- the IUCN status and its `statusAssessedYear`, plus status history;
- programme start years (Project Tiger 1973, Project Snow Leopard 2009, Project Dolphin 2020, the GIB conservation breeding programme 2016, Indian Rhino Vision 2005, …);
- habitat tags;
- the snow leopard's "typically 3,000–5,000 m" and the red panda's 2,400–4,000 m, written exactly as sourced;
- population phrases *exactly as written and cited*: tiger "roughly 3,700" (2022), snow leopard "about 718" (SPAI 2024), rhino "around 4,000" across India and Nepal, bustard "low hundreds", dolphin "low thousands" across three countries.

**Not supported. These will not be shown unless a source is added first:**
- any range area in km², as in the brief's example "RANGE 14,000 KM²";
- any single altitude, as in "ALT. 1,842 M";
- exact counts for the bustard or the dolphin;
- weights, sizes or trend percentages for the five featured species.

**Map layers for Gate 5:**
- The data has **no** rivers, forests, habitat polygons, protected-area polygons or transmission lines. `programmeSites.ts:13-16` already records that no licensed protected-area geometry exists.
- The layers that can be built now are species (points), states and threats (tags only, no geometry).
- Rivers, forests and protected areas each need a dataset that is sourced, licensed and chosen **by the project owner before Gate 5 starts**. Candidates to evaluate then:
  - Natural Earth rivers (public domain);
  - WDPA protected areas (licence restricts redistribution);
  - forest cover (source to be identified).

**Gate 7 transmission line.** The "power-line collisions" threat is recorded for the bustard, but no real line alignment is held. The transition's line must be a **schematic** line, labelled as such, and must not imply a mapped alignment.

**Generated imagery.** None is planned for the site. Animals are only ever the credited photographs. If generated environmental imagery is ever proposed, it carries an on-screen "visualisation" label.

---

## 7. Implementation order and files likely to change

Every gate runs the same loop: inspect, make the smallest correct change, build, look at 1440 / 1024 / 390 / reduced motion, fix, checkpoint (commit and tag `atlas/premium-gate-N-…`), document, report. Nothing is pushed or merged to `main` without the owner's go-ahead.

| Gate | Scope | Main files |
|---|---|---|
| **1 — Foundation** | Type, spacing and z tokens; defect fixes; editorial voice on the data pages; cursor vocabulary; accessibility; performance | `src/index.css`, `src/theme.ts`, `index.html`, `layout/Navbar.tsx`, `layout/FlowingMenu.tsx`, `cinema/CustomCursor.tsx`, `cinema/Loader.tsx`, `cinema/GeoProgress.tsx`, `cinema/SpeciesScene.tsx`, `cinema/SpeciesMap.tsx`, `cinema/CurvedLoop.tsx`, `home/HeroScrollScene.tsx`, `species/SpeciesProfileProvider.tsx`, `species/SpeciesGallery.tsx`, `ui/SpeciesImage.tsx`, `pages/AtlasPage.tsx`, `pages/SpeciesPage.tsx`, `pages/ConservationPage.tsx`, the ModeSwitch component |
| **2 — Line system** | One `GeoLine` primitive (points or `d`, progress, weight, role, label) on `project`/`smoothPath`; `threadPath`/`chain` move into `src/geo/`; the six systems migrate onto it one at a time | new `src/geo/line/*`, `geo/india.ts`, GeoProgress, SpeciesMap, ConservationMap, FinalChapter, Loader |
| **3 — Species world** | An additive `/species/:id` route that reuses the SpeciesScene/SpeciesMap/SpeciesProfile parts. The bustard is finished first, then the other four. The `?species=` dialog stays. | `App.tsx`, new `pages/SpeciesWorldPage.tsx`, shared species-scene pieces |
| **4 — Spatial atlas** | Extend the existing hero camera India → region → habitat, and reconcile the 2D/3D projections | `home/heroScene.ts`, `HeroScrollScene.tsx`, `utils/geoExtrude.ts` |
| **5 — Explorer** | An editorial layer pass on `/atlas` (species, states, threats, conservation), plus new layers only where a sourced dataset exists | `pages/AtlasPage.tsx`, `map/*` |
| **6 — Intro** | Evolve the existing Loader into the 5–8 s opening (20°35′N 78°57′E → line → India), never a second intro | `cinema/Loader.tsx`, `index.css` |
| **7 — Bustard** | The signature transition inside the first SpeciesScene: Rajasthan → schematic transmission line → grassland → photograph → CR | `cinema/SpeciesScene.tsx`, `cinema/SpeciesMap.tsx`, line system |
| **8 — Final polish** | Typography, spacing, motion, mobile, performance, accessibility, browser and consistency audits | everything touched above |

Documentation added along the way: `PREMIUM_DESIGN_SYSTEM.md` (Gate 1), `PREMIUM_MOTION_SYSTEM.md` (Gate 2), `PERFORMANCE.md` (Gate 1), `PRODUCTION_STATUS.md` (updated every gate).

### Gate 1 plan in detail

1. **Tokens first, identity unchanged.**
   - Define in `@theme` an 8-step type scale (display, h1, h2, lede, body, small, label, micro; minimum 11px), three tracking values (display, body, label), z-index layers and a spacing rhythm.
   - Replace arbitrary values file by file, checking screenshots before and after so the Atlas still looks like itself.
2. **Fix the defects in §4.** Caption overlap, the phone header backing, the phone phase tabs, the GeoProgress breakpoint, the Lenis/scroll-behavior conflict, stale comments and missing credits.
3. **Editorial voice on the working pages.**
   - Light-serif headings and hairline dividers instead of rounded card boxes on `/atlas`, `/species` and `/conservation`.
   - No feature, layout or data change.
4. **Cursor vocabulary.**
   - Unify the existing `data-cursor` labels: Trace (map), Discover (species), View (image), Enter (CTA), Follow (line).
   - Give it a quieter "precision instrument" style.
   - Still off on touch and under reduced motion.
5. **Accessibility.**
   - Focus trap and focus return on the profile dialog.
   - Arrow-key tabs with roving tabindex on ModeSwitch and on the Gallery/Grid tabs.
   - Landmarks on `/documentary`.
   - Route every reduced-motion and pointer check through `motion/preferences.ts`.
6. **Performance.**
   - Show the flat India on narrow viewports, so phones do not fetch three.js unless measurement says otherwise.
   - Gallery photos: lazy-load them, give them intrinsic sizes, and add WebP derivatives with a JPG fallback.
   - Preload the critical font.
   - RAF-throttle the HeroStage listener and pause CurvedLoop off-screen.
   - Fetch the geojson once on `/atlas`.
   - Re-measure against §5 and record the result in `PERFORMANCE.md`.
7. **Loader copy.** Keep the five real steps and tighten the language (calibrating, geographic data, species records, relief, map ready). Make step 05 a real "first frame" signal rather than a timer.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Polish drifts into a redesign, and the site stops feeling like the same Atlas | Before/after screenshots at every gate; quality-bar question 1 is checked first; anything that reads as a different site is rolled back |
| The data pages become theatrical (they are meant to stay data-first) | Gate 1 and Gate 5 change the voice and chrome, not the behaviour; no scroll theatre on working pages |
| Requested facts or layers have no source (km² ranges, altitude, rivers, protected areas) | §6 lists them; they are not shown until a sourced dataset is approved |
| Bundle growth from new routes and the line system | Route-level lazy loading, no new dependencies without a reason, sizes compared against §5 at every gate |
| Mobile regressions in pinned scenes | A 390×844 pass at every gate; phones stay on the stacked layout |
| The 2D lines and the 3D relief use slightly different projections | Reconciled in Gate 4 before any line is drawn over the relief |
| Reduced-motion parity slips as motion is added | Every gate is screenshotted with `reducedMotion: 'reduce'` |
| Uncommitted reel work in the main checkout | All premium work stays in the separate worktree on `atlas/premium` |
| Headless lab numbers mislead | Field-style Lighthouse mobile runs are added in Gate 1; numbers are labelled with how they were measured |
