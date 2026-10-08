# Final creative system

What the India Species Atlas is made of, in one place. The detail lives in the system documents this page points to:

- [`PREMIUM_DESIGN_SYSTEM.md`](PREMIUM_DESIGN_SYSTEM.md)
- [`PREMIUM_MOTION_SYSTEM.md`](PREMIUM_MOTION_SYSTEM.md)
- [`INTERACTION_ENGINE.md`](INTERACTION_ENGINE.md)
- [`SPATIAL_WORLD_ARCHITECTURE.md`](SPATIAL_WORLD_ARCHITECTURE.md)
- [`PERFORMANCE.md`](PERFORMANCE.md)

The audit behind the last pass is [`FINAL_CREATIVE_DIRECTOR_AUDIT.md`](FINAL_CREATIVE_DIRECTOR_AUDIT.md).

**The single idea:** a toposheet printed at night and drawn by one pen. Every effect answers to it, or it is not on the site.

---

## 1. Visual language

- **Palette.** A dark forest sheet (`forest-950` → `forest-200`) with buff ink (`canvas`, `parchment`). Contour brown and river blue are the only accents. IUCN status colours are kept for status and nothing else.
- **Type.**
  - **Newsreader** carries narrative and emotion: titles, species names, the documentary, the colophon statement and signature.
  - **Geist** carries data and interface: labels, coordinates, tables, controls.
  - Small caps (`.caps`) are the one label style.
  - The ten-step scale is in `index.css`.
  - Body copy never animates.
- **Surfaces.** Hairline sheets and ruled lines, not cards. The radius is 2 px, and there are no shadows for depth.
- **Photographs are evidence.**
  - They are credited everywhere.
  - Crop marks, the shutter and the light crossing the print are effects that stay around a photograph, never on it.
  - A missing photograph becomes a field card saying "Photograph unavailable". A slow one shows a graticule while it develops.

## 2. Spatial language

- **One projection:** equirectangular, corrected at 22°N (`geo/india.ts`). It is shared by every drawn map and by the 3D relief.
- **One camera:** `world/geoCamera.ts`, in sheet units. The van Wijk–Nuij zoom is used for every journey.
- **One record of place:** `world/worldState.ts` holds the camera, species, origin and arrival, the atlas view and the species visited.
- **Journeys, not page loads:**
  - **descend** into a species;
  - **travel** between species, with the route leg drawn;
  - **ascend** back to the atlas;
  - every other route change is the survey-sheet page turn.

## 3. Interaction language

- **The engine** is `src/interaction/`:
  - one frame loop that sleeps;
  - one spring model, pointer store and scroll-velocity store;
  - delegated state;
  - magnetism, depth and parallax;
  - the cursor and the ink trail.
- **How components use it.** They opt in with attributes (`data-magnetic`, `data-depth`, `data-cursor`, `data-cursor-area`, `data-trail`); they carry no physics of their own.
- **The cursor** is a survey reticle with a small vocabulary: Discover, Enter, Trace, Locate, Turn, Define, Drag, and Compare on `/compare`. It is mouse only.
- **Controls.** Every button has rest → approach (magnetic) → hover (line reaction) → press (compression) → release. `buttonClasses`, `.cta` (with a contour line that redraws) and `.text-link` are the only button styles.
- **Navigation:**
  - the header shows the documentary's chapter, or a working page's route caption;
  - the folding-sheet menu sets section names that are read from the data;
  - the current section carries a survey ring;
  - focus is trapped while the menu is open and returned to the opener on close.

## 4. Motion language

- **Easing.** Three curves shared by CSS and GSAP: `atlas.out`, `atlas.cinema`, `atlas.emphasis`. There are four duration tokens.
- **The line is the motion primitive.** `GeoLine` takes five roles (survey, thread, route, protect, schematic). The registered property `--draw` drives it, and a nib draws it.
- **Rhythm per section:** entry → build → reveal → hold → exit. Each section gets one orchestrated moment; everything else stays still.
- **Signature transformations:**
  - LINE → MAP
  - MAP → TERRAIN (lift, labelled "not elevation")
  - TERRAIN → LINE → PHOTOGRAPH (shutter)
  - PHOTOGRAPH → SPECIES (FLIP)
  - MAP → ROWS (locality register)
  - DATA → MAP → NETWORK (`/conservation`)
  - SPECIES ↔ SPECIES (`/compare`)
  - the finale's convergence, ending in the colophon's survey line

## 5. WebGL architecture

- **Three lazy scenes:**
  - the hero relief (`home/heroScene.ts`);
  - the species gallery (`species/galleryScene.ts`);
  - the conservation view (`map/conservationScene.ts`).
- **How every scene behaves:**
  - it renders on demand;
  - it pauses off screen and in background tabs;
  - its quality is adaptive;
  - it falls back to the flat layout when it is too slow or the context is lost;
  - it disposes everything.
- **`world/sceneRegistry.ts`** pauses the scenes during journeys.
- **No permanent WebGL canvas.** The journey sheet is a 2D canvas that exists only while a journey plays.

## 6. Performance model

- **No idle loops.** After the final pass, a working page at rest runs **zero** animation frames. ScrollTrigger, whose empty Firefox-workaround loop used to run everywhere, is enabled only while the documentary is mounted (`holdScrollTrigger` in `motion/gsap.ts`).
- **Never write per-frame custom properties on `:root`** or on large SVG subtrees.
- **Never animate a full-screen SVG viewBox.** Use canvas with `Path2D`, and move pre-drawn layers in 3D.
- **Hit-test and sample lines on a timer, not on every scroll frame.**
- **Measured (real GPU, production build, same harness before and after the final pass):**

| | Before (`393f5ef`) | After |
|---|---|---|
| Home scroll, 1440 × 900 | p50 / p95 16.7 / 16.8 ms, 39–40 frames over 33 ms | 16.7 / 16.8 ms, 38 over 33 ms |
| Home scroll, 390 × 844 | 16.7 / 16.7 ms, 6 over 33 ms | 16.7 / 16.8 ms, 4 over 33 ms |
| Idle rAF callbacks, working pages | ~60 per second | 0 |
| Entry JS (gzip) | 170.0 kB | 170.3 kB |
| CSS (gzip) | 35.0 kB | 36.3 kB |

## 7. Responsive strategy

- **Desktop** (≥ 1180 × 680, the "wide cinematic" query) gets the pinned compositions.
- **Tablet** gets stacked compositions with the desktop's type. The species map becomes a band, capped at 78% of the viewport height.
- **Phones** get their own compositions rather than desktop compressed:
  - the menu has width-capped labels with their figures stacked under them;
  - the documentary uses a still prologue and a three-column phase key;
  - the colophon's survey line keeps its end coordinates but drops its caption.
- **Touch:**
  - there is no cursor, magnetism or tilt;
  - press feedback comes from the interaction state;
  - nothing essential needs hover: the compare marks are 44 px tap targets with every species also named in the select above, and atlas markers open their profile on tap;
  - the directory gallery turns by drag and also by arrow buttons.

## 8. Accessibility strategy

- **Structure:**
  - one `h1` per page;
  - numbered `h2` chapters;
  - landmarks and a skip link;
  - captioned tables with row headers.
- **Never colour alone.** Status always has its code or name beside the colour.
- **Dialogs:** the menu and the profile panel trap focus, close on Escape and restore focus.
- **Route changes** move focus to `main` and announce the page.
- **Reduced motion** is a composition, not `animation: none`:
  - lines are drawn already;
  - the prologue is still;
  - there are no journeys, and the page turn fades;
  - the colophon line, the compare sheet and the register are in their final state.

## 9. Scientific data rules

- All species information lives in `src/data/`. Every count on screen is computed at runtime.
- **Drawn maps claim no more than the data holds:**
  - states of record, not ranges;
  - indicative localities, not boundaries;
  - threads are a reading device that breaks at 5°;
  - programme joins are "not corridors";
  - the lift is "not elevation";
  - schematic lines are always labelled.
- **No fabricated geography:** no rivers, contours, forests or protected-area polygons are drawn, because none are sourced.
- **No undisclosed stand-ins.** A generic or stylised asset is never presented as a specific species: silhouettes are labelled as schematic, and a missing photograph says so.

## 10. Signature interactions (the identity)

1. Survey cursor
2. Geographic thread
3. GeoLine and its nib
4. Contour line titles
5. India relief and the camera descent to the first anchor
6. Map → terrain lift
7. Line → photograph shutter
8. Photograph → species FLIP, and the ascend back to the map
9. Locality register (map → rows)
10. Coordinate readouts and scale bars
11. Loader as survey calibration
12. Folding-sheet menu with data strips
13. Survey-sheet page turn
14. Final convergence
15. **Colophon**: a survey line of anchor longitudes, then the signature

## 11. Future opportunities

- **Split the documentary's GSAP and Lenis out of the entry chunk.** This would lighten first load on the working pages, at the cost of a structural change to `HomePage` being eager.
- **`/conservation`'s programme list as a dated timeline sheet**, sharing the record slider's axis.
- **Sourced geography, if datasets are adopted:**
  - rivers, so that river-following type (THAR, GANGES) becomes honest;
  - protected-area polygons for the atlas;
  - elevation, so that the lift can become terrain.
- **Sound.** `interaction/events.ts` already emits sound-ready events; a restrained field-recording layer could attach to them.
- **A print stylesheet**, so that a species page prints as a field card.
