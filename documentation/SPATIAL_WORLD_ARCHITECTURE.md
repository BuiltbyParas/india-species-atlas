# Spatial world architecture

Branch `atlas/spatial-world` (cut from `atlas/interaction`, checkpoint `b73f973`). Not merged, not pushed.

The aim of this phase: the Atlas should read as one geographic world the reader travels through, not a set of pages. The approach does **not** build one permanent 3D scene. Instead it rests on three facts the site already had, and adds a thin layer on top:

1. **One projection.** Every drawn map uses `geo/india.ts` (equirectangular, longitude corrected at 22°N), and the 3D relief uses the same constant.
2. **One camera.** `world/geoCamera.ts` describes what any view is looking at in the sheet's own units.
3. **One record of where we are.** `world/worldState.ts` holds the last camera, species and chosen place between pages.

A page change between two views of the geography becomes a camera move on that shared sheet.

## Modules (`src/world/`)

| File | Role |
|---|---|
| `geoCamera.ts` | `GeoCam {x, y, w}` in map units. `camAt`, `fitCam`, `toScreen`, and `camPath`, the van Wijk–Nuij smooth zoom/pan (the same maths as d3's `interpolateZoom`). |
| `worldState.ts` | A small external store (`useSyncExternalStore`): `camera`, `species`, `origin`, `arrival`, `atlasView` and `visited`. The camera, species, atlas view and visited list persist in `sessionStorage`. |
| `sceneRegistry.ts` | Lifecycle for the three WebGL scenes (hero, gallery, conservation): mount, pause and resume, with registration ending at unmount. |
| `journeys.ts` | `planJourney(from, to, origin)` decides whether a route change is a journey, and builds its plan from the dataset and the world state. |
| `WorldJourney.tsx` + `world.css` | The overlay that plays a journey. |

`interaction/RouteTransition.tsx` remains the single place that intercepts link clicks. It asks `planJourney` first; if no plan comes back, or reduced motion is on, the existing page turn runs.

## World state

| Field | Written by | Read by |
|---|---|---|
| `camera` | The atlas map on `moveend` (Leaflet bounds projected to the sheet), the hero when its descent passes 0.8 (the first anchor), and the species page on entry (its anchor) | The start of the next journey |
| `atlasView` | The atlas map (centre and zoom) | The atlas on mount: a return lands where the reader left it. Also the end frame of the ascend journey |
| `species`, `visited` | The species page | The atlas marks visited species with a survey ring |
| `origin` | `data-geo="lng,lat"` and `data-geo-kind` on the clicked link | The ring at the start of a journey |
| `arrival` | The journey, just before it navigates | The species page: its photograph is shown already open, because the journey opened it |

## The camera as navigation

| Journey | When | Camera | What it communicates |
|---|---|---|---|
| **Descend** | anything → `/species/:id` | From the current view down to the species' anchor at region scale (`REGION_W`, about 7° of longitude) | Where the species is, at what scale. From the atlas, the view grows out of the map's own panel. |
| **Travel** | species → species | The same, with the route leg between the two anchors drawn as the camera follows it | The distance between the two places. The camera rises for far pairs and glides for near ones, and the duration follows the distance (clamped to 0.7–1.7 s). |
| **Ascend** | anything → `/atlas` | The photograph closes into a line, the line gathers to the anchor, and the camera rises to the map's framing and lands inside the map's panel | Returning from the ground to the instrument |

Other routes (About, Sources, the directory and so on) keep the page turn: there is no place to move to.

## Transformation grammar (as built)

| Transformation | Where |
|---|---|
| MARKER → COORDINATE | Atlas marker preview (name, status, coordinates); the journey's ring and live readout |
| COORDINATE → CAMERA | The journey's flight; live centre coordinates and a 1–2–5 scale bar |
| MAP → TERRAIN | The states of record lifted in N layers. This is a uniform lift, labelled on screen "not elevation" |
| TERRAIN → LINE → PHOTOGRAPH | A rule through the anchor opens as a shutter onto the photograph |
| PHOTOGRAPH → SPECIES | A FLIP of the photograph into `.sw-photo img` on the new page |
| PHOTOGRAPH → LINE → POINT → MAP | The ascend journey |
| SPECIES → DATA | The Red List category as a distance along the IUCN scale (`StatusScale`) |
| MAP → ROWS (geography → data) | The species page's locality register: each locality lifts off its map point and lands on its row; afterwards row and point light each other |
| DATA → MAP → NETWORK, and back | `/conservation`'s `DataGeography`: 12 points in a status-sorted row → anchors → markers → the programme that names the most species. Scrolling back reverses it. |
| FILTER → MAP | Atlas markers fade and shrink rather than being removed, threads fade, and the map eases to the remaining localities |
| CARD → PORTAL | Directory cards and the gallery show a locator (states, thread, anchor coordinates) and enter the species world by the journey |
| SPECIES ↔ SPECIES (compare) | `/compare` overlays each species' states of record, thread and anchor on one sheet, names the shared states, and shows counts on one scale |

## Rendering and performance model

- **No new permanent canvas.** The journey canvas exists only while a journey plays. The 3D scenes stay lazy and per page, and are paused during a journey (`sceneRegistry`).
- **The moving sheet is a 2D canvas.** The country and the states of record are `Path2D`s in map units, so a frame costs one `setTransform` and a few strokes. The first version used an SVG whose viewBox changed every frame; that re-rasterised the whole SVG and measured 30–50 ms a frame at full screen. Do not go back to it.
- **Lifted layers are drawn once**, into canvases cut to the states of record's extent. After that only their CSS 3D transforms change, which is compositor work alone.
- **Static parts are on their own layers** (`will-change: opacity`): the sheet, caption and instruments. The view has `pointer-events: none`, so hit-testing never descends into the map.
- **Densities and counts:** canvas density is capped at 2×; 6 lifted layers on desktop, 4 under 700 px.
- **Measured** (1440×900, real GPU, Playwright frame timing): every journey runs at p50/p95 16.7/16.8 ms. On a 390 px viewport with the CPU slowed 4×, p50 is 16.7 ms and p95 33 ms. The remaining long frames come from the new page mounting under cover.
- **Hero atmosphere:** 420 dust points at the end of the descent move with scroll progress, not with time, so the hero still renders only on demand.

## Responsive and fallback behaviour

| Condition | Behaviour |
|---|---|
| Reduced motion | No journeys. The page turn fades. `StatusScale`, the register flight, `DataGeography` (shown as the finished map with all captions), the card locators, the compare bars and the About rules all land in their final state. |
| Phones | Journeys run with fewer layers and a shallower tilt. The photograph transit uses 84% of the width. `DataGeography` is static. The source register stacks into entries. |
| No boundary file | The journey navigates directly. |
| Photograph slow to decode | The shutter waits at most 500 ms. If the target photograph is not found, the overlay fades instead of doing the FLIP. |
| Interrupting | A click or key press during a journey runs it at 4× speed. A click on a link during a journey is ignored. |
| Back / forward, modified clicks, new tabs | Browser default, with no journey (unchanged from the interaction engine). |

## Scientific integrity

- Every place, line and count is from the dataset.
- The lift is a uniform drawing device and is labelled "not elevation".
- Programme joins are labelled "not corridors". Threads still break at 5°.
- Sources show no publication years, because the dataset records none. "Kind" is the atlas' own grouping of the publisher, and the page says so.
- Leaflet is Web Mercator and the sheet is equirectangular, so the hand-off between the atlas map and the journey is approximate at country scale. It is masked by a short cross-fade; nothing is re-projected to fake a match.

## Not built, and why

- **Text along rivers or contours (THAR, HIMALAYA, GANGES).** The atlas holds no sourced river or contour geometry, and drawing them would fabricate geography. `LineTitle`, from the interaction engine, keeps the contour → rule device for titles, labelled as typographic.
- **Real terrain at the destination.** There is no elevation data. The lift says so on screen.
- **Hero 2.0 as a new opening.** The existing chain already holds the brief's beats in order and was left intact, per the "enhance, do not reinvent" rule:
  - loader (coordinate → survey mark → line → India drawn) →
  - 3D descent (terrain, camera, Desert NP, survey rings, now with dust) →
  - bustard prologue (schematic threat line → shutter → photograph → status) →
  - documentary.

  What it gained here is the dust, and the world camera at its end.
- **A single persistent WebGL scene.** Rejected on cost: see the performance model above.
