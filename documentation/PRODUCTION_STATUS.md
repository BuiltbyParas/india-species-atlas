# Production status: premium upgrade

Branch: `atlas/premium` (worktree `../india-species-atlas-premium`), branched from `487c5fb`. The reel work on `reel-60` in the main checkout is untouched by every gate.

| Gate | Status | Checkpoint |
|---|---|---|
| 0 — Repository audit | **Done** (8 Oct 2026) | tag `atlas/premium-gate-0-audit` |
| 1 — Foundation polish | **Done** (8 Oct 2026) | tag `atlas/premium-gate-1-foundation` |
| 2 — Geographic line system | **Done** (8 Oct 2026) | tag `atlas/premium-gate-2-line-system` |
| 3 — Species world | **Done** (8 Oct 2026) | tag `atlas/premium-gate-3-species-world` |
| 4 — Spatial atlas | **Done** (8 Oct 2026) | tag `atlas/premium-gate-4-spatial-atlas` |
| 5 — Atlas explorer | In progress | |
| 6 — Cinematic intro | Not started | |
| 7 — Bustard transition | Not started | |
| 8 — Final polish | Not started | |

## Gate 0
- Audit and baseline: [`PREMIUM_UPGRADE_PLAN.md`](PREMIUM_UPGRADE_PLAN.md).
- No source files changed.

## Gate 1 — Foundation polish

**Aim:** the same Atlas, set by a more careful hand. Gate 1 adds no new systems (no line system, species world, intro or bustard transition). It makes the foundations those systems will stand on.

### What changed
- **Tokens** (`src/index.css`): a ten-step type scale with built-in leading and tracking, three trackings, named z-layers, and gutter and rhythm variables. 46 distinct arbitrary font sizes in components are down to the documented scale. The exceptions are the fixed-size documentary stage and the map-pin glyphs. See [`PREMIUM_DESIGN_SYSTEM.md`](PREMIUM_DESIGN_SYSTEM.md).
- **Working pages in the documentary's voice:**
  - light Newsreader headings;
  - a contour-rule eyebrow;
  - hairline "sheets" instead of rounded card boxes;
  - a buff primary button;
  - 2 px radii;
  - one small-caps label style.
  No layout, feature or data change.
- **Defects fixed:**
  - The species-scene map captions overlapped. There is now one caption at a time, driven by the scene's phase, on a legible backing.
  - Text showed through the wordmark when scrolled on phone and tablet. The header scrim is now solid behind the bar.
  - The phone phase tabs wrapped into ragged rows. They are now a three-column key.
  - GeoProgress showed between 1024 and 1179 px over the stacked layout, and overlapped the footer links. It now appears only beside the pinned layout and steps aside for the footer.
  - The loader overlapped its title on phones. It is recomposed: the checklist moves to the top corner and the map fits the width.
  - The loader's step 05 was a timer. It is now the hero's real first painted frame, with a 6 s ceiling.
  - The stacked species map grew taller than the screen on landscape tablets. It is capped at 78% of the viewport height.
  - "Chapter 04" was hard-coded. It now comes from the chapter definition.
  - Scroll smoothing conflicted with Lenis. Fixed, and the Lenis CSS is now imported.
  - The `SpeciesImage` comment wrongly said no photographs were bundled. Corrected.
- **Credits:** photographs on the directory cards and in the compare table now carry their credit, as every other view already did.
- **Cursor:** redrawn as a survey reticle, with a seven-word vocabulary: Discover, Enter, Trace, Locate, Turn, Define, Drag.
- **Accessibility:**
  - the species profile dialog now moves focus in, traps Tab and Shift+Tab, closes on Escape, returns focus to its opener, and holds the page (Lenis included);
  - map-mode and directory-view tabs follow the WAI-ARIA tabs pattern (roving tabindex; arrows, Home and End; `aria-controls` to a labelled tab panel);
  - `/documentary` has a `main` landmark, a description, player controls in a `nav`, a skip link, and controls that stay visible while focused;
  - reduced-motion and pointer checks go through `motion/preferences.ts`.
- **Performance:**
  - CLS on the working pages went from 0.10–0.22 to 0.00–0.01;
  - 720 px WebP photographs are served to small slots (−75% for those files);
  - photographs have intrinsic sizes;
  - the boundary file is fetched once instead of twice;
  - the hero scroll handler and per-frame React updates are throttled.
  Numbers are in [`PERFORMANCE.md`](PERFORMANCE.md).

### Preserved
- The 3D relief, documentary scroll choreography, all five species scenes and their three-layer maps, the dome, the curved loops, the conservation chapter, the finale, the loader concept, the dark toposheet palette, Newsreader and Geist, and the real credited photographs.
- The data, the drawings' honesty rules, and every route and feature.
- Measured layouts: hero, chapter, scene and dome screenshots at 1440 and 1920 match the baseline apart from the intended fixes.

### Looks worse, or is still open
- Nothing found that reads worse than before.
- The working-page body copy inside sheets is still 14 px Geist. Lighter headings make it look slightly small next to them; it is to be reviewed in Gate 8 with the type audit.
- At 1920 px the hero relief is small in a large dark frame. This is pre-existing and belongs to Gate 4 (camera framing).
- The `/species` 3D gallery still loads all twelve JPG masters, because its card textures need them. It is the heaviest view.

### Verification
- `tsc -b` clean; `vite build` clean; oxlint shows only pre-existing warnings.
- Screenshots before and after (scratch harness), covering:
  - widths of 1440, 1920, 1024 and 390;
  - reduced motion, on desktop and phone;
  - the loader on desktop and phone;
  - every working page and the profile dialog.
- Keyboard test: the dialog trap holds after 60 Tab presses; Escape returns focus to the card that opened it; arrow, Home and End work on both tablists; `/documentary` has `main` and `nav`. No console errors on any route.

## Gate 2 — Geographic line system

### What changed
- **One line primitive, `GeoLine`.** Five roles (survey, thread, route, protect, schematic), one stroke vocabulary, round caps, and non-scaling weights. Every line joining places on the site is now drawn by it. See [`PREMIUM_MOTION_SYSTEM.md`](PREMIUM_MOTION_SYSTEM.md).
- **One driver.** `--draw` is a registered CSS property, so the same line can be scrubbed by scroll, transitioned, keyframed or set by the documentary clock.
- **The nib.** Lines in progress are drawn by a visible pen mark that disappears once the line is complete: the species thread, the route-progress legs and the finale's twelve converging lines.
- **Geometry moved to `src/geo/line/paths.ts`.** `chain`, `threadRuns`, `threadPath` and `bowedLeg` live there; three duplicated copies of the bow maths are gone. Ready for the species world (Gate 3) and the bustard transition (Gate 7, `schematic` role with mask reveal and labels).
- **Route progress:** a survey readout gives the last anchor locality reached and its coordinates. The return leg is river blue. The map steps aside when the finale's own map arrives.
- **Finale:** the convergence point is captioned with its coordinates and stated to be a drawing point rather than a place.
- **Phones:** the species thread now draws, with its nib, when the map comes into view.
- **The curved loops' hairline** stays one pixel on phones; it used to fall to about a quarter of a pixel.
- **Motion tokens:**
  - GSAP and CSS now share three named easing curves through a small solver instead of the CustomEase plugin (saving 3.5 kB);
  - four duration tokens.

### Preserved
- Every line still means what it meant, and is drawn where it was drawn. Threads still break at 5°, and fragmentation is still labelled as a drawing device.
- Scene timings and scroll choreography are unchanged.

### Looks worse, or is still open
- Nothing found that reads worse. The finale caption needed a second pass: a coordinate label inside the map collided with the converging lines, so it moved to a caption below.
- Main JS is +2.1 kB gzip over Gate 1 (the line primitive and helpers).

### Verification
- `tsc -b`, `vite build` clean.
- Full screenshot pass (1440, 1920, 1024, 390, reduced motion on desktop and phone): no console errors and no horizontal overflow.
- Line moments captured mid-draw (nibs), settled, and under reduced motion (fully drawn, no nibs).
- The keyboard test from Gate 1 re-run: passes.

## Gate 3 — Species world

### What changed
- **New route `/species/:id`.** Every one of the 12 species has its own page (`src/pages/SpeciesWorldPage.tsx`, a 3.7 kB gzip lazy chunk).
- **Deep links.** `postbuild` writes a real `index.html` for each species page (ids read from the dataset), so a deep link is served as 200. An unknown id renders the Not Found page.
- **The opening** sets the species beside its photograph:
  - the photograph is shown at its own proportions, contained rather than cropped, so the portrait macaque is whole;
  - a 70 px blurred wash of the same photograph gives each page its own atmosphere;
  - the survey facts: the anchor locality with coordinates, the count of states/UTs, the count of localities, and the assessment year;
  - the photo's alt text as a caption, with the credit.
- **The lede:** the summary set as a headline, then the description and "why it matters".
- **Map and chapters.**
  - **Layout:** a map holds the right of the page while four chapters pass on the left. Each chapter sets the map's layer (range → threats → protection) as it crosses the middle of the screen, at the reader's pace and with nothing pinned. The map waits until it is on screen, then draws its thread with the nib.
  - **01 Where it lives:** the habitat note, distribution, habitats and regions, and a **locality register**, a table of every indicative locality with its coordinates, starting from the anchor.
  - **02 What cuts through it:** the scene's threat rows; hovering one highlights its hatch on the map.
  - **03 What protects it:** actions; programmes by start year, with their authority; protected areas named in the record.
  - **04 The record:** the IUCN category and its definition, the dated status history, sources, and the last-verified date.
- **Onwards:** a route line (`GeoLine`, route role, with nib) drawn from this species' anchor to the next species' anchor, with both coordinates, plus previous / all species / the map.
- **On phones** the map becomes a band held under the header while the chapters scroll up beneath it, fading at its lower edge.
- **Entry points:**
  - each documentary scene now offers "The ⟨species⟩'s page" alongside a "Quick profile" button, which opens the existing panel;
  - the profile panel has a "Full page" link;
  - the `?species=` panel still works everywhere.

### Data honesty
- **Every value comes from the dataset:**
  - the 12 species records, with their photographs and credits;
  - the localities and coordinates;
  - the programmes, with their start years and authorities;
  - the status history;
  - the sources.
- **Nothing is added:** no range area, no population number beyond the cited prose, and no altitude.
- The locality register says that these are indicative localities, not a range boundary.

### Verification
- All 12 pages are screenshotted at 1440. The bustard page was screenshotted chapter by chapter on desktop and phone.
- There are no console errors and no horizontal overflow.
- Unknown ids give "Page not found".
- The accessibility tree has one `h1`, numbered `h2` chapters, a captioned table with row headers, and labelled `nav`s.
- The keyboard test from Gate 1 still passes.

## Gate 4 — Spatial atlas

### What changed
- **The 3D descent now has a destination.**
  - **Before:** the camera fell from orbit to a generic low pass over the peninsula.
  - **Now:** it narrows from the whole country to the north-west, then turns and comes down over the first species' anchor locality: Desert National Park, 26°50′N 70°43′E, where the bustard's scene and the route line both begin.
  - The descent runs India → region → the ground, so the 3D sets up the documentary instead of decorating its opening.
  - `HeroSceneOptions.endFocus` is generic; the home page passes the first featured species.
- **A survey mark on the relief.** Two hairline rings open on the ground at the anchor as the camera arrives (progress 0.82–0.98).
- **A landing caption.** It gives the place, its coordinates, and "The first line starts here, with the Great Indian Bustard". All of it is from the record.
- **Framing per screen.**
  - Wide screens come 28% closer at the end, since the copy sits beside the relief.
  - Phones keep the copy above and the place below, with the rings full and central.
  - The end pitch is steeper (0.5 rad), so the ground is looked down on rather than out across.
- **One projection.** The flat maps and the 3D relief corrected longitude at 22° and 22.5° respectively; both now use `PROJECTION_LAT` (22°) from `geo/india.ts`. That is a 0.3% horizontal change to the relief, invisible on screen.
- **Hardware WebGL for testing.** Headless Chromium can reach the laptop's AMD GPU (`--use-angle=gl-egl`). SwiftShader is so slow that the hero's own frame-rate guard sends it to the flat fallback, which hid the camera from earlier screenshots and inflated earlier TBT figures.

### Performance (real GPU, lab)
| Page | Profile | LCP before → now | TBT before → now |
|---|---|---|---|
| `/` | desktop | 840 → 616 ms | 388 → 423 ms |
| `/` | phone (4× CPU) | 1624 → 1584 ms | 1996 → 2171 ms |
| `/species` | desktop | 748 → 800 ms | 215 → 211 ms |
| `/atlas` | phone | 2300 → 2380 ms | 645 → 581 ms |

- On a 4×-slowed CPU the phone home page's TBT is dominated by building the relief from the boundary file, both before and after.
- The new shared chunks (`india`, `regions`, `programmes`, `stateCounts`, `react`) are `modulepreload`ed in parallel by the entry. They are a different split of the same bytes, not a waterfall.

### Looks worse, or is still open
- Nothing visibly worse.
- The relief build is CPU-heavy on slow phones (above). Candidates for Gate 8: building it in idle slices, or in a worker.
