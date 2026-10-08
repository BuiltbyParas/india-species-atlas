# Production status: premium upgrade

Branch: `atlas/premium` (worktree `../india-species-atlas-premium`), branched from `487c5fb`. The reel work on `reel-60` in the main checkout is untouched by every gate.

| Gate | Status | Checkpoint |
|---|---|---|
| 0 — Repository audit | **Done** (8 Oct 2026) | tag `atlas/premium-gate-0-audit` |
| 1 — Foundation polish | **Done** (8 Oct 2026) | tag `atlas/premium-gate-1-foundation` |
| 2 — Geographic line system | **Done** (8 Oct 2026) | tag `atlas/premium-gate-2-line-system` |
| 3 — Species world | **Done** (8 Oct 2026) | tag `atlas/premium-gate-3-species-world` |
| 4 — Spatial atlas | **Done** (8 Oct 2026) | tag `atlas/premium-gate-4-spatial-atlas` |
| 5 — Atlas explorer | **Done** (8 Oct 2026); rivers, forests and protected-area polygons deliberately not drawn (no sourced dataset) | tag `atlas/premium-gate-5-explorer` |
| 6 — Cinematic intro | **Done** (8 Oct 2026) | tag `atlas/premium-gate-6-intro` |
| 7 — Bustard transition | **Done** (8 Oct 2026) | tag `atlas/premium-gate-7-bustard` |
| 8 — Final polish | In progress | |

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

## Gate 5 — Atlas explorer (`/atlas`)

### What changed
- **Survey markers** replace the bright teardrop pins:
  - each is a 20 px disc centred exactly on the locality, in the layer's colour;
  - it has a dark collar and a canvas hairline;
  - its code stays inside as text (CR/EN/VU, the threat abbreviation, ✦), so colour is never the only signal;
  - it scales on hover and focus.
  The legend already used discs; markers and legend now match.
- **A thread layer.** This is the documentary's line on the working map. It is on by default and can be switched off with the **Threads** toggle.
  - Each species' localities are joined in its status colour, using the same `threadRuns` geometry, so they break at 5° exactly as on the home page.
  - The legend states that a thread is a reading device, not a range or a corridor.
- **Survey instruments:**
  - a metric scale bar;
  - on a mouse, a live coordinate readout under the pointer, written straight to the DOM rather than through React.
- **Editorial voice:**
  - the page header has an eyebrow and a light serif title;
  - the toggles are hairline;
  - the active segment is buff;
  - legends and the state panel are sheets;
  - the state tooltip is a 2 px label rather than a pill;
  - "Reset to India view" is restyled.
- **Phone:** the explanatory paragraph is hidden and the shading toggle reads "Shade by count", so both toggles share a row and the map starts about 75 px higher.

### Data limits (not fabricated)
- The legend now says it plainly:
  - **Not drawn:** protected-area boundaries, forest cover and transmission lines.
  - **Why:** the atlas holds no openly licensed, sourced dataset for them yet.
  - **Instead:** programme sites are marked at species' anchor localities.
- The basemap already shows relief and rivers, so the atlas does not claim to draw those itself.
- Candidate datasets are listed in the upgrade plan (§6). Adding them is the owner's call: WDPA's licence restricts redistribution.

### Verification
- Screenshots on desktop (Species and Threats modes, legends) and phone. No page errors.
- The arrow-key tablist test and the profile dialog test still pass.

## Gate 6 — Cinematic intro

The existing loader was evolved into the opening rather than given a second intro. It is still shown once per session, still skipped entirely under reduced motion, and its checklist is still honest.

### The sequence (≈ 5.2 s minimum)
| t | What happens |
|---|---|
| 0.2 s | A survey mark at the middle of the sheet, with its coordinates (21°51′N 82°45′E). It is labelled "middle of the sheet", because it is the projection's centre and makes no claim about India. |
| 0.4 s | The survey line is ruled through it, edge to edge. |
| 0.9 s | The country's extent is written at the line's ends, read from the boundary file. |
| 1.0 s | The state boundaries draw in until they resolve into India. |
| 3.0 s | The **route line** is drawn by its nib through the five featured species' anchor localities, west to east. Each stop rings as the nib reaches it. It previews the journey the page takes. |
| ≥ 5.2 s | Once the hero's first frame is in, the sheet lifts off a hero that is already in place. |

- A click or a key press skips whatever minimum time remains. The real loading steps still have to finish.
- `src/content/featured.ts` now holds the five featured species, shared by the home page and the opening.

### A line-system fix found here (it affected Gate 2's lines too)
- **The bug.** A line was drawn by animating its dash along a `pathLength` of 1. When the stroke is also `vector-effect: non-scaling-stroke`, browsers measure dashes in screen pixels, so whenever a map was not shown at 1:1 the line drew at the wrong rate. This had been true of the site's draw-on lines since before the upgrade. In the route-progress map, at about 0.11 scale, each leg was "drawn" about nine times too fast; the finale and the loader boundaries were off too. It showed in the intro as a dashed survey rule, and as a route that finished well before its nib.
- **The fix.**
  - Every `GeoLine` keeps a non-scaling, undashed visible stroke, and is revealed through a mask whose stroke is in map units, where the unit-length dash is exact. A draw of 0.5 is now exactly half the line, and the nib sits at its end.
  - Lines that never draw on are marked `still` and carry no mask: the conservation threads and the route guide.
  - Their dash patterns are now explicit screen-pixel patterns. Fragmentation goes from 10/0 px to 4/5 px.
- **Old animations converted.** The loader's state boundaries and the menu's map were the last non-`GeoLine` draw-on animations; both now use the primitive.
- **Overrides restored.** Line roles now sit at zero specificity (`:where(...)`), so a component's own class can tune a line's weight, colour or alpha. Before, the role rules silently beat several of those overrides.

### Verification
- Frame-by-frame captures at 0.6–7.2 s on desktop and phone, on real GPU WebGL. No page errors.
- All Gate 2 line moments re-captured: scene thread, conservation, finale, route progress.
- The keyboard test passes.

## Gate 7 — The bustard's way in (signature transition)

`components/cinema/BustardPrologue.tsx` is a 320vh pinned prologue before the Great Indian Bustard's scene, which is the first species after the hero's descent ends over Desert National Park.

| Beat | Scroll | What happens |
|---|---|---|
| 1 | 0–0.25 | Rajasthan and Gujarat (the states of record) draw in. The anchor locality is ringed with its coordinates. Copy: "Where the line starts", with the habitat note. |
| 2 | 0.26–0.58 | A transmission line is drawn across the Thar by its nib, pylon by pylon, labelled on the line "Schematic — not a mapped alignment". Copy: the record's own sentence, *"Collision with high-tension power lines crossing the Thar is now the single largest cause of mortality."* |
| 3 | 0.6–0.8 | The line opens like a shutter into the photograph of the birds on the grassland. The shutter opens from the line's measured position, and the photograph sits exactly where the scene's own photograph does, so the hand-off is seamless. |
| 4 | 0.82–1 | **Critically Endangered**, in its status colour, with the first action the record lists against the threat: *burying or re-routing power lines and installing bird diverters in priority bustard areas*. |

### Data honesty
- **The line is schematic.**
  - It is straight, with evenly spaced pylons, labelled as schematic on the drawing, and explained in the copy: the dataset records the threat for the species, not the route of any line.
  - It starts just inside Rajasthan's western border, so it never draws a line across the international boundary.
- **Everything else is the record's:** the states, the anchor and its coordinates, the threat sentence, the status, the action, and the credited photograph.
- **Only shown for a species whose record lists power-line collisions.**

### Phone and reduced motion
- Both get a still, composed version: the heading, the map with the line, the threat sentence and the schematic note, with nothing pinned.
- On a phone with motion allowed, the still draws itself once as it comes into view: the states, then the line.

### Also fixed
- `GeoLine`'s reveal mask had the default `userSpaceOnUse` region, which is measured from the origin rather than the viewBox. On a cropped map (this one) it clipped the southern states. The region is now explicit.
- Labels on a `GeoLine` accept a `dy`.

### Verification
- Desktop beats captured at seven scroll points on real GPU.
- Phone (drawing over time) and reduced motion captured.
- Full regression screenshot pass and keyboard test re-run: no errors.
